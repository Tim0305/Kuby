import { z } from "zod";
import type { RowDataPacket } from "mysql2";

const nombre = z.string().trim().min(1, "Requerido").max(100);
const ubicacion = z.string().trim().max(100).optional();
const capacidad = z.number().int().positive().default(1);
const ipNodo = z.string().trim().max(45).optional();
const estado = z.enum(["activo", "inactivo", "mantenimiento"]).default("activo");

export const CrearEspacioDto = z.strictObject({
  nombre_espacio: nombre,
  ubicacion: ubicacion,
  capacidad: capacidad,
  ip_nodo_esp32: ipNodo,
  estado_espacio: estado,
});
export type CrearEspacioDto = z.infer<typeof CrearEspacioDto>;

export const ActualizarEspacioDto = z
  .strictObject({
    nombre_espacio: nombre,
    ubicacion,
    capacidad: z.number().int().positive(),
    ip_nodo_esp32: ipNodo,
    estado_espacio: z.enum(["activo", "inactivo", "mantenimiento"]),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "No hay nada que actualizar",
  });
export type ActualizarEspacioDto = z.infer<typeof ActualizarEspacioDto>;

export type EspacioPublico = {
  id_espacio: number;
  nombre_espacio: string;
  ubicacion: string | null;
  capacidad: number;
  ip_nodo_esp32: string | null;
  estado_espacio: string;
  creado_en: Date;
};

export function aEspacioPublico(f: RowDataPacket): EspacioPublico {
  return {
    id_espacio: f.id_espacio,
    nombre_espacio: f.nombre_espacio,
    ubicacion: f.ubicacion ?? null,
    capacidad: f.capacidad,
    ip_nodo_esp32: f.ip_nodo_esp32 ?? null,
    estado_espacio: f.estado_espacio,
    creado_en: f.creado_en,
  };
}