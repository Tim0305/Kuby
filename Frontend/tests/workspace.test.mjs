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
    const admin = req.headers.cookie?.includes("fixture-role=admin")
    const userId = admin ? 1 : 2
    const send = (body, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(status === 204 ? undefined : JSON.stringify(body))
    }
    if (fixture.expired) return send({ error: "Session expired" }, 401)
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
        : send({ error: "Forbidden" }, 403)
    if (route === "/reservaciones/actual")
      return send(
        fixture.reservations.find(
          (r) =>
            r.id_usuario === userId &&
            ["creada", "activa"].includes(r.estado_reservacion)
        ) ?? { mensaje: "No hay reservaciones activas" },
        userId === 1 ? 404 : 200
      )
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
      if (data.password_actual === "wrong")
        return send({ error: "La contraseña actual es incorrecta" }, 403)
      for (const key of ["nombre", "apellido", "estatus", "id_rol"])
        if (data[key] !== undefined) user[key] = data[key]
      user.rol = user.id_rol === 1 ? "admin" : "usuario"
      return send(user)
    }
    send({ error: "Fixture endpoint not implemented" }, 404)
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
  viewport = { width: 1440, height: 1000 }
) {
  resetFixture()
  const context = await browser.newContext({
    viewport,
    timezoneId: "America/Mexico_City",
    reducedMotion: "reduce"
  })
  if (admin)
    await context.addCookies([
      { name: "fixture-role", value: "admin", url: origin }
    ])
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(origin + (admin ? "admin" : ""))
  await expect(
    page.getByRole("heading", {
      name: admin ? "A little room for everything." : "Welcome back, Sam."
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
      await expect(
        page.getByRole("link", { name: "Users", exact: true })
      ).toHaveCount(0)
      await expect(
        page.getByRole("button", { name: "Unavailable", exact: true })
      ).toBeDisabled()
      await page
        .getByRole("button", { name: "Reserve cubicle", exact: true })
        .click()
      const dialog = page.getByRole("dialog")
      await dialog
        .getByLabel("Start time", { exact: true })
        .fill("2035-11-16T10:00")
      await dialog
        .getByLabel("End time", { exact: true })
        .fill("2035-11-16T11:00")
      fixture.conflict = true
      await dialog
        .getByRole("button", { name: "Confirm reservation", exact: true })
        .click()
      await expect(dialog.getByRole("alert")).toContainText("empalma")
      await expect(
        dialog.getByLabel("Start time", { exact: true })
      ).toHaveValue("2035-11-16T10:00")
      fixture.conflict = false
      await dialog
        .getByRole("button", { name: "Confirm reservation", exact: true })
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
        table.getByRole("button", { name: "Reschedule", exact: true })
      ).toHaveCount(1)
      await expect(
        table.getByRole("button", { name: "Cancel reservation", exact: true })
      ).toHaveCount(2)
      await table
        .getByRole("button", { name: "Reschedule", exact: true })
        .click()
      let dialog = page.getByRole("dialog")
      await dialog
        .getByLabel("End time", { exact: true })
        .fill("2035-11-15T09:00")
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(dialog.getByRole("alert")).toContainText("after start")
      await dialog
        .getByLabel("End time", { exact: true })
        .fill("2035-11-15T12:00")
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      assert.equal(fixture.reservations[0].hora_fin, "2035-11-15T18:00:00.000Z")
      await table
        .getByRole("row")
        .filter({ hasText: "Upcoming" })
        .getByRole("button", { name: "Cancel reservation", exact: true })
        .click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("button", { name: "Cancel reservation", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      await expect(
        table.getByRole("button", { name: "Reschedule", exact: true })
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
      await expect(page.getByLabel("Administration totals")).toContainText(
        "Access attempts"
      )
      await page.screenshot({ path: screenshotDirectory + "admin-desktop.png" })
      await page
        .getByRole("button", { name: "New cubicle", exact: true })
        .click()
      let dialog = page.getByRole("dialog")
      await dialog.getByLabel("Name", { exact: true }).fill("Team nook")
      await dialog.getByLabel("Capacity", { exact: true }).fill("6")
      await dialog
        .getByRole("button", { name: "Create cubicle", exact: true })
        .click()
      await expect(dialog).toHaveCount(0)
      const nook = page
        .locator("#spaces [data-slot=card]")
        .filter({ hasText: "Team nook" })
      await expect(nook).toContainText("Up to 6 people")
      await nook
        .getByRole("button", { name: "Deactivate", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Deactivate", exact: true })
        .click()
      await expect(
        nook.getByRole("button", { name: "Unavailable", exact: true })
      ).toBeDisabled()
      await nook.getByRole("button", { name: "Edit", exact: true }).click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("combobox", { name: "Cubicle status", exact: true })
        .click()
      await page.getByRole("option", { name: "Active", exact: true }).click()
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(
        nook.getByRole("button", { name: "Reserve cubicle", exact: true })
      ).toBeEnabled()
      const accounts = page.locator("#users")
      const own = accounts.getByRole("row").filter({ hasText: "Alex Admin" })
      await expect(
        own.getByRole("link", { name: "Edit my profile", exact: true })
      ).toBeVisible()
      await expect(
        own.getByRole("button", { name: "Deactivate user", exact: true })
      ).toHaveCount(0)
      let student = accounts.getByRole("row").filter({ hasText: "Sam Student" })
      await student.getByRole("button", { name: "Edit", exact: true }).click()
      dialog = page.getByRole("dialog")
      await dialog.getByRole("combobox", { name: "Role", exact: true }).click()
      await page
        .getByRole("option", { name: "Administrator", exact: true })
        .click()
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(student).toContainText("admin")
      assert.equal(fixture.users[1].id_rol, 1)
      await student
        .getByRole("button", { name: "Deactivate user", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Deactivate user", exact: true })
        .click()
      await expect(student).toContainText("Inactive")
      await page
        .getByRole("combobox", { name: "Filter users by status", exact: true })
        .click()
      await page.getByRole("option", { name: "Inactive", exact: true }).click()
      await expect(accounts.locator("tbody tr")).toHaveCount(1)
      student = accounts.getByRole("row").filter({ hasText: "Sam Student" })
      await student.getByRole("button", { name: "Edit", exact: true }).click()
      dialog = page.getByRole("dialog")
      await dialog
        .getByRole("combobox", { name: "User status", exact: true })
        .click()
      await page.getByRole("option", { name: "Active", exact: true }).click()
      await dialog
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(accounts).toContainText("No users match this filter.")
      assert.equal(fixture.users[1].estatus, "activo")
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
        .getByRole("button", { name: "Toggle Sidebar", exact: true })
        .click()
      const navigation = page.getByRole("dialog")
      await expect(navigation).toBeVisible()
      await navigation
        .getByRole("link", { name: "Conditions", exact: true })
        .click()
      await expect(navigation).toHaveCount(0)
      await expect(page).toHaveURL(origin + "#sensors")
      await page
        .getByRole("combobox", {
          name: "Cubicle for sensor readings",
          exact: true
        })
        .click()
      await page
        .getByRole("option", { name: "Library Two", exact: true })
        .click()
      await expect(conditions).toContainText(
        "No temperature readings for this cubicle yet."
      )
      await page
        .getByRole("combobox", {
          name: "Cubicle for sensor readings",
          exact: true
        })
        .click()
      await page
        .getByRole("option", { name: "Library One", exact: true })
        .click()
      await page
        .getByRole("combobox", { name: "Sensor history", exact: true })
        .click()
      await page.getByRole("option", { name: "Humidity", exact: true }).click()
      await expect(conditions.locator("tbody")).toContainText("%")
      const history = page.locator("#access")
      await history
        .getByRole("combobox", { name: "Filter access by result", exact: true })
        .click()
      await page.getByRole("option", { name: "Denied", exact: true }).click()
      await history
        .getByRole("button", { name: "Apply filters", exact: true })
        .click()
      await expect(history.locator("tbody tr")).toHaveCount(1)
      await expect(history).toContainText("No reservation at this time")
      await history
        .getByRole("combobox", { name: "Filter access by result", exact: true })
        .click()
      await page
        .getByRole("option", { name: "All results", exact: true })
        .click()
      await history
        .getByRole("button", { name: "Apply filters", exact: true })
        .click()
      await expect(history.locator("tbody tr")).toHaveCount(20)
      await history.getByRole("button", { name: "Next", exact: true }).click()
      await expect(history).toContainText("Page 2 of 2")
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
        .getByLabel("Profile first name", { exact: true })
        .fill("Taylor")
      await profile
        .getByRole("button", { name: "Save changes", exact: true })
        .click()
      await expect(
        page.getByRole("heading", { name: "Welcome back, Taylor." })
      ).toBeVisible()
      await profile
        .getByLabel("Current password", { exact: true })
        .fill("wrong")
      await profile
        .getByLabel("New password", { exact: true })
        .fill("NewPassword123")
      await profile
        .getByLabel("Confirm new password", { exact: true })
        .fill("NewPassword123")
      await profile
        .getByRole("button", { name: "Update password", exact: true })
        .click()
      await expect(profile.getByRole("alert")).toContainText(
        "contraseña actual"
      )
      const upload = profile.getByLabel("Choose photo", { exact: true })
      await upload.setInputFiles({
        name: "photo.gif",
        mimeType: "image/gif",
        buffer: Buffer.from("gif")
      })
      await profile
        .getByRole("button", { name: "Upload photo", exact: true })
        .click()
      await expect(
        profile.getByText("Choose a JPG or PNG photo.", { exact: true })
      ).toBeVisible()
      await upload.setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: png
      })
      await profile
        .getByRole("button", { name: "Upload photo", exact: true })
        .click()
      await expect(
        profile.getByRole("button", { name: "Remove photo", exact: true })
      ).toBeVisible()
      await profile
        .getByRole("button", { name: "Remove photo", exact: true })
        .click()
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Remove photo", exact: true })
        .click()
      await expect(
        profile.getByRole("button", { name: "Remove photo", exact: true })
      ).toHaveCount(0)
      fixture.expired = true
      await page
        .locator("#reservations")
        .getByRole("button", { name: "Refresh", exact: true })
        .click()
      await expect(page).toHaveURL(origin + "login")
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true })
      ).toBeVisible()
    } finally {
      await context.close()
    }
  }
)
