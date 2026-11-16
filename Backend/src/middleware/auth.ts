import type { RequestHandler } from "express";
import type { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { pool } from "../db.js";

export type SesionUsuario = { id_usuario: number; rol: string };

export function esAdministrador(rol: string): boolean {
  return rol === "admin" || rol === "superadmin";
}

declare global {
  namespace Express {
    interface Request {
      usuario?: SesionUsuario;
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    res.status(401).json({ error: "Sesión inválida o expirada" });
    return;
  }

  const id = Number(payload.sub);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.estatus, r.nombre_rol AS rol
     FROM usuarios u
     LEFT JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`,
    [id]
  );
  if (rows[0]?.estatus !== "activo") {
    res.status(401).json({ error: "Usuario inactivo o inexistente" });
    return;
  }

  req.usuario = { id_usuario: id, rol: rows[0].rol ?? "usuario" };
  next();
};

export const requireRol =
  (...roles: string[]): RequestHandler =>
  (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: "Sin permisos" });
      return;
    }
    next();
  };

export const requireAdmin = requireRol("admin", "superadmin");