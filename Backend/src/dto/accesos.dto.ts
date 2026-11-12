import { z } from "zod";
import type { RowDataPacket } from "mysql2";

export const ValidarAccesoDto = z.strictObject({
  id_espacio: z.number().int().positive(),
  // "facial" se agregará aquí cuando se confirme su viabilidad
  metodo: z.enum(["qr", "rfid"]),
  credencial: z.string().trim().min(1).max(255),
});
export type ValidarAccesoDto = z.infer<typeof ValidarAccesoDto>;

export const ConsultaAccesosDto = z.object({
  id_espacio: z.coerce.number().int().positive().optional(),
  id_usuario: z.coerce.number().int().positive().optional(), // solo lo respeta el admin
  resultado: z.enum(["permitido", "denegado"]).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  pagina: z.coerce.number().int().min(1).default(1),
});
export type ConsultaAccesosDto = z.infer<typeof ConsultaAccesosDto>;

export type AccesoPublico = {
  id_acceso: number;
  resultado: string;
  metodo_utilizado: string;
  motivo_denegacion: string | null;
  fecha: Date;
  id_espacio: number | null;
  nombre_espacio: string | null;
  id_usuario: number | null;
  usuario: string | null;
  id_reservacion: number | null;
};

export function aAccesoPublico(f: RowDataPacket): AccesoPublico {
  return {
    id_acceso: f.id_acceso,
    resultado: f.resultado,
    metodo_utilizado: f.metodo_utilizado,
    motivo_denegacion: f.motivo_denegacion ?? null,
    fecha: f.fecha,
    id_espacio: f.id_espacio ?? null,
    nombre_espacio: f.nombre_espacio ?? null,
    id_usuario: f.id_usuario ?? null,
    usuario: f.usuario_nombre ? `${f.usuario_nombre} ${f.usuario_apellido}` : null,
    id_reservacion: f.id_reservacion ?? null,
  };
}