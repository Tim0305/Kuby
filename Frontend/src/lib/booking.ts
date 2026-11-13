import type { EstadoReservacion, Horario } from "./api"

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
    throw new Error("Choose a valid start and end time.")
  if (fin <= inicio) throw new Error("End time must be after start time.")
  if (inicio.getTime() < now - 60_000)
    throw new Error("Start time cannot be in the past.")
  return { hora_inicio: inicio.toISOString(), hora_fin: fin.toISOString() }
}

export function validatePhoto(file: File): void {
  if (!file.size) throw new Error("Choose a photo first.")
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error("Choose a JPG or PNG photo.")
  if (file.size > 2 * 1024 * 1024)
    throw new Error("Photos must be 2 MB or smaller.")
}
