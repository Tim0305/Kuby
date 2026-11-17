import { z } from "zod";

const minutos = z.number().int().min(0).max(180);
export const ConfiguracionCheckInDto = z.strictObject({
  minutos_antes: minutos,
  minutos_despues: minutos,
});
export type ConfiguracionCheckIn = z.infer<typeof ConfiguracionCheckInDto>;

export const CheckInDto = z.strictObject({
  id_reservacion: z.number().int().positive(),
});

export const TokenCheckInDto = z.uuid();
