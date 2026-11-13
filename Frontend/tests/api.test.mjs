import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { readFile } from "node:fs/promises"
import ts from "typescript"

async function loadModule(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8")
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext
    }
  })
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  )
}

const api = await loadModule("../src/lib/api.ts")
const booking = await loadModule("../src/lib/booking.ts")
const originalFetch = globalThis.fetch
const originalWindow = globalThis.window
afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.window = originalWindow
})

function respond(body, status = 200) {
  globalThis.fetch = async () =>
    new Response(status === 204 ? null : JSON.stringify(body), { status })
}

test("missing current reservation is an empty state, while server failures remain errors", async () => {
  respond({ mensaje: "No hay reservaciones activas" }, 404)
  assert.equal(await api.getCurrentReservation(), null)
  respond({ error: "Error interno del servidor" }, 500)
  await assert.rejects(api.getCurrentReservation(), { status: 500 })
})

test("booking sends UTC dates, numeric space ID, and cookie credentials without unsupported fields", async () => {
  const times = booking.bookingTimes(
    "2030-11-15T10:00:00-06:00",
    "2030-11-15T11:00:00-06:00",
    0
  )
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/reservaciones")
    assert.equal(options.credentials, "include")
    assert.equal(options.method, "POST")
    assert.deepEqual(JSON.parse(options.body), {
      id_espacio: 3,
      hora_inicio: "2030-11-15T16:00:00.000Z",
      hora_fin: "2030-11-15T17:00:00.000Z"
    })
    return new Response(JSON.stringify({ id_reservacion: 10 }), { status: 201 })
  }
  assert.deepEqual(await api.createReservation(3, times), {
    id_reservacion: 10
  })
})

test("conflicts and field validation errors retain the backend's actionable details", async () => {
  respond({ error: "El horario se empalma con otra reservación" }, 409)
  await assert.rejects(api.createReservation(1, {}), {
    status: 409,
    message: "El horario se empalma con otra reservación"
  })
  respond(
    {
      error: "Datos inválidos",
      detalles: [
        { campo: "hora_fin", mensaje: "La hora de fin debe ser posterior" }
      ]
    },
    400
  )
  await assert.rejects(
    api.updateReservation(1, {}),
    (error) => error.fields.hora_fin === "La hora de fin debe ser posterior"
  )
})

test("expired sessions redirect to login; forbidden actions stay on the page", async () => {
  const redirects = []
  globalThis.window = { location: { replace: (url) => redirects.push(url) } }
  respond({ error: "Sesión inválida o expirada" }, 401)
  await assert.rejects(api.getSpaces(), { status: 401 })
  assert.deepEqual(redirects, ["/login"])
  respond({ error: "Sin permisos" }, 403)
  await assert.rejects(api.updateUser(2, { id_rol: 1 }), { status: 403 })
  assert.equal(redirects.length, 1)
})

test("history filters preserve pagination and omit empty filters", async () => {
  globalThis.fetch = async (url) => {
    const params = new URL(url, "http://localhost").searchParams
    assert.equal(params.get("pagina"), "2")
    assert.equal(params.get("limite"), "20")
    assert.equal(params.get("resultado"), "denegado")
    assert.equal(params.has("id_usuario"), false)
    return new Response(
      JSON.stringify({ datos: [], pagina: 2, limite: 20, total: 21 })
    )
  }
  await api.getAccessHistory({ pagina: 2, limite: 20, resultado: "denegado" })
})

test("photo uploads use multipart foto and successful delete responses need no JSON body", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/usuarios/2/foto")
    assert.ok(options.body instanceof FormData)
    assert.equal(options.body.get("foto").name, "photo.png")
    assert.equal(options.headers, undefined)
    return new Response(null, { status: 204 })
  }
  await api.uploadPhoto(
    2,
    new File(["image"], "photo.png", { type: "image/png" })
  )
  respond(null, 204)
  assert.equal(await api.cancelReservation(1), undefined)
})

test("booking rejects invalid, reversed, and past times while allowing the backend's one-minute clock margin", () => {
  const now = Date.parse("2030-01-01T12:00:00Z")
  assert.throws(() => booking.bookingTimes("", "", now), /inicio y una hora de fin válidas/)
  assert.throws(
    () => booking.bookingTimes("2030-01-01T13:00Z", "2030-01-01T12:00Z", now),
    /posterior a la hora de inicio/
  )
  assert.throws(
    () => booking.bookingTimes("2030-01-01T11:58Z", "2030-01-01T13:00Z", now),
    /pasado/
  )
  assert.doesNotThrow(() =>
    booking.bookingTimes("2030-01-01T11:59:30Z", "2030-01-01T13:00Z", now)
  )
  const local = booking.toLocalInput("2030-01-01T12:00:00Z")
  assert.equal(new Date(local).toISOString(), "2030-01-01T12:00:00.000Z")
})

test("reservation actions follow backend states", () => {
  for (const state of [
    "creada",
    "activa",
    "finalizada",
    "liberada",
    "cancelada"
  ]) {
    assert.equal(booking.canReschedule(state), state === "creada")
    assert.equal(
      booking.canCancel(state),
      state === "creada" || state === "activa"
    )
  }
})

test("photos enforce format and size before upload", () => {
  assert.throws(
    () =>
      booking.validatePhoto(new File([], "empty.png", { type: "image/png" })),
    /elige una foto/
  )
  assert.throws(
    () =>
      booking.validatePhoto(
        new File(["gif"], "photo.gif", { type: "image/gif" })
      ),
    /JPG o PNG/
  )
  assert.throws(
    () =>
      booking.validatePhoto(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png"
        })
      ),
    /2 MB/
  )
  assert.doesNotThrow(() =>
    booking.validatePhoto(new File(["png"], "photo.png", { type: "image/png" }))
  )
})


test("English validator details become Spanish without changing API field keys", async () => {
  const cases = [
    ["Too small: expected string to have >=8 characters", "Usa al menos 8 caracteres."],
    ["Too big: expected string to have <=100 characters", "Usa como máximo 100 caracteres."],
    ["Too small: expected number to be >0", "Ingresa un número mayor que 0."],
    ["Too big: expected number to be <=100", "Ingresa un número menor o igual que 100."],
    ["Invalid input: expected int, received number", "Ingresa un número entero válido."],
    ['Invalid option: expected one of "activo"|"inactivo"', "Selecciona una opción válida."],
    ["Invalid input: expected date, received string", "El valor ingresado no es válido."],
    ["Unrecognized key: extra", "El valor ingresado no es válido."],
    ["This value must be valid", "Revisa el valor de este campo."],
    ["La hora de fin debe ser posterior", "La hora de fin debe ser posterior"],
    ["Para cambiar la contraseña envía password_actual", "Ingresa tu contraseña actual para cambiarla."]
  ]
  for (const [mensaje, expected] of cases) {
    respond({ error: "Datos inválidos", detalles: [{ campo: "hora_fin", mensaje }] }, 400)
    await assert.rejects(api.updateReservation(1, {}), (error) => {
      assert.equal(error.status, 400)
      assert.equal(error.message, "Datos inválidos")
      assert.deepEqual(error.fields, { hora_fin: expected })
      return true
    })
  }
})

test("network, HTTP fallback, and malformed response errors are Spanish", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch") }
  await assert.rejects(api.getSpaces(), { status: 0, message: "No se pudo conectar con el servidor. Inténtalo de nuevo." })
  for (const [status, message] of [
    [401, "Tu sesión no está disponible o ha expirado. Inicia sesión de nuevo."],
    [403, "No tienes permiso para realizar esta acción."],
    [404, "El servicio solicitado no está disponible."],
    [500, "No se pudo completar la solicitud. Inténtalo de nuevo."]
  ]) {
    respond({}, status)
    await assert.rejects(api.login("A00002", "password"), { status, message })
  }
  globalThis.fetch = async () => new Response("invalid JSON", { status: 200 })
  await assert.rejects(api.getSpaces(), { message: "El servidor devolvió una respuesta inválida." })
})
