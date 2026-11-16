import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validarBody, validarId } from "../middleware/validar.js";
import {
  CrearEspacioDto,
  ActualizarEspacioDto,
  aEspacioPublico,
} from "../dto/espacios.dto.js";

export const espaciosRouter = Router();
espaciosRouter.use(requireAuth); // Todo requiere sesión

// ---------- Listar espacios ----------
espaciosRouter.get("/", async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM espacios ORDER BY nombre_espacio"
  );
  res.json(rows.map(aEspacioPublico));
});

// ---------- Obtener un espacio ----------
espaciosRouter.get("/:id", validarId, async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM espacios WHERE id_espacio = ?",
    [Number(req.params.id)]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "Espacio no encontrado" });
    return;
  }
  res.json(aEspacioPublico(rows[0]));
});

// ---------- Obtener último estado de sensores del espacio ----------
espaciosRouter.get("/:id/estado", validarId, async (req, res) => {
  const id = Number(req.params.id);
  const [espacio] = await pool.query<RowDataPacket[]>(
    "SELECT id_espacio FROM espacios WHERE id_espacio = ?",
    [id]
  );
  if (!espacio[0]) {
    res.status(404).json({ error: "Espacio no encontrado" });
    return;
  }

  // Combina la última lectura de cada tabla y estandariza los nombres de las columnas con AS
  const [lecturas] = await pool.query<RowDataPacket[]>(
    `(SELECT 'temperatura' AS tipo_sensor, valor_temperatura AS valor, '°C' AS unidad, time_temp AS registrado_en 
      FROM lecturas_temperatura WHERE id_espacio = ? ORDER BY time_temp DESC LIMIT 1)
     UNION ALL
     (SELECT 'humedad' AS tipo_sensor, valor_humedad AS valor, '%' AS unidad, time_hum AS registrado_en 
      FROM lecturas_humedad WHERE id_espacio = ? ORDER BY time_hum DESC LIMIT 1)
     UNION ALL
     (SELECT 'proximidad' AS tipo_sensor, deteccion AS valor, 'bool' AS unidad, time_prox AS registrado_en 
      FROM lecturas_proximidad WHERE id_espacio = ? ORDER BY time_prox DESC LIMIT 1)
     ORDER BY registrado_en DESC`,
    [id, id, id]
  );
  res.json(lecturas);
});

// ---------- Crear espacio (Solo Admin) ----------
espaciosRouter.post("/", requireAdmin, validarBody(CrearEspacioDto), async (req, res) => {
  const { nombre_espacio, ubicacion, capacidad, ip_nodo_esp32, estado_espacio } = req.body as CrearEspacioDto;

  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO espacios (nombre_espacio, ubicacion, capacidad, ip_nodo_esp32, estado_espacio)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre_espacio, ubicacion ?? null, capacidad, ip_nodo_esp32 ?? null, estado_espacio]
  );
  res.status(201).json({ id_espacio: resultado.insertId });
});

// ---------- Modificar espacio (Solo Admin) ----------
espaciosRouter.patch("/:id", requireAdmin, validarId, validarBody(ActualizarEspacioDto), async (req, res) => {
  const id = Number(req.params.id);
  const datos = req.body as ActualizarEspacioDto;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM espacios WHERE id_espacio = ?",
    [id]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "Espacio no encontrado" });
    return;
  }

  const sets = Object.keys(datos).map((c) => `\`${c}\` = ?`).join(", ");
  await pool.query(`UPDATE espacios SET ${sets} WHERE id_espacio = ?`, [
    ...Object.values(datos),
    id,
  ]);

  const [actualizado] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM espacios WHERE id_espacio = ?",
    [id]
  );
  res.json(aEspacioPublico(actualizado[0]));
});

// ---------- Baja lógica / Eliminar espacio (Solo Admin) ----------
espaciosRouter.delete("/:id", requireAdmin, validarId, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM espacios WHERE id_espacio = ?",
    [id]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "Espacio no encontrado" });
    return;
  }

  // Baja lógica cambiando estado a inactivo para no romper reservaciones pasadas
  await pool.query("UPDATE espacios SET estado_espacio = 'inactivo' WHERE id_espacio = ?", [id]);
  res.status(204).end();
});