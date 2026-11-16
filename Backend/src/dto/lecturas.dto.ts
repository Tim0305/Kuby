import { z } from "zod";

const id_espacio = z.number().int().positive();

export const LecturaTemperaturaDto = z.strictObject({
  id_espacio,
  valor: z.number().min(-50).max(150),
});

export const LecturaHumedadDto = z.strictObject({
  id_espacio,
  valor: z.number().min(0).max(100),
});

// Acepta true/false o 1/0 y lo guarda siempre como 1/0
export const LecturaProximidadDto = z.strictObject({
  id_espacio,
  valor: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .transform((v) => (v ? 1 : 0)),
});

export const ConsultaRecientesDto = z.object({
  limite: z.coerce.number().int().min(1).max(500).default(100),
  id_espacio: z.coerce.number().int().positive().optional(),
});