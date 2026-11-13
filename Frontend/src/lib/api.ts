export type Usuario = {
  id_usuario: number
  nombre: string
  apellido: string
  matricula: string
  estatus: string
  id_rol: number | null
  rol: string | null
  creado_en: string
  tiene_foto: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(
    status: number,
    message: string,
    fields: Record<string, string> = {}
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }
}

/** Localize validator text at the client boundary; field keys remain API identifiers. */
function validationMessage(message: string): string {
  const length = /^Too (small|big): expected string to have (>=|<=|>|<|exactly )([\d.]+) characters$/.exec(message)
  if (length) {
    const [, size, operator, limit] = length
    if (operator === "exactly ") return `Usa exactamente ${limit} caracteres.`
    if (operator === ">") return `Usa más de ${limit} caracteres.`
    if (operator === "<") return `Usa menos de ${limit} caracteres.`
    return size === "small"
      ? `Usa al menos ${limit} caracteres.`
      : `Usa como máximo ${limit} caracteres.`
  }
  const range = /^Too (?:small|big): expected number to be (>=|<=|>|<|exactly )(-?[\d.]+)$/.exec(message)
  if (range) {
    const [, operator, limit] = range
    const comparisons: Record<string, string> = {
      ">": "mayor que",
      ">=": "mayor o igual que",
      "<": "menor que",
      "<=": "menor o igual que",
      "exactly ": "igual a"
    }
    return `Ingresa un número ${comparisons[operator]} ${limit}.`
  }
  if (message.startsWith("Invalid input: expected int"))
    return "Ingresa un número entero válido."
  if (message.startsWith("Invalid option:")) return "Selecciona una opción válida."
  if (/^(Invalid|Unrecognized|Too (?:small|big))\b/.test(message))
    return "El valor ingresado no es válido."
  if (/\b(required|must|expected|cannot|should|invalid)\b/i.test(message))
    return "Revisa el valor de este campo."
  if (message === "Para cambiar la contraseña envía password_actual")
    return "Ingresa tu contraseña actual para cambiarla."
  return message
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000)
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Inténtalo de nuevo."
    )
  }

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const defaults: Record<number, string> = {
      401: "Tu sesión no está disponible o ha expirado. Inicia sesión de nuevo.",
      403: "No tienes permiso para realizar esta acción.",
      404: "El servicio solicitado no está disponible."
    }
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : (defaults[response.status] ??
          "No se pudo completar la solicitud. Inténtalo de nuevo.")
    const fields: Record<string, string> = {}
    if (
      body &&
      typeof body === "object" &&
      "detalles" in body &&
      Array.isArray(body.detalles)
    ) {
      for (const issue of body.detalles) {
        if (
          issue &&
          typeof issue.campo === "string" &&
          typeof issue.mensaje === "string"
        ) {
          fields[issue.campo] = validationMessage(issue.mensaje)
        }
      }
    }
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.location.replace("/login")
    }
    throw new ApiError(response.status, message, fields)
  }
  if (body === null)
    throw new ApiError(response.status, "El servidor devolvió una respuesta inválida.")
  return body as T
}

function isUsuario(value: unknown): value is Usuario {
  if (!value || typeof value !== "object") return false
  return (
    "id_usuario" in value &&
    typeof value.id_usuario === "number" &&
    "nombre" in value &&
    typeof value.nombre === "string" &&
    "apellido" in value &&
    typeof value.apellido === "string" &&
    "matricula" in value &&
    typeof value.matricula === "string" &&
    "estatus" in value &&
    typeof value.estatus === "string" &&
    "rol" in value &&
    (value.rol === null || typeof value.rol === "string") &&
    "id_rol" in value &&
    (value.id_rol === null || typeof value.id_rol === "number") &&
    "creado_en" in value &&
    typeof value.creado_en === "string" &&
    "tiene_foto" in value &&
    typeof value.tiene_foto === "boolean"
  )
}

export async function getCurrentUser(signal?: AbortSignal): Promise<Usuario> {
  const user = await request("/auth/me", { signal })
  if (!isUsuario(user))
    throw new ApiError(200, "El servidor devolvió un perfil de usuario inválido.")
  return user
}

export async function getUsers(
  signal?: AbortSignal,
  estatus = ""
): Promise<Usuario[]> {
  const users = await request(`/usuarios${query({ estatus })}`, { signal })
  if (!Array.isArray(users) || !users.every(isUsuario)) {
    throw new ApiError(200, "El servidor devolvió una lista de usuarios inválida.")
  }
  return users
}

export async function login(
  matricula: string,
  password: string
): Promise<void> {
  await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matricula: matricula.trim(), password })
  })
}

export type Signup = {
  nombre: string
  apellido: string
  matricula: string
  password: string
}

export async function signup(values: Signup): Promise<void> {
  const result = await request("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      matricula: values.matricula.trim(),
      password: values.password
    })
  })
  if (
    !result ||
    typeof result !== "object" ||
    !("id_usuario" in result) ||
    typeof result.id_usuario !== "number"
  ) {
    throw new ApiError(201, "El servidor devolvió una respuesta de registro inválida.")
  }
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" })
}

export type EstadoEspacio = "activo" | "inactivo" | "mantenimiento"
export type Espacio = {
  id_espacio: number
  nombre_espacio: string
  ubicacion: string | null
  capacidad: number
  ip_nodo_esp32: string | null
  estado_espacio: EstadoEspacio
  creado_en: string
}
export type DatosEspacio = Omit<
  Espacio,
  "id_espacio" | "creado_en" | "ubicacion" | "ip_nodo_esp32"
> & {
  ubicacion?: string
  ip_nodo_esp32?: string
}
export type EstadoReservacion =
  "creada" | "activa" | "finalizada" | "liberada" | "cancelada"
export type Reservacion = {
  id_reservacion: number
  id_usuario: number
  id_espacio: number
  nombre_espacio?: string
  hora_inicio: string
  hora_fin: string
  estado_reservacion: EstadoReservacion
  creada_en: string
}
export type Horario = { hora_inicio: string; hora_fin: string }
export type Sensor = "temperatura" | "humedad" | "proximidad"
export type EstadoSensor = {
  tipo_sensor: Sensor
  valor: number
  unidad: string
  registrado_en: string
}
export type Lectura = {
  id: number
  valor: number
  fecha: string
  id_espacio: number
}
export type Resumen = {
  usuarios: number
  espacios: number
  reservaciones: number
  accesos: number
}
export type Acceso = {
  id_acceso: number
  resultado: "permitido" | "denegado"
  metodo_utilizado: string
  motivo_denegacion: string | null
  fecha: string
  id_espacio: number | null
  nombre_espacio: string | null
  id_usuario: number | null
  usuario: string | null
  id_reservacion: number | null
}
export type PaginaAccesos = {
  datos: Acceso[]
  pagina: number
  limite: number
  total: number
}
export type FiltrosAccesos = {
  id_espacio?: number
  id_usuario?: number
  resultado?: "permitido" | "denegado"
  desde?: string
  hasta?: string
  pagina: number
  limite: number
}

function query(values: object): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  return params.size ? `?${params}` : ""
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }
}

export const getSpaces = (signal?: AbortSignal) =>
  request<Espacio[]>("/espacios", { signal })
export const createSpace = (data: DatosEspacio) =>
  request<{ id_espacio: number }>("/espacios", json("POST", data))
export const updateSpace = (id: number, data: Partial<DatosEspacio>) =>
  request<Espacio>(`/espacios/${id}`, json("PATCH", data))
export const deactivateSpace = (id: number) =>
  request<void>(`/espacios/${id}`, { method: "DELETE" })
export const getReservations = (signal?: AbortSignal) =>
  request<Reservacion[]>("/reservaciones", { signal })
export const createReservation = (id_espacio: number, horario: Horario) =>
  request<{ id_reservacion: number }>(
    "/reservaciones",
    json("POST", { id_espacio, ...horario })
  )
export const updateReservation = (id: number, horario: Horario) =>
  request<Horario & { id_reservacion: number }>(
    `/reservaciones/${id}`,
    json("PATCH", horario)
  )
export const cancelReservation = (id: number) =>
  request<void>(`/reservaciones/${id}`, { method: "DELETE" })

export async function getCurrentReservation(
  signal?: AbortSignal
): Promise<Reservacion | null> {
  try {
    return await request<Reservacion>("/reservaciones/actual", { signal })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export const getSummary = (signal?: AbortSignal) =>
  request<Resumen>("/resumen", { signal })
export const getSensorState = (id: number, signal?: AbortSignal) =>
  request<EstadoSensor[]>(`/espacios/${id}/estado`, { signal })
export const getReadings = (sensor: Sensor, id: number, signal?: AbortSignal) =>
  request<Lectura[]>(
    `/lecturas/${sensor}/recientes${query({ id_espacio: id, limite: 50 })}`,
    { signal }
  )
export const getAccessHistory = (
  filters: FiltrosAccesos,
  signal?: AbortSignal
) => request<PaginaAccesos>(`/accesos${query(filters)}`, { signal })

export type CambiosPerfil = {
  nombre?: string
  apellido?: string
  password?: string
  password_actual?: string
}
export type CambiosUsuario = {
  nombre?: string
  apellido?: string
  id_rol?: number
  estatus?: "activo" | "inactivo"
}
export const updateProfile = (id: number, data: CambiosPerfil) =>
  request<Usuario>(`/usuarios/${id}`, json("PATCH", data))
export const updateUser = (id: number, data: CambiosUsuario) =>
  request<Usuario>(`/usuarios/${id}`, json("PATCH", data))
export const deactivateUser = (id: number) =>
  request<void>(`/usuarios/${id}`, { method: "DELETE" })
export async function uploadPhoto(id: number, photo: File): Promise<void> {
  const body = new FormData()
  body.set("foto", photo)
  await request(`/usuarios/${id}/foto`, { method: "PUT", body })
}
export const deletePhoto = (id: number) =>
  request<void>(`/usuarios/${id}/foto`, { method: "DELETE" })
