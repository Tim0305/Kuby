import { Router } from "express";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { validarBody, validarId } from "../middleware/validar.js";
import { CrearReservacionDto, aReservacionPublica } from "../dto/reservaciones.dto.js";

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
  const where = rol === "admin" ? "" : "WHERE r.id_usuario = ?";
  const params = rol === "admin" ? [] : [id_usuario];

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

// ---------- Cancelar reservación (Baja lógica) ----------
reservacionesRouter.delete("/:id", validarId, async (req, res) => {
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
  if (rol !== "admin" && rev.id_usuario !== id_usuario) {
    res.status(403).json({ error: "Sin permisos para cancelar esta reservación" });
    return;
  }

  if (rev.estado_reservacion === "cancelada") {
    res.status(400).json({ error: "La reservación ya estaba cancelada" });
    return;
  }

  await pool.query(
    "UPDATE reservaciones SET estado_reservacion = 'cancelada' WHERE id_reservacion = ?",
    [id_reservacion]
  );
  res.status(204).end();
});