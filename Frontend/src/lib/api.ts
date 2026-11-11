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

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fields = fields
  }
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      cache: "no-store",
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(0, "Cannot reach the API. Check that the backend is running and try again.")
  }

  if (response.status === 204) return undefined

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const defaults: Record<number, string> = {
      401: "Please sign in again. Your session is missing or has expired.",
      403: "An administrator account is required to view this page.",
      404: "The requested API endpoint is unavailable.",
    }
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : defaults[response.status] ?? "The API request failed. Please try again."
    const fields: Record<string, string> = {}
    if (body && typeof body === "object" && "detalles" in body && Array.isArray(body.detalles)) {
      for (const issue of body.detalles) {
        if (issue && typeof issue.campo === "string" && typeof issue.mensaje === "string") {
          fields[issue.campo] = issue.mensaje
        }
      }
    }
    throw new ApiError(response.status, message, fields)
  }
  if (body === null) throw new ApiError(response.status, "The API returned an invalid response.")
  return body
}

function isUsuario(value: unknown): value is Usuario {
  if (!value || typeof value !== "object") return false
  return "id_usuario" in value && typeof value.id_usuario === "number"
    && "nombre" in value && typeof value.nombre === "string"
    && "apellido" in value && typeof value.apellido === "string"
    && "matricula" in value && typeof value.matricula === "string"
    && "estatus" in value && typeof value.estatus === "string"
    && "rol" in value && (value.rol === null || typeof value.rol === "string")
    && "id_rol" in value && (value.id_rol === null || typeof value.id_rol === "number")
    && "creado_en" in value && typeof value.creado_en === "string"
    && "tiene_foto" in value && typeof value.tiene_foto === "boolean"
}

export async function getCurrentUser(signal?: AbortSignal): Promise<Usuario> {
  const user = await request("/auth/me", { signal })
  if (!isUsuario(user)) throw new ApiError(200, "The API returned an invalid user profile.")
  return user
}

export async function getUsers(signal?: AbortSignal): Promise<Usuario[]> {
  const users = await request("/usuarios", { signal })
  if (!Array.isArray(users) || !users.every(isUsuario)) {
    throw new ApiError(200, "The API returned an invalid user list.")
  }
  return users
}

export async function login(matricula: string, password: string): Promise<void> {
  await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matricula: matricula.trim(), password }),
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
      password: values.password,
    }),
  })
  if (!result || typeof result !== "object" || !("id_usuario" in result) || typeof result.id_usuario !== "number") {
    throw new ApiError(201, "The API returned an invalid signup response.")
  }
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" })
}
