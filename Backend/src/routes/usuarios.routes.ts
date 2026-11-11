import { Router } from "express";
import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import { requireAuth, requireRol } from "../middleware/auth.js";
import { parsearBody, validarId } from "../middleware/validar.js";
import {
  ActualizarPerfilDto,
  AdminActualizarUsuarioDto,
  SELECT_USUARIO_PUBLICO,
  aUsuarioPublico,
} from "../dto/usuarios.dto.js";

export const usuariosRouter = Router();
usuariosRouter.use(requireAuth); // todo este módulo exige sesión

// ---------- helpers ----------
const adminOPropio: RequestHandler = (req, res, next) => {
  const { rol, id_usuario } = req.usuario!;
  if (rol !== "admin" && id_usuario !== Number(req.params.id)) {
    res.status(403).json({ error: "Sin permisos" });
    return;
  }
  next();
};

async function obtenerUsuario(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_USUARIO_PUBLICO} WHERE u.id_usuario = ?`,
    [id]
  );
  return rows[0];
}

// Los nombres de columna salen del código, nunca de lo que manda el cliente
async function aplicarCambios(id: number, cambios: Record<string, string | number>) {
  const sets = Object.keys(cambios).map((c) => `\`${c}\` = ?`).join(", ");
  await pool.query(`UPDATE usuarios SET ${sets} WHERE id_usuario = ?`, [
    ...Object.values(cambios),
    id,
  ]);
}

function tipoImagen(b: Buffer): "image/jpeg" | "image/png" | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length > 8 && b.subarray(0, 8).equals(png)) return "image/png";
  return null;
}

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

// ---------- lista (admin) ----------
usuariosRouter.get("/", requireRol("admin"), async (req, res) => {
  const filtro = req.query.estatus;
  if (filtro !== undefined && filtro !== "activo" && filtro !== "inactivo") {
    res.status(400).json({ error: "estatus debe ser activo o inactivo" });
    return;
  }
  const where = filtro ? "WHERE u.estatus = ?" : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_USUARIO_PUBLICO} ${where} ORDER BY u.apellido, u.nombre`,
    filtro ? [filtro] : []
  );
  res.json(rows.map(aUsuarioPublico));
});

// ---------- uno ----------
usuariosRouter.get("/:id", validarId, adminOPropio, async (req, res) => {
  const usuario = await obtenerUsuario(Number(req.params.id));
  if (!usuario) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json(aUsuarioPublico(usuario));
});

// ---------- editar ----------
usuariosRouter.patch("/:id", validarId, adminOPropio, async (req, res) => {
  const id = Number(req.params.id);
  const esPropio = req.usuario!.id_usuario === id;

  if (!(await obtenerUsuario(id))) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const cambios: Record<string, string | number> = {};

  if (esPropio) {
    // Perfil propio: solo nombre, apellido y contraseña
    const datos = parsearBody(ActualizarPerfilDto, req, res);
    if (!datos) return;

    if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
    if (datos.apellido !== undefined) cambios.apellido = datos.apellido;

    if (datos.password !== undefined) {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT password_hash FROM usuarios WHERE id_usuario = ?",
        [id]
      );
      const coincide = await bcrypt.compare(
        datos.password_actual ?? "",
        rows[0].password_hash
      );
      if (!coincide) {
        res.status(403).json({ error: "La contraseña actual es incorrecta" });
        return;
      }
      cambios.password_hash = await bcrypt.hash(datos.password, 12);
    }
  } else {
    // Admin editando a otra persona
    const datos = parsearBody(AdminActualizarUsuarioDto, req, res);
    if (!datos) return;

    if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
    if (datos.apellido !== undefined) cambios.apellido = datos.apellido;
    if (datos.id_rol !== undefined) cambios.id_rol = datos.id_rol;
    if (datos.estatus !== undefined) cambios.estatus = datos.estatus;
  }

  try {
    await aplicarCambios(id, cambios);
  } catch (err) {
    if ((err as { code?: string }).code === "ER_NO_REFERENCED_ROW_2") {
      res.status(400).json({ error: "El rol indicado no existe" });
      return;
    }
    throw err;
  }

  res.json(aUsuarioPublico(await obtenerUsuario(id)));
});

// ---------- baja lógica (admin) ----------
usuariosRouter.delete("/:id", requireRol("admin"), validarId, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario!.id_usuario) {
    res.status(400).json({ error: "No puedes dar de baja tu propia cuenta" });
    return;
  }
  if (!(await obtenerUsuario(id))) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  await aplicarCambios(id, { estatus: "inactivo" });
  res.status(204).end();
});

// ---------- foto ----------
usuariosRouter.put(
  "/:id/foto",
  validarId,
  adminOPropio,
  subida.single("foto"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) {
      res.status(400).json({ error: "Falta el archivo en el campo 'foto'" });
      return;
    }
    if (!tipoImagen(req.file.buffer)) {
      res.status(400).json({ error: "Solo se aceptan imágenes JPG o PNG" });
      return;
    }
    if (!(await obtenerUsuario(id))) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    await pool.query("UPDATE usuarios SET foto = ? WHERE id_usuario = ?", [
      req.file.buffer,
      id,
    ]);
    res.status(204).end();
  }
);

usuariosRouter.get("/:id/foto", validarId, adminOPropio, async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT foto FROM usuarios WHERE id_usuario = ?",
    [Number(req.params.id)]
  );
  const foto: Buffer | null | undefined = rows[0]?.foto;
  if (!foto) {
    res.status(404).json({ error: "El usuario no tiene foto" });
    return;
  }
  res
    .set("Cache-Control", "private, no-store")
    .type(tipoImagen(foto) ?? "application/octet-stream")
    .send(foto);
});

usuariosRouter.delete("/:id/foto", validarId, adminOPropio, async (req, res) => {
  await pool.query("UPDATE usuarios SET foto = NULL WHERE id_usuario = ?", [
    Number(req.params.id),
  ]);
  res.status(204).end();
});