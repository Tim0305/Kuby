import type { Pool, PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db.js";
import type { ConfiguracionCheckIn } from "../dto/check-in.dto.js";

export async function obtenerConfiguracionCheckIn(
  db: Pool | PoolConnection = pool,
  bloquear = false
): Promise<ConfiguracionCheckIn> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT minutos_antes, minutos_despues FROM configuracion_check_in
     WHERE id = 1${bloquear ? " LOCK IN SHARE MODE" : ""}`
  );
  // Fail closed if the migration/settings are missing, rather than silently using defaults.
  if (!rows[0]) throw new Error("Falta la configuración de check-in");
  return { minutos_antes: rows[0].minutos_antes, minutos_despues: rows[0].minutos_despues };
}
