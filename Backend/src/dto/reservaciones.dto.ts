import { z } from "zod";
import type { RowDataPacket } from "mysql2";

export const CrearReservacionDto = z
  .strictObject({
    id_espacio: z.number().int().positive(),
    hora_inicio: z.coerce.date(),
    hora_fin: z.coerce.date(),
    proposito: z.string().trim().max(255).optional(),
  })
  .refine((d) => d.hora_fin > d.hora_inicio, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["hora_fin"],
  });
export type CrearReservacionDto = z.infer<typeof CrearReservacionDto>;

export type ReservacionPublica = {
  id_reservacion: number;
  id_usuario: number;
  id_espacio: number;
  nombre_espacio?: string;
  hora_inicio: Date;
  hora_fin: Date;
  proposito: string | null;
  estado_reservacion: string;
  creada_en: Date;
};

export function aReservacionPublica(f: RowDataPacket): ReservacionPublica {
  return {
    id_reservacion: f.id_reservacion,
    id_usuario: f.id_usuario,
    id_espacio: f.id_espacio,
    nombre_espacio: f.nombre_espacio,
    hora_inicio: f.hora_inicio,
    hora_fin: f.hora_fin,
    proposito: f.proposito ?? null,
    estado_reservacion: f.estado_reservacion,
    creada_en: f.creada_en,
  };
}

export const ActualizarReservacionDto = z
  .strictObject({
    hora_inicio: z.coerce.date(),
    hora_fin: z.coerce.date(),
  })
  .refine((d) => d.hora_fin > d.hora_inicio, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["hora_fin"],
  });
export type ActualizarReservacionDto = z.infer<typeof ActualizarReservacionDto>;