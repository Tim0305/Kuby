export const APP_LOCALE = "es-MX"

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return value.toLocaleString(APP_LOCALE, options)
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(APP_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short"
  })
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(APP_LOCALE, {
    hour: "2-digit",
    minute: "2-digit"
  })
}

const fieldLabels: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  matricula: "Matrícula",
  password: "Contraseña",
  password_actual: "Contraseña actual",
  nombre_espacio: "Nombre del cubículo",
  ubicacion: "Ubicación",
  capacidad: "Capacidad",
  ip_nodo_esp32: "Dirección del ESP32",
  estado_espacio: "Estado del cubículo",
  estatus: "Estado",
  id_rol: "Rol",
  hora_inicio: "Hora de inicio",
  hora_fin: "Hora de fin",
  id_espacio: "Cubículo",
  id_usuario: "Usuario",
  resultado: "Resultado",
  desde: "Desde",
  hasta: "Hasta",
  pagina: "Página",
  limite: "Límite",
  foto: "Foto"
}

export function fieldLabel(field: string) {
  return fieldLabels[field] ?? "Campo"
}

/** Uses the existing HTML constraints, independently of the browser language. */
export function inputValidationMessage(input: HTMLInputElement): string {
  const validity = input.validity
  if (validity.valueMissing) return "Completa este campo."
  if (validity.tooShort) return `Usa al menos ${input.minLength} caracteres.`
  if (validity.tooLong) return `Usa como máximo ${input.maxLength} caracteres.`
  if (validity.rangeUnderflow) return `El valor mínimo es ${input.min}.`
  if (validity.rangeOverflow) return `El valor máximo es ${input.max}.`
  if (validity.stepMismatch) return "Ingresa un valor que respete el incremento indicado."
  if (validity.typeMismatch) return "Ingresa un valor con el formato indicado."
  if (validity.patternMismatch) return "Usa el formato indicado."
  if (validity.badInput) return "Ingresa un valor válido."
  return ""
}
