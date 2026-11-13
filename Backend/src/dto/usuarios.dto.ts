import { z } from "zod";
import type { RowDataPacket } from "mysql2";

const nombre = z.string().trim().min(1, "Requerido").max(100);
const password = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres"); // límite de bcrypt

export const SignupDto = z.strictObject({
  nombre,
  apellido: nombre,
  matricula: z.string().trim().min(1).max(20),
  password,
});
export type SignupDto = z.infer<typeof SignupDto>;

export const LoginDto = z.strictObject({
  matricula: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(72),
});
export type LoginDto = z.infer<typeof LoginDto>;

// Lo único que un usuario puede cambiar de sí mismo 
export const ActualizarPerfilDto = z
  .strictObject({
    nombre,
    apellido: nombre,
    password,
    password_actual: z.string().min(1).max(72),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "No hay nada que actualizar",
  })
  .refine((d) => !d.password || d.password_actual, {
    message: "Para cambiar la contraseña envía password_actual",
    path: ["password_actual"],
  });
export type ActualizarPerfilDto = z.infer<typeof ActualizarPerfilDto>;

// Lo que un admin puede cambiar de OTRO usuario
export const AdminActualizarUsuarioDto = z
  .strictObject({
    nombre,
    apellido: nombre,
    estatus: z.enum(["activo", "inactivo"]),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "No hay nada que actualizar",
  });
export type AdminActualizarUsuarioDto = z.infer<typeof AdminActualizarUsuarioDto>;

// Solo el superadmin puede asignar roles.
export const SuperadminActualizarUsuarioDto = z
  .strictObject({
    nombre,
    apellido: nombre,
    id_rol: z.number().int().positive(),
    estatus: z.enum(["activo", "inactivo"]),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "No hay nada que actualizar",
  });
export type SuperadminActualizarUsuarioDto = z.infer<
  typeof SuperadminActualizarUsuarioDto
>;

// Lo que sí se devuelve al frontend: nunca password_hash ni foto
export type UsuarioPublico = {
  id_usuario: number;
  nombre: string;
  apellido: string;
  matricula: string;
  estatus: string;
  id_rol: number | null;
  rol: string | null;
  creado_en: Date;
  tiene_foto: boolean;
};

export const SELECT_USUARIO_PUBLICO = `
  SELECT u.id_usuario, u.nombre, u.apellido, u.matricula, u.estatus,
         u.id_rol, r.nombre_rol AS rol, u.creado_en,
         (u.foto IS NOT NULL) AS tiene_foto
  FROM usuarios u
  LEFT JOIN roles r ON r.id_rol = u.id_rol`;

export function aUsuarioPublico(f: RowDataPacket): UsuarioPublico {
  return {
    id_usuario: f.id_usuario,
    nombre: f.nombre,
    apellido: f.apellido,
    matricula: f.matricula,
    estatus: f.estatus,
    id_rol: f.id_rol,
    rol: f.rol ?? null,
    creado_en: f.creado_en,
    tiene_foto: Boolean(f.tiene_foto),
  };
}