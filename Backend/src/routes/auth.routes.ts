import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "../config.js";
import { pool } from "../db.js";
import { validarBody } from "../middleware/validar.js";
import { requireAuth } from "../middleware/auth.js";
import { LoginDto, SignupDto, aUsuarioPublico, SELECT_USUARIO_PUBLICO } from "../dto/usuarios.dto.js";

export const authRouter = Router();

const OCHO_HORAS_S = 8 * 60 * 60;

authRouter.post("/signup", validarBody(SignupDto), async (req, res) => {
  const { nombre, apellido, matricula, password } = req.body as SignupDto;
  const hash = await bcrypt.hash(password, 12);

  try {
    const [resultado] = await pool.query<ResultSetHeader>(
      `INSERT INTO usuarios (nombre, apellido, matricula, password_hash, id_rol)
       VALUES (?, ?, ?, ?, (SELECT id_rol FROM roles WHERE nombre_rol = 'usuario'))`,
      [nombre, apellido, matricula, hash]
    );
    res.status(201).json({ id_usuario: resultado.insertId });
  } catch (err) {
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Esa matrícula ya está registrada" });
      return;
    }
    throw err;
  }
});

authRouter.post("/login", validarBody(LoginDto), async (req, res) => {
  const { matricula, password } = req.body as LoginDto;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT u.id_usuario, u.password_hash, u.estatus, r.nombre_rol AS rol
     FROM usuarios u
     LEFT JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.matricula = ?`,
    [matricula]
  );
  const u = rows[0];
  const valido = u && (await bcrypt.compare(password, u.password_hash));

  if (!valido || u.estatus !== "activo") {
    res.status(401).json({ error: "Matrícula o contraseña incorrectas" });
    return;
  }

  const token = jwt.sign({ rol: u.rol ?? "usuario" }, config.jwtSecret, {
    subject: String(u.id_usuario),
    expiresIn: OCHO_HORAS_S,
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // true solo si se sirve por HTTPS
    maxAge: OCHO_HORAS_S * 1000,
  });
  res.json({ id_usuario: u.id_usuario, rol: u.rol ?? "usuario" });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_USUARIO_PUBLICO} WHERE u.id_usuario = ?`,
    [req.usuario!.id_usuario]
  );
  res.json(aUsuarioPublico(rows[0]));
});