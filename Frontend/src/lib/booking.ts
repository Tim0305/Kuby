import type { EstadoReservacion, Horario } from "@/lib/api"

export const canReschedule = (state: EstadoReservacion) => state === "creada"
export const canCancel = (state: EstadoReservacion) =>
  state === "creada" || state === "activa"

export function toLocalInput(value: string): string {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function bookingTimes(
  start: string,
  end: string,
  now = Date.now()
): Horario {
  const inicio = new Date(start)
  const fin = new Date(end)
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()))
    throw new Error("Elige una hora de inicio y una hora de fin válidas.")
  if (fin <= inicio) throw new Error("La hora de fin debe ser posterior a la hora de inicio.")
  if (inicio.getTime() < now - 60_000)
    throw new Error("La hora de inicio no puede estar en el pasado.")
  return { hora_inicio: inicio.toISOString(), hora_fin: fin.toISOString() }
}

export function validatePhoto(file: File): void {
  if (!file.size) throw new Error("Primero elige una foto.")
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error("Elige una foto JPG o PNG.")
  if (file.size > 2 * 1024 * 1024)
    throw new Error("La foto debe pesar 2 MB o menos.")
}
