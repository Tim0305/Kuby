import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createServer as createHttpServer } from "node:http"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium, expect } from "@playwright/test"
import { createServer as createViteServer } from "vite"

// Isolated, in-memory API: browser tests never read credentials or change the real database.
const frontend = fileURLToPath(new URL("../", import.meta.url))
const screenshotDirectory = fileURLToPath(
  new URL("../test-results/", import.meta.url)
)
const stamp = "2035-11-15T16:00:00.000Z"
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
  "base64"
)
let browser, vite, origin, fixture
let requests = []

function resetFixture() {
  fixture = {
    conflict: false,
    expired: false,
    users: [
      {
        id_usuario: 1,
        nombre: "Alex",
        apellido: "Admin",
        matricula: "ADMIN",
        estatus: "activo",
        id_rol: 1,
        rol: "admin",
        creado_en: stamp,
        tiene_foto: false
      },
      {
        id_usuario: 2,
        nombre: "Sam",
        apellido: "Student",
        matricula: "A00002",
        estatus: "activo",
        id_rol: 2,
        rol: "usuario",
        creado_en: stamp,
        tiene_foto: false
      },
      {
        id_usuario: 3,
        nombre: "Alex",
        apellido: "Super",
        matricula: "SUPERADMIN",
        estatus: "activo",
        id_rol: 3,
        rol: "superadmin",
        creado_en: stamp,
        tiene_foto: false
      }
    ],
    spaces: [
      {
        id_espacio: 1,
        nombre_espacio: "Library One",
        ubicacion: "Library, floor 2",
        capacidad: 4,
        estado_espacio: "activo",
        ip_nodo_esp32: null,
        creado_en: stamp
      },
      {
        id_espacio: 2,
        nombre_espacio: "Library Two",
        ubicacion: null,
        capacidad: 2,
        estado_espacio: "mantenimiento",
        ip_nodo_esp32: null,
        creado_en: stamp
      }
    ],
    reservations: [
      "creada",
      "activa",
      "finalizada",
      "liberada",
      "cancelada"
    ].map((estado, index) => ({
      id_reservacion: index + 1,
      id_usuario: 2,
      id_espacio: 1,
      nombre_espacio: "Library One",
      hora_inicio: stamp,
      hora_fin: "2035-11-15T17:00:00.000Z",
      estado_reservacion: estado,
      creada_en: stamp
    })),
    accesses: Array.from({ length: 21 }, (_, i) => ({
      id_acceso: i + 1,
      resultado: i === 0 ? "denegado" : "permitido",
      metodo_utilizado: "qr",
      motivo_denegacion: i === 0 ? "sin_reservacion_vigente" : null,
      fecha: stamp,
      id_espacio: 1,
      nombre_espacio: "Library One",
      id_usuario: 2,
      usuario: "Sam Student",
      id_reservacion: 1
    }))
  }
  requests = []
}

const api = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://fixture")
    const route = url.pathname.replace(/^\/api/, "")
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks)
    const data = req.headers["content-type"]?.includes("application/json")
      ? JSON.parse(raw.toString())
      : {}
    requests.push({ route, method: req.method, data, query: url.searchParams })
    const role = req.headers.cookie?.match(/fixture-role=([^;]+)/)?.[1]
    const admin = role === "admin" || role === "superadmin"
    const superadmin = role === "superadmin"
    const userId = superadmin ? 3 : admin ? 1 : 2
    const send = (body, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(status === 204 ? undefined : JSON.stringify(body))
    }
    if (route === "/auth/logout") {
      fixture.expired = true
      return send(null, 204)
    }
    if (fixture.expired) return send({ error: "Sesión inválida o expirada" }, 401)
    if (route === "/auth/me")
      return send(fixture.users.find((user) => user.id_usuario === userId))
    if (route === "/resumen")
      return admin
        ? send({
            usuarios: fixture.users.length,
            espacios: fixture.spaces.length,
            reservaciones: fixture.reservations.length,
            accesos: fixture.accesses.length
          })
        : send({ error: "Sin permisos" }, 403)
    if (route === "/reservaciones/actual") {
      const reservation = fixture.reservations.find(
        (r) =>
          r.id_usuario === userId &&
          ["creada", "activa"].includes(r.estado_reservacion)
      )
      return send(
        reservation ?? { mensaje: "No hay reservaciones activas" },
        reservation ? 200 : 404
      )
    }
    if (route === "/reservaciones" && req.method === "GET")
      return send(
        fixture.reservations.filter((r) => admin || r.id_usuario === userId)
      )
    if (route === "/reservaciones" && req.method === "POST") {
      if (fixture.conflict)
        return send(
          { error: "El horario se empalma con otra reservación" },
          409
        )
      const id = fixture.reservations.length + 1
      fixture.reservations.push({
        ...data,
        id_reservacion: id,
        id_usuario: userId,
        nombre_espacio: fixture.spaces.find(
          (space) => space.id_espacio === data.id_espacio
        ).nombre_espacio,
        estado_reservacion: "creada",
        creada_en: stamp
      })
      return send({ id_reservacion: id }, 201)
    }
    if (/^\/reservaciones\/\d+$/.test(route)) {
      const reservation = fixture.reservations.find(
        (r) => r.id_reservacion === Number(route.split("/")[2])
      )
      if (req.method === "DELETE") {
        reservation.estado_reservacion = "cancelada"
        return send(null, 204)
      }
      Object.assign(reservation, data)
      return send({ id_reservacion: reservation.id_reservacion, ...data })
    }
    if (route === "/espacios" && req.method === "GET")
      return send(fixture.spaces)
    if (route === "/espacios" && req.method === "POST") {
      const id = fixture.spaces.length + 1
      fixture.spaces.push({ ...data, id_espacio: id, creado_en: stamp })
      return send({ id_espacio: id }, 201)
    }
    if (/^\/espacios\/\d+\/estado$/.test(route))
      return send(
        route.includes("/2/")
          ? []
          : [
              {
                tipo_sensor: "temperatura",
                valor: 24.5,
                unidad: "°C",
                registrado_en: stamp
              },
              {
                tipo_sensor: "humedad",
                valor: 55,
                unidad: "%",
                registrado_en: stamp
              },
              {
                tipo_sensor: "proximidad",
                valor: 1,
                unidad: "bool",
                registrado_en: stamp
              }
            ]
      )
    if (/^\/espacios\/\d+$/.test(route)) {
      const space = fixture.spaces.find(
        (space) => space.id_espacio === Number(route.split("/")[2])
      )
      if (req.method === "DELETE") {
        space.estado_espacio = "inactivo"
        return send(null, 204)
      }
      Object.assign(space, data)
      return send(space)
    }
    if (route.startsWith("/lecturas/"))
      return send(
        url.searchParams.get("id_espacio") === "2"
          ? []
          : Array.from({ length: 3 }, (_, i) => ({
              id: i + 1,
              valor: route.includes("proximidad") ? i % 2 : 24.5 + i,
              fecha: new Date(Date.parse(stamp) - i * 60_000).toISOString(),
              id_espacio: 1
            }))
      )
    if (route === "/accesos") {
      const rows = fixture.accesses.filter(
        (row) =>
          (!url.searchParams.get("resultado") ||
            row.resultado === url.searchParams.get("resultado")) &&
          (!url.searchParams.get("id_espacio") ||
            row.id_espacio === Number(url.searchParams.get("id_espacio"))) &&
          (!admin ||
            !url.searchParams.get("id_usuario") ||
            row.id_usuario === Number(url.searchParams.get("id_usuario")))
      )
      const page = Number(url.searchParams.get("pagina") ?? 1)
      const limit = Number(url.searchParams.get("limite") ?? 20)
      return send({
        datos: rows.slice((page - 1) * limit, page * limit),
        pagina: page,
        limite: limit,
        total: rows.length
      })
    }
    if (route === "/usuarios")
      return send(
        fixture.users.filter(
          (user) =>
            !url.searchParams.get("estatus") ||
            user.estatus === url.searchParams.get("estatus")
        )
      )
    if (/^\/usuarios\/\d+\/foto$/.test(route)) {
      const user = fixture.users.find(
        (user) => user.id_usuario === Number(route.split("/")[2])
      )
      if (req.method === "GET") {
        res.writeHead(200, { "Content-Type": "image/png" })
        return res.end(png)
      }
      user.tiene_foto = req.method !== "DELETE"
      return send(null, 204)
    }
    if (/^\/usuarios\/\d+$/.test(route)) {
      const user = fixture.users.find(
        (user) => user.id_usuario === Number(route.split("/")[2])
      )
      if (req.method === "DELETE") {
        user.estatus = "inactivo"
        return send(null, 204)
      }
      if (data.id_rol !== undefined && !superadmin)
        return send({ error: "Sin permisos" }, 403)
      if (data.password_actual === "wrong")
        return send({ error: "La contraseña actual es incorrecta" }, 403)
      for (const key of ["nombre", "apellido", "estatus", "id_rol"])
        if (data[key] !== undefined) user[key] = data[key]
      user.rol = user.id_rol === 1 ? "admin" : user.id_rol === 3 ? "superadmin" : "usuario"
      return send(user)
    }
    send({ error: "Servicio de prueba no disponible" }, 404)
  } catch (error) {
    res.writeHead(500)
    res.end(String(error))
  }
})

before(async () => {
  resetFixture()
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve))
  vite = await createViteServer({
    root: frontend,
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    logLevel: "error",
    server: {
      port: 0,
      host: "127.0.0.1",
      proxy: { "/api": `http://127.0.0.1:${api.address().port}` }
    }
  })
  await vite.listen()
  origin = vite.resolvedUrls.local[0]
  browser = await chromium.launch({ headless: true })
  await mkdir(screenshotDirectory, { recursive: true })
})

after(async () => {
  await browser?.close()
  await vite?.close()
  await new Promise((resolve) => api.close(resolve))
})

async function openPage(
  admin = false,
  viewport = { width: 1440, height: 1000 },
  role = admin ? "admin" : null
) {
  resetFixture()
  const context = await browser.newContext({
    viewport,
    timezoneId: "America/Mexico_City",
    locale: "en-US",
    reducedMotion: "reduce"
  })
  if (role)
    await context.addCookies([
      { name: "fixture-role", value: role, url: origin }
    ])
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(origin + (admin ? "admin" : ""))
  await expect(
    page.getByRole("heading", {
      name: admin ? "Resumen del campus" : "Hola, Sam."
    })
  ).toBeVisible()
  return { page, context, errors }
}

test(
  "student books a cubicle, recovers from a conflict, and sees the updated reservation",
  { timeout: 60_000 },
  async () => {
    const { page, context, errors } = await openPage()
    try {
      await expect(page.locator("html")).toHaveAttribute("lang", "es-MX")
      await expect(page.locator("#reservations time").first()).toHaveText(
        new Date(stamp).toLocaleString("es-MX", {
          dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City"
        })
      )
      await expect(
        page.getByRole("link", { name: "Usuarios", exact: true })
      ).toHaveCount(0)
      await expect(
        page.getByRole("button", { name: "No disponible", exact: true })
      ).toBeDisabled()
      await page
        .getByRole("button", { name: "Reservar cubículo", exact: true })
        .click()
      const dialog = page.getByRole("dialog")
      await dialog
        .getByLabel("Fecha y hora de inicio", { exact: true })
        .fill("2035-11-16T10:00")
      await dialog
        .getByLabel("Fecha y hora de fin", { exact: true })
        .fill("2035-11-16T11:00")
      fixture.conflict = true
      await dialog
        .getByRole("button", { name: "Confirmar reservación", exact: true })
        .click()
      await expect(dialog.getByRole("alert")).toContainText("empalma")
      await expect(
        dialog.getByLabel("Fecha y hora de inicio", { exact: true })
      ).toHaveValue("2035-11-16T10:00")
      fixture.conflict = false
      await dialog
        .getByRole("button", { name: "Confirmar reservación", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      await expect(page.locator("#reservations tbody tr")).toHaveCount(6)
      const creation = requests.findLast(
        (r) => r.method === "POST" && r.route === "/reservaciones"
      )
      assert.equal(creation.data.hora_inicio, "2035-11-16T16:00:00.000Z")
      assert.equal(creation.data.id_espacio, 1)
      assert.deepEqual(errors, [])
      await page.screenshot({
        path: screenshotDirectory + "student-desktop.png"
      })
    } finally {
      await context.close()
    }
  }
)

test(
  "reservation states limit actions; rescheduling and cancelling refresh the list",
  { timeout: 60_000 },
  async () => {
    const { page, context } = await openPage()
    try {
      const table = page.locator("#reservations")
      await expect(
        table.getByRole("button", { name: "Reprogramar", exact: true })
      ).toHaveCount(1)
      await expect(
        table.getByRole("button", { name: "Cancelar reservación", exact: true })
      ).toHaveCount(2)
      await table
        .getByRole("button", { name: "Reprogramar", exact: true })
        .click()
      let dialog = page.getByRole("dialog")
      await dialog
        .getByLabel("Fecha y hora de fin", { exact: true })
        .fill("2035-11-15T09:00")
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(dialog.getByRole("alert")).toContainText("posterior al inicio")
      await dialog
        .getByLabel("Fecha y hora de fin", { exact: true })
        .fill("2035-11-15T12:00")
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      assert.equal(fixture.reservations[0].hora_fin, "2035-11-15T18:00:00.000Z")
      await table
        .getByRole("row")
        .filter({ hasText: "Próxima" })
        .getByRole("button", { name: "Cancelar reservación", exact: true })
        .click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("button", { name: "Cancelar reservación", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      await expect(
        table.getByRole("button", { name: "Reprogramar", exact: true })
      ).toHaveCount(0)
      assert.equal(fixture.reservations[0].estado_reservacion, "cancelada")
    } finally {
      await context.close()
    }
  }
)

test(
  "admin manages cubicles and users, including reactivation and self-edit restrictions",
  { timeout: 60_000 },
  async () => {
    const { page, context, errors } = await openPage(true)
    try {
      await expect(page.getByLabel("Totales de administración")).toContainText(
        "Intentos de acceso"
      )
      await page.screenshot({ path: screenshotDirectory + "admin-desktop.png" })
      await page
        .getByRole("button", { name: "Nuevo cubículo", exact: true })
        .click()
      let dialog = page.getByRole("dialog")
      await dialog.getByLabel("Nombre", { exact: true }).fill("Team nook")
      await dialog.getByLabel("Capacidad (personas)", { exact: true }).fill("0")
      await dialog.getByRole("button", { name: "Crear cubículo", exact: true }).click()
      assert.equal(await dialog.getByLabel("Capacidad (personas)", { exact: true }).evaluate(input => input.validationMessage), "El valor mínimo es 1.")
      assert.equal(requests.filter(r => r.route === "/espacios" && r.method === "POST").length, 0)
      await dialog.getByLabel("Capacidad (personas)", { exact: true }).fill("6")
      await dialog
        .getByRole("button", { name: "Crear cubículo", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      const nook = page
        .locator("#spaces [data-slot=card]")
        .filter({ hasText: "Team nook" })
      await expect(nook).toContainText("Hasta 6 personas")
      await nook
        .getByRole("button", { name: "Desactivar", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Desactivar", exact: true })
        .click()
      await expect(
        nook.getByRole("button", { name: "No disponible", exact: true })
      ).toBeDisabled()
      await nook.getByRole("button", { name: "Editar", exact: true }).click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("combobox", { name: "Estado del cubículo", exact: true })
        .click()
      await page.getByRole("option", { name: "Activo", exact: true }).click()
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(
        nook.getByRole("button", { name: "Reservar cubículo", exact: true })
      ).toBeEnabled()
      const accounts = page.locator("#users")
      const own = accounts.getByRole("row").filter({ hasText: "Alex Admin" })
      await expect(
        own.getByRole("link", { name: "Editar mi perfil", exact: true })
      ).toBeVisible()
      await expect(
        own.getByRole("button", { name: "Desactivar usuario", exact: true })
      ).toHaveCount(0)
      let student = accounts.getByRole("row").filter({ hasText: "Sam Student" })
      await student.getByRole("button", { name: "Editar", exact: true }).click()
      dialog = page.getByRole("dialog")
      await expect(
        dialog.getByRole("combobox", { name: "Rol", exact: true })
      ).toHaveCount(0)
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(student).toContainText("Usuario")
      assert.equal(fixture.users[1].id_rol, 2)
      await student
        .getByRole("button", { name: "Desactivar usuario", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Desactivar usuario", exact: true })
        .click()
      await expect(student).toContainText("Inactivo")
      await page
        .getByRole("combobox", { name: "Filtrar usuarios por estado", exact: true })
        .click()
      await page.getByRole("option", { name: "Inactivo", exact: true }).click()
      await expect(accounts.locator("tbody tr")).toHaveCount(1)
      student = accounts.getByRole("row").filter({ hasText: "Sam Student" })
      await student.getByRole("button", { name: "Editar", exact: true }).click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("combobox", { name: "Estado del usuario", exact: true })
        .click()
      await page.getByRole("option", { name: "Activo", exact: true }).click()
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(accounts).toContainText("No hay usuarios con este estado. Prueba otro filtro.")
      assert.equal(fixture.users[1].estatus, "activo")
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
)

test(
  "superadmin can assign roles while the protected account stays read-only",
  { timeout: 60_000 },
  async () => {
    const { page, context, errors } = await openPage(
      true,
      { width: 1440, height: 1000 },
      "superadmin"
    )
    try {
      const accounts = page.locator("#users")
      await expect(accounts.getByText("Superadministrador", { exact: true })).toBeVisible()
      const own = accounts.getByRole("row").filter({ hasText: "Alex Super" })
      await expect(own.getByRole("button", { name: "Editar", exact: true })).toHaveCount(0)
      await expect(own.getByRole("button", { name: "Desactivar usuario", exact: true })).toHaveCount(0)

      const student = accounts.getByRole("row").filter({ hasText: "Sam Student" })
      await student.getByRole("button", { name: "Editar", exact: true }).click()
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("combobox", { name: "Rol", exact: true }).click()
      await page.getByRole("option", { name: "Administrador", exact: true }).click()
      await dialog.getByRole("button", { name: "Guardar cambios", exact: true }).click()
      await expect(student).toContainText("Administrador")
      assert.equal(fixture.users[1].id_rol, 1)
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
)

test(
  "sensors, access filters, pagination, and mobile layout work",
  { timeout: 60_000 },
  async () => {
    const { page, context, errors } = await openPage(false, {
      width: 390,
      height: 844
    })
    try {
      await page.screenshot({
        path: screenshotDirectory + "student-mobile.png"
      })
      const conditions = page.locator("#sensors")
      await expect(conditions).toContainText("24.5 °C")
      await page
        .getByRole("button", { name: "Mostrar u ocultar menú", exact: true })
        .click()
      const navigation = page.getByRole("dialog")
      await expect(navigation).toBeVisible()
      await navigation
        .getByRole("link", { name: "Condiciones", exact: true })
        .click()
      await expect(navigation).toHaveCount(0)
      await expect(page).toHaveURL(origin + "#sensors")
      await page
        .getByRole("combobox", {
          name: "Cubículo para consultar lecturas",
          exact: true
        })
        .click()
      await page
        .getByRole("option", { name: "Library Two", exact: true })
        .click()
      await expect(conditions).toContainText(
        "Sin lecturas de temperatura en este cubículo."
      )
      await page
        .getByRole("combobox", {
          name: "Cubículo para consultar lecturas",
          exact: true
        })
        .click()
      await page
        .getByRole("option", { name: "Library One", exact: true })
        .click()
      await page
        .getByRole("combobox", { name: "Historial del sensor", exact: true })
        .click()
      await page.getByRole("option", { name: "Humedad", exact: true }).click()
      await expect(conditions.locator("tbody")).toContainText("%")
      const history = page.locator("#access")
      await history
        .getByRole("combobox", { name: "Filtrar accesos por resultado", exact: true })
        .click()
      await page.getByRole("option", { name: "Denegado", exact: true }).click()
      await history
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click()
      await expect(history.locator("tbody tr")).toHaveCount(1)
      await expect(history).toContainText("Sin reservación vigente")
      await history
        .getByRole("combobox", { name: "Filtrar accesos por resultado", exact: true })
        .click()
      await page
        .getByRole("option", { name: "Todos los resultados", exact: true })
        .click()
      await history
        .getByRole("button", { name: "Aplicar filtros", exact: true })
        .click()
      await expect(history.locator("tbody tr")).toHaveCount(20)
      await history.getByRole("button", { name: "Siguiente", exact: true }).click()
      await expect(history).toContainText("Página 2 de 2")
      await expect(history.locator("tbody tr")).toHaveCount(1)
      assert.ok(
        requests.some(
          (r) => r.route === "/accesos" && r.query.get("pagina") === "2"
        )
      )
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      )
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
)

test(
  "profile editing, password errors, photo validation, and session expiry",
  { timeout: 60_000 },
  async () => {
    const { page, context } = await openPage()
    try {
      const profile = page.locator("#profile")
      await profile
        .getByLabel("Nombre del perfil", { exact: true })
        .fill("Taylor")
      await profile
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click()
      await expect(
        page.getByRole("heading", { name: "Hola, Taylor." })
      ).toBeVisible()
      await profile
        .getByLabel("Contraseña actual", { exact: true })
        .fill("wrong")
      await profile
        .getByLabel("Nueva contraseña", { exact: true })
        .fill("NewPassword123")
      await profile
        .getByLabel("Confirmar nueva contraseña", { exact: true })
        .fill("NewPassword123")
      await profile
        .getByRole("button", { name: "Actualizar contraseña", exact: true })
        .click()
      await expect(profile.getByRole("alert")).toContainText(
        "contraseña actual"
      )
      await page.route("**/api/usuarios/2", route => route.fulfill({
        status: 400,
        json: { error: "Datos inválidos", detalles: [{ campo: "password_actual", mensaje: "Invalid input: expected string, received undefined" }] }
      }))
      await profile.getByRole("button", { name: "Actualizar contraseña", exact: true }).click()
      await expect(profile.getByRole("alert").last()).toHaveText("Contraseña actual: El valor ingresado no es válido.")
      await page.unroute("**/api/usuarios/2")
      await expect(profile.getByText("Seleccionar archivo", { exact: true })).toBeVisible()
      await expect(profile.getByText("Sin archivo", { exact: true })).toBeVisible()
      const upload = profile.getByLabel("Elegir foto", { exact: true })
      await upload.setInputFiles({
        name: "photo.gif",
        mimeType: "image/gif",
        buffer: Buffer.from("gif")
      })
      await expect(profile.getByText("photo.gif", { exact: true })).toBeVisible()
      await profile
        .getByRole("button", { name: "Subir foto", exact: true })
        .click()
      await expect(
        profile.getByText("Elige una foto JPG o PNG.", { exact: true })
      ).toBeVisible()
      await upload.setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: png
      })
      await profile
        .getByRole("button", { name: "Subir foto", exact: true })
        .click()
      await expect(
        profile.getByRole("button", { name: "Eliminar foto", exact: true })
      ).toBeVisible()
      await profile
        .getByRole("button", { name: "Eliminar foto", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Eliminar foto", exact: true })
        .click()
      await expect(
        profile.getByRole("button", { name: "Eliminar foto", exact: true })
      ).toHaveCount(0)
      await expect(profile.getByText("Sin archivo", { exact: true })).toBeVisible()
      await page.setViewportSize({ width: 390, height: 844 })
      await profile.screenshot({ path: screenshotDirectory + "profile-mobile.png" })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      fixture.expired = true
      await page
        .locator("#reservations")
        .getByRole("button", { name: "Actualizar", exact: true })
        .click()
      await expect(page).toHaveURL(origin + "login")
      await expect(
        page.getByRole("button", { name: "Iniciar sesión", exact: true })
      ).toBeVisible()
    } finally {
      await context.close()
    }
  }
)


test("authentication stays Spanish in an English browser, including validation and signup retry", { timeout: 60_000 }, async () => {
  resetFixture()
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  let signedIn = false
  let failNextLogin = false
  let creations = 0
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/auth/me", route => route.fulfill({
    status: signedIn ? 200 : 401,
    json: signedIn ? fixture.users[1] : { error: "No autenticado" }
  }))
  await page.route("**/api/auth/login", route => {
    if (failNextLogin || route.request().postDataJSON().password === "wrong") {
      failNextLogin = false
      return route.fulfill({ status: 401, json: { error: "Matrícula o contraseña incorrectas" } })
    }
    signedIn = true
    return route.fulfill({ status: 204 })
  })
  await page.route("**/api/auth/signup", route => {
    creations++
    assert.deepEqual(route.request().postDataJSON(), {
      nombre: "Sam", apellido: "Student", matricula: "A00002", password: "Password123"
    })
    failNextLogin = true
    return route.fulfill({ status: 201, json: { id_usuario: 2 } })
  })
  try {
    await page.goto(origin + "login")
    await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible()
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click()
    const matricula = page.getByLabel("Matrícula", { exact: true })
    assert.equal(await matricula.evaluate(input => input.validationMessage), "Completa este campo.")
    await matricula.fill("A00002")
    assert.equal(await matricula.evaluate(input => input.validationMessage), "")
    const password = page.getByLabel("Contraseña", { exact: true })
    await password.fill("wrong")
    await expect(password).toHaveAttribute("type", "password")
    await page.getByRole("button", { name: "Mostrar contraseña", exact: true }).click()
    await expect(password).toHaveAttribute("type", "text")
    await page.getByRole("button", { name: "Ocultar contraseña", exact: true }).click()
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Matrícula o contraseña incorrectas")
    await page.screenshot({ path: screenshotDirectory + "login-mobile.png" })
    await password.fill("Password123")
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Hola, Sam." })).toBeVisible()

    signedIn = false
    await page.goto(origin + "signup")
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible()
    await page.getByLabel("Nombre", { exact: true }).fill("Sam")
    await page.getByLabel("Apellido", { exact: true }).fill("Student")
    await page.getByLabel("Matrícula", { exact: true }).fill("A00002")
    await page.getByLabel("Contraseña", { exact: true }).fill("Password123")
    await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Different123")
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click()
    await expect(page.getByRole("alert")).toHaveText("Las contraseñas no coinciden.")
    await page.screenshot({ path: screenshotDirectory + "signup-mobile.png" })
    await page.getByLabel("Confirmar contraseña", { exact: true }).fill("Password123")
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click()
    await expect(page.getByRole("status")).toHaveText("Cuenta creada. Inicia sesión para continuar.")
    await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeEnabled()
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Hola, Sam." })).toBeVisible()
    assert.equal(creations, 1)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
})


test('dashboard responsive audit keeps navigation and content usable at every breakpoint', { timeout: 120_000 }, async () => {
  const { writeFile } = await import('node:fs/promises')
  const auditDir = process.env.TASTE_AUDIT_DIR
  const measurements = []
  if (auditDir) await mkdir(auditDir, { recursive: true })
  for (const admin of [false, true]) {
    const { page, context, errors } = await openPage(admin)
    try {
      await expect(page.locator('#sensors')).toContainText('24.5 °C')
      await page.evaluate(() => document.fonts.ready)
      for (const [width, height] of [[1440,900],[1024,768],[820,1180],[768,1024],[390,844],[320,844]]) {
        await page.setViewportSize({ width, height })
        await page.evaluate(() => window.scrollTo(0,0))
        await expect(page.locator('#spaces [data-slot=card]')).toHaveCount(2)
        const measurement = await page.evaluate(() => {
          const rect = el => { const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y+scrollY),width:Math.round(r.width),height:Math.round(r.height)} }
          const textStyle = el => {const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,color:s.color,background:s.backgroundColor}}
          return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,heading:rect(document.querySelector('h1')),headingStyle:textStyle(document.querySelector('h1')),bodyStyle:textStyle(document.body),sections:[...document.querySelectorAll('section[id]')].map(el=>({id:el.id,...rect(el)})),cardsAboveFold:[...document.querySelectorAll('[data-slot=card]')].filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).length,controls:[...document.querySelectorAll('main button, main input, main [role=combobox]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({label:el.getAttribute('aria-label')||el.textContent.trim(),...rect(el)})),horizontalTables:[...document.querySelectorAll('[data-slot=table-container]')].map(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth})),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}
        })
        measurements.push({role:admin?'admin':'user',...measurement})
        assert.ok(measurement.documentWidth <= width, 'page should not scroll sideways at '+width)
        if(auditDir){
          await page.screenshot({path:auditDir+'/'+(admin?'admin':'user')+'-'+width+'.png'})
          if (width === 1440 || width === 390) {
            await page.screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-" + width + "-full.png", fullPage: true })
            await page.locator("#sensors").screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-sensors-" + width + ".png" })
            await page.locator("#profile").screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-profile-" + width + ".png" })
          }
        }
      }
      await page.setViewportSize({width:1440,height:900})
      const navigation=page.locator('[data-slot=sidebar-content]')
      for(const href of ['#overview','#spaces','#reservations',...(admin?['#users']:[]),'#sensors','#access','#profile']){
        const link=navigation.locator('a[href="'+href+'"]')
        await link.click()
        await expect(link).toHaveAttribute('aria-current','location')
        await expect(page).toHaveURL(origin+(admin?'admin':'')+href)
      }
      const toggle = page.locator('[data-slot="sidebar-trigger"]')
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-expanded", "false")
      if (auditDir) await page.screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-sidebar-collapsed.png" })
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-expanded", "true")
      await page.setViewportSize({ width: 390, height: 844 })
      for (const href of ["#overview", "#spaces", "#reservations", ...(admin ? ["#users"] : []), "#sensors", "#access", "#profile"]) {
        await toggle.click()
        await expect(toggle).toHaveAttribute("aria-expanded", "true")
        const menu = page.getByRole("dialog")
        await expect(menu).toBeVisible()
        if (auditDir && href === "#overview") await page.screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-mobile-menu.png" })
        await menu.locator('a[href="' + href + '"]').click()
        await expect(menu).toHaveCount(0)
        await expect(toggle).toHaveAttribute("aria-expanded", "false")
      }
      await page.goto(origin + (admin ? "admin" : ""))
      await page.reload()
      await expect(page.getByRole("heading", { name: admin ? "Resumen del campus" : "Hola, Sam." })).toBeVisible()
      await page.keyboard.press("Tab")
      await expect(page.getByRole("link", { name: "Ir al contenido", exact: true })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(page.locator("main")).toBeFocused()
      await page.locator("#spaces").getByRole("button", { name: "Reservar cubículo", exact: true }).click()
      const bookingDialog = page.getByRole("dialog")
      await expect(bookingDialog).toBeVisible()
      if (auditDir) await page.screenshot({ path: auditDir + "/" + (admin ? "admin" : "user") + "-booking-mobile.png" })
      await page.keyboard.press("Escape")
      await expect(bookingDialog).toHaveCount(0)
      await page.setViewportSize({width:1440,height:900})
      await page.getByRole('button',{name:/Abrir menú de cuenta/}).click()
      await expect(page.getByRole('menuitem',{name:'Cerrar sesión',exact:true})).toBeVisible()
      await page.getByRole('menuitem',{name:'Mi perfil',exact:true}).click()
      await page.getByRole('button',{name:/Abrir menú de cuenta/}).click()
      await page.getByRole('menuitem',{name:'Cerrar sesión',exact:true}).click()
      await expect(page).toHaveURL(origin+'login')
      assert.ok(requests.some(r=>r.route==='/auth/logout'&&r.method==='POST'))
      assert.deepEqual(errors,[])
    } finally { await context.close() }
  }
  if(auditDir)await writeFile(auditDir+'/measurements.json',JSON.stringify(measurements,null,2))
})
