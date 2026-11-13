import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import { esAdministrador, requireAuth } from "../middleware/auth.js";
import { requireDispositivo } from "../middleware/dispositivo.js";
import { validarBody } from "../middleware/validar.js";
import {
  ConsultaAccesosDto,
  ValidarAccesoDto,
  aAccesoPublico,
} from "../dto/accesos.dto.js";
import { validarAcceso } from "../services/accesos.js";

export const accesosRouter = Router();

// ---------- Validar un intento de entrada (lo llama el ESP32) ----------
accesosRouter.post(
  "/validar",
  requireDispositivo,
  validarBody(ValidarAccesoDto),
  async (req, res) => {
    const datos = req.body as ValidarAccesoDto;

    const decision = await validarAcceso(datos);
    if (!decision) {
      res.status(404).json({ error: "Espacio no encontrado" });
      return;
    }
    res.json(decision);
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