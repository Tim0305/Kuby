import { pool } from "../db.js";

// Minutos desde el inicio en los que hay que entrar; después se libera
export const TOLERANCIA_MINUTOS = 10;
const MARGEN_RELOJ_MS = 60_000;

export function inicioVencido(inicio: Date): boolean {
  return inicio.getTime() < Date.now() - MARGEN_RELOJ_MS;
}

export async function actualizarEstadosVencidos(): Promise<void> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() - TOLERANCIA_MINUTOS * 60_000);

  // Nadie entró dentro de la tolerancia: se libera el horario
  await pool.query(
    `UPDATE reservaciones SET estado_reservacion = 'liberada'
     WHERE estado_reservacion = 'creada' AND fecha_hora_inicio < ?`,
    [limite]
  );
  // Terminó el horario de una reservación que sí se usó
  await pool.query(
    `UPDATE reservaciones SET estado_reservacion = 'finalizada'
     WHERE estado_reservacion = 'activa' AND fecha_hora_fin <= ?`,
    [ahora]
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