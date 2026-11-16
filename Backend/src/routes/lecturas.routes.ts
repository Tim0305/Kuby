import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { requireDispositivo } from "../middleware/dispositivo.js";
import { parsearBody, parsearQuery } from "../middleware/validar.js";
import {
  ConsultaRecientesDto,
  LecturaHumedadDto,
  LecturaProximidadDto,
  LecturaTemperaturaDto,
} from "../dto/lecturas.dto.js";

export const lecturasRouter = Router();
// OJO: aquí NO va lecturasRouter.use(requireAuth). Este router cuelga de "/api"
// y un middleware a nivel de router interceptaría también /api/accesos/validar.

// Los nombres de tabla y columna salen de este mapa, nunca del cliente
const sensores = {
  temperatura: {
    tabla: "lecturas_temperatura", id: "id_lectura_temp",
    valor: "valor_temperatura", tiempo: "time_temp", dto: LecturaTemperaturaDto,
  },
  humedad: {
    tabla: "lecturas_humedad", id: "id_lectura_hum",
    valor: "valor_humedad", tiempo: "time_hum", dto: LecturaHumedadDto,
  },
  proximidad: {
    tabla: "lecturas_proximidad", id: "id_lectura_prox",
    valor: "deteccion", tiempo: "time_prox", dto: LecturaProximidadDto,
  },
} as const;

type NombreSensor = keyof typeof sensores;

function esSensor(nombre: unknown): nombre is NombreSensor {
  return (
    typeof nombre === "string" &&
    Object.prototype.hasOwnProperty.call(sensores, nombre)
  );
}
async function contar(tabla: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM \`${tabla}\``
  );
  return Number(rows[0].total);
}

// ---------- Resumen (solo admin) ----------
lecturasRouter.get("/resumen", requireAuth, requireAdmin, async (_req, res) => {
  const [usuarios, espacios, reservaciones, accesos] = await Promise.all([
    contar("usuarios"),
    contar("espacios"),
    contar("reservaciones"),
    contar("historial_accesos"),
  ]);
  res.json({ usuarios, espacios, reservaciones, accesos });
});

// ---------- Guardar una lectura (lo llama el ESP32) ----------
lecturasRouter.post("/lecturas/:sensor", requireDispositivo, async (req, res) => {
  const nombre = req.params.sensor;
  if (!esSensor(nombre)) {
    res.status(404).json({ error: "Sensor no existe" });
    return;
  }
  const s = sensores[nombre];

  const datos = parsearBody(s.dto, req, res);
  if (!datos) return;

  try {
    const [r] = await pool.query<ResultSetHeader>(
      `INSERT INTO \`${s.tabla}\` (\`${s.valor}\`, id_espacio) VALUES (?, ?)`,
      [datos.valor, datos.id_espacio]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_REFERENCED_ROW_2") {
      res.status(404).json({ error: "Espacio no encontrado" });
      return;
    }
    throw err;
  }
});

// ---------- Últimas N lecturas (historial o gráfica) ----------
lecturasRouter.get("/lecturas/:sensor/recientes", requireAuth, async (req, res) => {
  const nombre = req.params.sensor;
  if (!esSensor(nombre)) {
    res.status(404).json({ error: "Sensor no existe" });
    return;
  }
  const s = sensores[nombre];

  const q = parsearQuery(ConsultaRecientesDto, req, res);
  if (!q) return;

  const where = q.id_espacio ? "WHERE id_espacio = ?" : "";
  const params = q.id_espacio ? [q.id_espacio, q.limite] : [q.limite];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`${s.id}\` AS id, \`${s.valor}\` AS valor, \`${s.tiempo}\` AS fecha, id_espacio
     FROM \`${s.tabla}\` ${where}
     ORDER BY \`${s.id}\` DESC
     LIMIT ?`,
    params
  );
  res.json(rows);
});

// ---------- Lectura más reciente de cada espacio (para tarjetas) ----------
lecturasRouter.get("/lecturas/:sensor/ultima", requireAuth, async (req, res) => {
  const nombre = req.params.sensor;
  if (!esSensor(nombre)) {
    res.status(404).json({ error: "Sensor no existe" });
    return;
  }
  const s = sensores[nombre];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.id_espacio, l.\`${s.valor}\` AS valor, l.\`${s.tiempo}\` AS fecha
     FROM \`${s.tabla}\` l
     JOIN (
       SELECT MAX(\`${s.id}\`) AS max_id
       FROM \`${s.tabla}\`
       GROUP BY id_espacio
     ) u ON u.max_id = l.\`${s.id}\``
  );
  res.json(rows);
});