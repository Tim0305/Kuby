import { pool } from "../db.js";

const MARGEN_RELOJ_MS = 60_000;

export function inicioVencido(inicio: Date): boolean {
  return inicio.getTime() < Date.now() - MARGEN_RELOJ_MS;
}

export async function actualizarEstadosVencidos(): Promise<void> {
  // Nadie entró dentro de la tolerancia: se libera el horario
  await pool.query(
    `UPDATE reservaciones r JOIN configuracion_check_in c ON c.id = 1
     SET r.estado_reservacion = 'liberada'
     WHERE r.estado_reservacion = 'creada' AND r.check_in_en IS NULL
       AND (NOW(3) > TIMESTAMPADD(MINUTE, c.minutos_despues, r.fecha_hora_inicio)
            OR r.fecha_hora_fin <= NOW(3))`
  );
  // Terminó el horario de una reservación que sí se usó
  await pool.query(
    `UPDATE reservaciones SET estado_reservacion = 'finalizada'
     WHERE estado_reservacion = 'activa' AND fecha_hora_fin <= NOW(3)`
  );
}

export function iniciarTareaEstados(): void {
  const correr = () =>
    actualizarEstadosVencidos().catch((e) =>
      console.error("Error actualizando estados de reservaciones:", e)
    );
  void correr();
  setInterval(correr, 60_000);
}
