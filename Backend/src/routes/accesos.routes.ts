import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import { esAdministrador, requireAuth } from "../middleware/auth.js";
import { requireDispositivo } from "../middleware/dispositivo.js";
import { validarBody } from "../middleware/validar.js";
import {
  ConsultaAccesosDto,
  ValidarAccesoDto,
  aAccesoPublico,
} from "../dto/accesos.dto.js";
import { actualizarEstadosVencidos } from "../services/reservaciones.js";

export const accesosRouter = Router();

// Los nombres de tabla y columna salen de este mapa, nunca del cliente
const CREDENCIALES = {
  qr: { tabla: "credenciales_qr", columna: "token_qr" },
  rfid: { tabla: "credenciales_rfid", columna: "uid_tarjeta" },
} as const;

type Decision = {
  resultado: "permitido" | "denegado";
  motivo: string | null;
  id_usuario: number | null;
  id_reservacion: number | null;
  activar: boolean; // true: la reservación pasa de 'creada' a 'activa'
};

function denegar(
  motivo: string,
  id_usuario: number | null = null,
  id_reservacion: number | null = null
): Decision {
  return { resultado: "denegado", motivo, id_usuario, id_reservacion, activar: false };
}

async function decidir(
  datos: ValidarAccesoDto,
  estadoEspacio: string,
  ahora: Date
): Promise<Decision> {
  const c = CREDENCIALES[datos.metodo];

  const [creds] = await pool.query<RowDataPacket[]>(
    `SELECT cr.id_usuario, cr.activa, u.estatus
     FROM \`${c.tabla}\` cr
     LEFT JOIN usuarios u ON u.id_usuario = cr.id_usuario
     WHERE cr.\`${c.columna}\` = ?`,
    [datos.credencial]
  );
  const cred = creds[0];
  if (!cred || cred.id_usuario === null) return denegar("credencial_invalida");

  const id_usuario: number = cred.id_usuario;
  if (!cred.activa) return denegar("credencial_inactiva", id_usuario);
  if (cred.estatus !== "activo") return denegar("usuario_inactivo", id_usuario);
  if (estadoEspacio !== "activo") return denegar("espacio_no_disponible", id_usuario);

  // Reservación vigente de este usuario en este cubículo, ahora mismo
  const [vigentes] = await pool.query<RowDataPacket[]>(
    `SELECT id_reservacion, estado_reservacion
     FROM reservaciones
     WHERE id_usuario = ? AND id_espacio = ?
       AND estado_reservacion IN ('creada', 'activa')
       AND fecha_hora_inicio <= ? AND fecha_hora_fin > ?
     ORDER BY fecha_hora_inicio DESC LIMIT 1`,
    [id_usuario, datos.id_espacio, ahora, ahora]
  );
  if (vigentes[0]) {
    return {
      resultado: "permitido",
      motivo: null,
      id_usuario,
      id_reservacion: vigentes[0].id_reservacion,
      activar: vigentes[0].estado_reservacion === "creada",
    };
  }

  // ¿Tenía una reservación en este horario que se liberó por no presentarse?
  const [liberadas] = await pool.query<RowDataPacket[]>(
    `SELECT id_reservacion FROM reservaciones
     WHERE id_usuario = ? AND id_espacio = ? AND estado_reservacion = 'liberada'
       AND fecha_hora_inicio <= ? AND fecha_hora_fin > ?
     LIMIT 1`,
    [id_usuario, datos.id_espacio, ahora, ahora]
  );
  if (liberadas[0]) {
    return denegar("reservacion_liberada", id_usuario, liberadas[0].id_reservacion);
  }

  return denegar("sin_reservacion_vigente", id_usuario);
}

// ---------- Validar un intento de entrada (lo llama el ESP32) ----------
accesosRouter.post(
  "/validar",
  requireDispositivo,
  validarBody(ValidarAccesoDto),
  async (req, res) => {
    const datos = req.body as ValidarAccesoDto;

    const [espacios] = await pool.query<RowDataPacket[]>(
      "SELECT estado_espacio FROM espacios WHERE id_espacio = ?",
      [datos.id_espacio]
    );
    if (!espacios[0]) {
      res.status(404).json({ error: "Espacio no encontrado" });
      return;
    }

    await actualizarEstadosVencidos();
    const decision = await decidir(datos, espacios[0].estado_espacio, new Date());

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query<ResultSetHeader>(
        `INSERT INTO historial_accesos
           (resultado, metodo_utilizado, motivo_denegacion, id_espacio, id_usuario, id_reservacion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          decision.resultado,
          datos.metodo,
          decision.motivo,
          datos.id_espacio,
          decision.id_usuario,
          decision.id_reservacion,
        ]
      );
      if (decision.activar) {
        await conn.query(
          `UPDATE reservaciones SET estado_reservacion = 'activa'
           WHERE id_reservacion = ? AND estado_reservacion = 'creada'`,
          [decision.id_reservacion]
        );
      }
      await conn.commit();

      res.json({
        acceso: decision.resultado === "permitido",
        resultado: decision.resultado,
        motivo: decision.motivo,
        id_acceso: ins.insertId,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
);

// ---------- Consultar historial (usuario: el suyo; admin: todos) ----------
accesosRouter.get("/", requireAuth, async (req, res) => {
  const consulta = ConsultaAccesosDto.safeParse(req.query);
  if (!consulta.success) {
    res.status(400).json({
      error: "Parámetros inválidos",
      detalles: consulta.error.issues.map((i) => ({
        campo: i.path.map(String).join("."),
        mensaje: i.message,
      })),
    });
    return;
  }
  const q = consulta.data;
  const { id_usuario, rol } = req.usuario!;

  const condiciones: string[] = [];
  const params: (string | number | Date)[] = [];

  if (!esAdministrador(rol)) {
    condiciones.push("h.id_usuario = ?");
    params.push(id_usuario);
  } else if (q.id_usuario) {
    condiciones.push("h.id_usuario = ?");
    params.push(q.id_usuario);
  }
  if (q.id_espacio) {
    condiciones.push("h.id_espacio = ?");
    params.push(q.id_espacio);
  }
  if (q.resultado) {
    condiciones.push("h.resultado = ?");
    params.push(q.resultado);
  }
  if (q.desde) {
    condiciones.push("h.time_hist >= ?");
    params.push(q.desde);
  }
  if (q.hasta) {
    condiciones.push("h.time_hist <= ?");
    params.push(q.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM historial_accesos h ${where}`,
    params
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT h.id_acceso, h.resultado, h.metodo_utilizado, h.motivo_denegacion,
            h.time_hist AS fecha, h.id_espacio, e.nombre_espacio,
            h.id_usuario, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
            h.id_reservacion
     FROM historial_accesos h
     LEFT JOIN espacios e ON e.id_espacio = h.id_espacio
     LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
     ${where}
     ORDER BY h.time_hist DESC, h.id_acceso DESC
     LIMIT ? OFFSET ?`,
    [...params, q.limite, (q.pagina - 1) * q.limite]
  );

  res.json({
    datos: rows.map(aAccesoPublico),
    pagina: q.pagina,
    limite: q.limite,
    total: Number(conteo[0].total),
  });
});