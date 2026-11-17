import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validarBody } from "../middleware/validar.js";
import { CheckInDto, ConfiguracionCheckInDto, TokenCheckInDto } from "../dto/check-in.dto.js";
import { aReservacionPublica } from "../dto/reservaciones.dto.js";
import { obtenerConfiguracionCheckIn } from "../services/check-in.js";

export const checkInRouter = Router();
checkInRouter.use(requireAuth);
checkInRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

checkInRouter.get("/configuracion", async (_req, res) => {
  res.json(await obtenerConfiguracionCheckIn());
});

checkInRouter.put("/configuracion", requireAdmin, validarBody(ConfiguracionCheckInDto), async (req, res) => {
  const { minutos_antes, minutos_despues } = req.body;
  await pool.query(
    "UPDATE configuracion_check_in SET minutos_antes = ?, minutos_despues = ? WHERE id = 1",
    [minutos_antes, minutos_despues]
  );
  res.json(await obtenerConfiguracionCheckIn());
});

checkInRouter.use("/:token", (req, res, next) => {
  if (!TokenCheckInDto.safeParse(req.params.token).success) {
    res.status(400).json({ error: "El código QR no es válido" });
    return;
  }
  next();
});

// Opening a QR link never changes a reservation; confirmation requires a POST.
checkInRouter.get("/:token", async (req, res) => {
  const [espacios] = await pool.query<RowDataPacket[]>(
    "SELECT id_espacio, nombre_espacio, ubicacion, estado_espacio FROM espacios WHERE token_check_in = ?",
    [req.params.token]
  );
  const espacio = espacios[0];
  if (!espacio) {
    res.status(404).json({ error: "Este código QR no corresponde a un cubículo" });
    return;
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id_reservacion, id_usuario, id_espacio,
            fecha_hora_inicio AS hora_inicio, fecha_hora_fin AS hora_fin,
            estado_reservacion, creado_en AS creada_en, check_in_en
     FROM reservaciones WHERE id_usuario = ? AND id_espacio = ?
       AND fecha_hora_fin > NOW(3) ORDER BY fecha_hora_inicio`,
    [req.usuario!.id_usuario, espacio.id_espacio]
  );
  res.json({ espacio, configuracion: await obtenerConfiguracionCheckIn(), reservaciones: rows.map(aReservacionPublica) });
});

checkInRouter.post("/:token", validarBody(CheckInDto), async (req, res) => {
  const conn = await pool.getConnection();
  let committed = false;
  try {
    await conn.beginTransaction();
    // Lock settings and cubicle until commit, so concurrent admin changes are ordered.
    const settings = await obtenerConfiguracionCheckIn(conn, true);
    const [espacios] = await conn.query<RowDataPacket[]>(
      "SELECT id_espacio, estado_espacio FROM espacios WHERE token_check_in = ? LOCK IN SHARE MODE",
      [req.params.token]
    );
    const espacio = espacios[0];
    if (!espacio) {
      res.status(404).json({ error: "Este código QR no corresponde a un cubículo" });
      return;
    }
    if (espacio.estado_espacio !== "activo") {
      res.status(409).json({ error: "El cubículo no está disponible para registrar entradas" });
      return;
    }
    const [reservaciones] = await conn.query<RowDataPacket[]>(
      `SELECT id_reservacion, estado_reservacion, check_in_en FROM reservaciones
       WHERE id_reservacion = ? AND id_usuario = ? AND id_espacio = ? FOR UPDATE`,
      [req.body.id_reservacion, req.usuario!.id_usuario, espacio.id_espacio]
    );
    const reservacion = reservaciones[0];
    if (!reservacion) {
      res.status(404).json({ error: "No tienes esa reservación en este cubículo" });
      return;
    }
    if (reservacion.check_in_en || reservacion.estado_reservacion === "activa") {
      res.status(409).json({ error: "La entrada de esta reservación ya fue registrada" });
      return;
    }
    if (reservacion.estado_reservacion !== "creada") {
      res.status(409).json({ error: `No se puede registrar la entrada de una reservación ${reservacion.estado_reservacion}` });
      return;
    }
    // The database clock and inclusive window also apply to simultaneous requests.
    // A reservation can never be checked in at/after its end, even with a wide window.
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE reservaciones SET estado_reservacion = 'activa', check_in_en = NOW(3)
       WHERE id_reservacion = ? AND estado_reservacion = 'creada' AND check_in_en IS NULL
         AND NOW(3) >= TIMESTAMPADD(MINUTE, -?, fecha_hora_inicio)
         AND NOW(3) <= TIMESTAMPADD(MINUTE, ?, fecha_hora_inicio)
         AND NOW(3) < fecha_hora_fin`,
      [reservacion.id_reservacion, settings.minutos_antes, settings.minutos_despues]
    );
    if (!result.affectedRows) {
      res.status(409).json({ error: `Fuera del horario de check-in: desde ${settings.minutos_antes} minutos antes hasta ${settings.minutos_despues} minutos después del inicio, antes de que termine la reservación.` });
      return;
    }
    await conn.query(
      `INSERT INTO historial_accesos (resultado, metodo_utilizado, id_espacio, id_usuario, id_reservacion)
       VALUES ('permitido', 'qr', ?, ?, ?)`,
      [espacio.id_espacio, req.usuario!.id_usuario, reservacion.id_reservacion]
    );
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id_reservacion, id_usuario, id_espacio, fecha_hora_inicio AS hora_inicio,
              fecha_hora_fin AS hora_fin, estado_reservacion, creado_en AS creada_en, check_in_en
       FROM reservaciones WHERE id_reservacion = ?`,
      [reservacion.id_reservacion]
    );
    await conn.commit();
    committed = true;
    res.json(aReservacionPublica(rows[0]));
  } finally {
    // Also releases locks on validation errors or an unexpected failure.
    try {
      if (!committed) await conn.rollback();
    } finally {
      conn.release();
    }
  }
});
