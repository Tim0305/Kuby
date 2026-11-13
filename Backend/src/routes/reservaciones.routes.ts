import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db.js";
import { esAdministrador, requireAuth } from "../middleware/auth.js";
import { validarBody, validarId } from "../middleware/validar.js";
import { CrearReservacionDto, aReservacionPublica, ActualizarReservacionDto } from "../dto/reservaciones.dto.js";
import { actualizarEstadosVencidos, inicioVencido } from "../services/reservaciones.js";

export const reservacionesRouter = Router();
reservacionesRouter.use(requireAuth); // Todo exige sesión

// ---------- Helper: Verificar empalmes ----------
async function hayTraslape(id_espacio: number, inicio: Date, fin: Date, id_excluir = 0) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id_reservacion FROM reservaciones 
     WHERE id_espacio = ? 
       AND estado_reservacion IN ('creada', 'activa')
       AND id_reservacion != ?
       AND fecha_hora_inicio < ? AND fecha_hora_fin > ?`,
    [id_espacio, id_excluir, fin, inicio]
  );
  return rows.length > 0;
}

// ---------- Listar reservaciones ----------
reservacionesRouter.get("/", async (req, res) => {
  const { id_usuario, rol } = req.usuario!;
  
  // El admin ve todas; el usuario solo las suyas
  const where = esAdministrador(rol) ? "" : "WHERE r.id_usuario = ?";
  const params = esAdministrador(rol) ? [] : [id_usuario];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id_reservacion, r.id_usuario, r.id_espacio, 
            r.fecha_hora_inicio AS hora_inicio, r.fecha_hora_fin AS hora_fin, 
            NULL AS proposito, r.estado_reservacion, r.creado_en AS creada_en, 
            e.nombre_espacio 
     FROM reservaciones r
     LEFT JOIN espacios e ON r.id_espacio = e.id_espacio
     ${where}
     ORDER BY r.fecha_hora_inicio DESC`,
    params
  );
  res.json(rows.map(aReservacionPublica));
});

// ---------- Obtener reservación actual/próxima (Para el banner del frontend) ----------
reservacionesRouter.get("/actual", async (req, res) => {
  const { id_usuario } = req.usuario!;
  
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id_reservacion, r.id_usuario, r.id_espacio, 
            r.fecha_hora_inicio AS hora_inicio, r.fecha_hora_fin AS hora_fin, 
            NULL AS proposito, r.estado_reservacion, r.creado_en AS creada_en, 
            e.nombre_espacio 
     FROM reservaciones r
     LEFT JOIN espacios e ON r.id_espacio = e.id_espacio
     WHERE r.id_usuario = ? AND r.estado_reservacion IN ('creada', 'activa')
       AND r.fecha_hora_fin > NOW()
     ORDER BY r.fecha_hora_inicio ASC LIMIT 1`,
    [id_usuario]
  );
  
  if (!rows[0]) {
    res.status(404).json({ mensaje: "No hay reservaciones activas" });
    return;
  }
  res.json(aReservacionPublica(rows[0]));
});

// ---------- Crear reservación ----------
reservacionesRouter.post("/", validarBody(CrearReservacionDto), async (req, res) => {
  const { id_usuario } = req.usuario!;
  const { id_espacio, hora_inicio, hora_fin } = req.body as CrearReservacionDto;

  if (inicioVencido(hora_inicio)) {
    res.status(400).json({ error: "La hora de inicio ya pasó" });
    return;
  }
  await actualizarEstadosVencidos();  

  // 1. Validar que el espacio exista y esté activo
  const [espacio] = await pool.query<RowDataPacket[]>(
    "SELECT estado_espacio FROM espacios WHERE id_espacio = ?",
    [id_espacio]
  );
  if (!espacio[0] || espacio[0].estado_espacio !== "activo") {
    res.status(400).json({ error: "El espacio no existe o no está disponible" });
    return;
  }

  // 2. Validar empalmes
  if (await hayTraslape(id_espacio, hora_inicio, hora_fin)) {
    res.status(409).json({ error: "El horario se empalma con otra reservación" });
    return;
  }

  // 3. Insertar (Omite "proposito" porque la tabla no lo tiene)
  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO reservaciones (id_usuario, id_espacio, fecha_hora_inicio, fecha_hora_fin)
     VALUES (?, ?, ?, ?)`,
    [id_usuario, id_espacio, hora_inicio, hora_fin]
  );
  res.status(201).json({ id_reservacion: resultado.insertId });
});

// ---------- Modificar horario (solo si aún no se libera ni se usa) ----------
reservacionesRouter.patch(
  "/:id",
  validarId,
  validarBody(ActualizarReservacionDto),
  async (req, res) => {
    const id_reservacion = Number(req.params.id);
    const { id_usuario, rol } = req.usuario!;
    const { hora_inicio, hora_fin } = req.body as ActualizarReservacionDto;

    await actualizarEstadosVencidos();

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id_usuario, id_espacio, estado_reservacion FROM reservaciones WHERE id_reservacion = ?",
      [id_reservacion]
    );
    const rev = rows[0];
    if (!rev) {
      res.status(404).json({ error: "Reservación no encontrada" });
      return;
    }
    if (!esAdministrador(rol) && rev.id_usuario !== id_usuario) {
      res.status(403).json({ error: "Sin permisos para modificar esta reservación" });
      return;
    }
    if (rev.estado_reservacion !== "creada") {
      res.status(409).json({
        error: `No se puede modificar una reservación ${rev.estado_reservacion}`,
      });
      return;
    }
    if (inicioVencido(hora_inicio)) {
      res.status(400).json({ error: "La hora de inicio ya pasó" });
      return;
    }
    if (await hayTraslape(rev.id_espacio, hora_inicio, hora_fin, id_reservacion)) {
      res.status(409).json({ error: "El horario se empalma con otra reservación" });
      return;
    }

    await pool.query(
      `UPDATE reservaciones SET fecha_hora_inicio = ?, fecha_hora_fin = ?
       WHERE id_reservacion = ? AND estado_reservacion = 'creada'`,
      [hora_inicio, hora_fin, id_reservacion]
    );
    res.json({ id_reservacion, hora_inicio, hora_fin });
  }
);

// ---------- Cancelar reservación (Baja lógica) ----------
reservacionesRouter.delete("/:id", validarId, async (req, res) => {
  await actualizarEstadosVencidos();
  const id_reservacion = Number(req.params.id);
  const { id_usuario, rol } = req.usuario!;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id_usuario, estado_reservacion FROM reservaciones WHERE id_reservacion = ?",
    [id_reservacion]
  );
  const rev = rows[0];

  if (!rev) {
    res.status(404).json({ error: "Reservación no encontrada" });
    return;
  }

  // Solo el dueño o un admin pueden cancelarla
  if (!esAdministrador(rol) && rev.id_usuario !== id_usuario) {
    res.status(403).json({ error: "Sin permisos para cancelar esta reservación" });
    return;
  }

    if (rev.estado_reservacion !== "creada" && rev.estado_reservacion !== "activa") {
    res.status(409).json({
      error: `No se puede cancelar una reservación ${rev.estado_reservacion}`,
    });
    return;
  }

  await pool.query(
    "UPDATE reservaciones SET estado_reservacion = 'cancelada' WHERE id_reservacion = ?",
    [id_reservacion]
  );
  res.status(204).end();
});