# Kuby — Backend

API REST de Kuby: usuarios, cubículos, reservaciones, historial de accesos y lecturas de sensores.

- **Stack:** Node.js, Express 5, TypeScript (se ejecuta con `tsx`), MySQL/MariaDB (`mysql2`), Zod para validar, sesión con JWT en cookie.
- **Puerto:** `3001`. Todas las rutas cuelgan de `/api`.

## Inicio rápido

### Requisitos
- Node.js (versión LTS reciente).
- MySQL o MariaDB. XAMPP sirve (su "MySQL" es MariaDB).

### Pasos
1. Crear la base `kuby_db` e importar `kuby_db.sql`.
2. Correr, en orden, los scripts de `db/` que todavía no estén aplicados (ver más abajo).
3. Copiar `.env.example` a `.env` y llenarlo.
4. `npm install`
5. `npm run dev` (recarga solo al guardar; si cambias el `.env`, reinícialo).

Debe aparecer `API en http://localhost:3001`. Si falta una variable de entorno, el servidor no arranca y dice cuál.

### Variables de entorno

| Variable | Descripción |
|---|---|
| `DB_HOST` | Host de la base (`localhost`) |
| `DB_PORT` | Puerto (`3306`) |
| `DB_USER` | Usuario de la base |
| `DB_PASSWORD` | Contraseña (vacía en XAMPP) |
| `DB_NAME` | `kuby_db` |
| `JWT_SECRET` | Cadena aleatoria larga para firmar las sesiones |
| `SENSOR_API_KEY` | Clave compartida con los dispositivos (ESP32) |

Para generar `JWT_SECRET` y `SENSOR_API_KEY`:

```bash
node -p "require('crypto').randomBytes(48).toString('hex')"
```

El `.env` **nunca se sube al repo**. `.env.example` solo lleva los nombres, sin valores.

### Scripts de base de datos (`db/`)

| Script | Qué hace |
|---|---|
| `001_roles.sql` | Inserta los roles `admin` y `usuario` |
| `002_foto_mediumblob.sql` | Amplía `usuarios.foto` a `MEDIUMBLOB` |
| `003_estados_reservacion.sql` | Agrega el estado `liberada` y deja `activo` como estado por defecto de los espacios |

El dump `kuby_db.sql` puede ya traer algunos de estos cambios. Corre solo los que falten; el `003` es necesario si el dump no incluye `liberada`.

### Primer administrador
1. Regístrate con `POST /api/auth/signup`.
2. En phpMyAdmin:

```sql
UPDATE usuarios
SET id_rol = (SELECT id_rol FROM roles WHERE nombre_rol = 'admin')
WHERE matricula = 'TU_MATRICULA';
```

### Pruebas y revisión de tipos
- `npx tsc --noEmit` revisa los tipos sin generar archivos.
- En `requests/` hay archivos `.http` para la extensión **REST Client** de VS Code, con el resultado esperado de cada petición. Para los que usan la clave de dispositivo, crea `requests/.env` (ignorado por git) con `SENSOR_API_KEY=` y el mismo valor del `.env` principal.
- Usa solo datos de prueba. No subas fotos reales a `requests/`.

---

## Convenciones

**Sesión.** `POST /api/auth/login` guarda la cookie `token` (httpOnly, dura 8 horas) y el navegador la manda sola. Con el proxy de Vite (`/api` apunta al backend) funciona sin configurar nada. Si el frontend llama directo a otro origen, usa `credentials: "include"` (CORS está abierto solo para `http://localhost:5173`).

**Roles.** `admin` y `usuario`. En cada endpoint se indica quién puede usarlo.

**Formato de errores.** Siempre JSON con la clave `error`:

```json
{ "error": "Mensaje legible" }
```

Errores de validación del body:

```json
{
  "error": "Datos inválidos",
  "detalles": [{ "campo": "password", "mensaje": "Mínimo 8 caracteres" }]
}
```

Los parámetros de URL inválidos responden `{ "error": "Parámetros inválidos", "detalles": [...] }`. Un JSON mal formado responde `400 "JSON mal formado"`. Un fallo inesperado responde `500 "Error interno del servidor"`. La única excepción es `GET /api/reservaciones/actual`, que cuando no hay reservación responde `404` con la clave `mensaje`.

**Códigos comunes.** `400` datos inválidos, `401` sin sesión o sesión inválida, `403` sin permisos, `404` no existe, `409` conflicto (duplicado, horario ocupado o estado que no lo permite).

**Ids.** Enteros positivos. Un id inválido en la URL responde `400 "Id inválido"`.

**Fechas.** Envíalas en ISO 8601 con zona horaria (por ejemplo `2026-11-15T10:00:00.000Z`, que es lo que da `toISOString()`). El backend las devuelve en ISO UTC; el frontend las convierte a hora local para mostrarlas.

**Campos extra.** Los bodies son estrictos: si mandas un campo que el endpoint no acepta, responde `400`.

---

## Estados de una reservación

| Estado | Significado |
|---|---|
| `creada` | Reservada, todavía no se ha entrado |
| `activa` | Ya hubo un primer acceso permitido |
| `finalizada` | Llegó la hora de fin de una reservación que se usó |
| `liberada` | Pasaron 10 minutos del inicio sin que nadie entrara; el horario queda libre |
| `cancelada` | Cancelada por el dueño o un admin |

Reglas:
- Se puede entrar desde la hora de inicio hasta la de fin.
- La **primera entrada** debe hacerse en los primeros 10 minutos desde el inicio. Si no, pasa a `liberada`. Después de la primera entrada se puede volver a entrar hasta la hora de fin.
- Solo se puede **modificar** una reservación en estado `creada`, y el nuevo horario no debe empalmarse con otra.
- Solo se puede **cancelar** en estado `creada` o `activa`.
- Los estados `liberada` y `finalizada` se actualizan solos, con una tarea que corre cada minuto.

---

## Autenticación — `/api/auth`

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/signup` | Público | Crea un usuario con rol `usuario` |
| POST | `/api/auth/login` | Público | Inicia sesión (guarda la cookie) |
| POST | `/api/auth/logout` | Público | Cierra sesión |
| GET | `/api/auth/me` | Sesión | Datos del usuario en sesión |

**Signup**

```json
{ "nombre": "Ana", "apellido": "Pérez", "matricula": "A01234567", "password": "MinimoOchoCaracteres" }
```

- `nombre` y `apellido`: 1 a 100 caracteres. `matricula`: 1 a 20. `password`: 8 a 72.
- `201` → `{ "id_usuario": 5 }`. `409` si la matrícula ya existe. `400` datos inválidos.

**Login**

```json
{ "matricula": "A01234567", "password": "MinimoOchoCaracteres" }
```

- `200` → `{ "id_usuario": 5, "rol": "usuario" }` y la cookie `token`.
- `401` si la matrícula o la contraseña son incorrectas, o el usuario está inactivo (el mensaje es el mismo a propósito).

**Logout** → `204`.

**Me** → `200` con un usuario (ver forma abajo). `401` si no hay sesión.

---

## Usuarios — `/api/usuarios`

Todo exige sesión.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/usuarios` | Admin | Lista de usuarios. Filtro opcional `?estatus=activo` o `?estatus=inactivo` |
| GET | `/api/usuarios/:id` | Admin o el propio usuario | Un usuario |
| PATCH | `/api/usuarios/:id` | Admin o el propio usuario | Editar (ver reglas) |
| DELETE | `/api/usuarios/:id` | Admin | Baja lógica (`estatus = inactivo`) |
| PUT | `/api/usuarios/:id/foto` | Admin o el propio usuario | Subir foto |
| GET | `/api/usuarios/:id/foto` | Admin o el propio usuario | Obtener la foto |
| DELETE | `/api/usuarios/:id/foto` | Admin o el propio usuario | Borrar la foto |

**Forma de un usuario.** Nunca incluye la contraseña ni la foto:

```json
{
  "id_usuario": 2,
  "nombre": "Luis",
  "apellido": "Usuario",
  "matricula": "A00000002",
  "estatus": "activo",
  "id_rol": 2,
  "rol": "usuario",
  "creado_en": "2026-11-12T18:30:00.000Z",
  "tiene_foto": false
}
```

**Editar (`PATCH`)** depende de a quién se edite:

- **Tu propia cuenta** (también si eres admin). Solo `nombre`, `apellido` y `password`. Para cambiar la contraseña hay que mandar también `password_actual`:

  ```json
  { "nombre": "Luis", "password": "NuevaClave123", "password_actual": "ClaveAnterior" }
  ```

  La matrícula, el rol y el estatus no se pueden cambiar. `403` si `password_actual` es incorrecta.

- **Otro usuario (solo admin).** `nombre`, `apellido`, `id_rol` y `estatus` (`activo` o `inactivo`). Así se reactiva a un usuario dado de baja. El admin no puede cambiar la contraseña de otros.

En ambos casos hay que mandar al menos un campo. `200` devuelve el usuario actualizado. `400` si algo es inválido o si el `id_rol` no existe. `404` si no existe.

**Baja (`DELETE`).** `204`. Un admin no puede darse de baja a sí mismo (`400`). Los usuarios nunca se borran de la base: solo cambian a `inactivo`, y un usuario inactivo no puede iniciar sesión ni usar su sesión vigente.

**Foto.**
- `PUT` es `multipart/form-data` con el archivo en el campo `foto`. Solo JPG o PNG (se revisa el contenido real del archivo, no la extensión), máximo 2 MB. `204` si salió bien. `400` si falta el archivo o no es JPG/PNG, `413` si pasa de 2 MB.
- `GET` devuelve la imagen. Sirve directo en `<img src="/api/usuarios/ID/foto">`. `404` si no tiene foto.
- `DELETE` borra la foto → `204`.

---

## Cubículos — `/api/espacios`

Todo exige sesión. Escribir es solo de admin.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/espacios` | Sesión | Lista de cubículos |
| GET | `/api/espacios/:id` | Sesión | Un cubículo |
| GET | `/api/espacios/:id/estado` | Sesión | Última lectura de cada sensor del cubículo |
| POST | `/api/espacios` | Admin | Crear cubículo |
| PATCH | `/api/espacios/:id` | Admin | Modificar cubículo |
| DELETE | `/api/espacios/:id` | Admin | Baja lógica (`estado_espacio = inactivo`) |

**Forma de un cubículo**

```json
{
  "id_espacio": 1,
  "nombre_espacio": "Cubículo 1",
  "ubicacion": "Biblioteca, piso 2",
  "capacidad": 4,
  "ip_nodo_esp32": "192.168.1.60",
  "estado_espacio": "activo"
}
```

**Crear / modificar**
- `nombre_espacio`: 1 a 100 caracteres (obligatorio al crear).
- `ubicacion`: texto opcional, máximo 100.
- `capacidad`: entero mayor a 0. Al crear, `1` por defecto.
- `ip_nodo_esp32`: texto opcional, máximo 45.
- `estado_espacio`: `activo`, `inactivo` o `mantenimiento`. Al crear, `activo` por defecto.
- `POST` → `201` `{ "id_espacio": 3 }`. `PATCH` acepta cualquier subconjunto de campos (al menos uno) y devuelve el cubículo actualizado.
- `DELETE` → `204`. No borra el registro, para no perder reservaciones ni historial.
- Solo se puede reservar un cubículo en estado `activo`.

**Estado de sensores** (`GET /api/espacios/:id/estado`): lista con la última lectura de temperatura, humedad y proximidad, la más reciente primero. Es una lista vacía si el cubículo aún no tiene lecturas.

```json
[
  { "tipo_sensor": "temperatura", "valor": 24.5, "unidad": "°C", "registrado_en": "2026-11-12T19:00:00.000Z" },
  { "tipo_sensor": "humedad", "valor": 55.2, "unidad": "%", "registrado_en": "2026-11-12T18:59:30.000Z" },
  { "tipo_sensor": "proximidad", "valor": 1, "unidad": "bool", "registrado_en": "2026-11-12T18:58:00.000Z" }
]
```

---

## Reservaciones — `/api/reservaciones`

Todo exige sesión. Cada usuario ve y maneja las suyas; el admin ve todas.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reservaciones` | Lista (las propias; admin: todas), de la más reciente a la más antigua |
| GET | `/api/reservaciones/actual` | La reservación en curso o próxima del usuario (para el banner de la página principal) |
| POST | `/api/reservaciones` | Crear |
| PATCH | `/api/reservaciones/:id` | Cambiar el horario |
| DELETE | `/api/reservaciones/:id` | Cancelar |

**Forma de una reservación**

```json
{
  "id_reservacion": 5,
  "id_usuario": 2,
  "id_espacio": 1,
  "nombre_espacio": "Cubículo 1",
  "hora_inicio": "2026-11-15T16:00:00.000Z",
  "hora_fin": "2026-11-15T17:00:00.000Z",
  "proposito": null,
  "estado_reservacion": "creada",
  "creada_en": "2026-11-12T19:05:00.000Z"
}
```

**Crear**

```json
{ "id_espacio": 1, "hora_inicio": "2026-11-15T16:00:00.000Z", "hora_fin": "2026-11-15T17:00:00.000Z" }
```

- `hora_fin` debe ser posterior a `hora_inicio`.
- La hora de inicio no puede estar en el pasado (se tolera un minuto de diferencia de reloj): `400 "La hora de inicio ya pasó"`.
- El cubículo debe existir y estar `activo`: si no, `400`.
- Si el horario se empalma con otra reservación `creada` o `activa` del mismo cubículo: `409`.
- `201` → `{ "id_reservacion": 5 }`.
- El campo `proposito` se acepta, pero hoy no se guarda.

**Cambiar horario (`PATCH`)**

```json
{ "hora_inicio": "2026-11-15T18:00:00.000Z", "hora_fin": "2026-11-15T19:00:00.000Z" }
```

- Se mandan **los dos** campos. Solo el dueño o un admin.
- Solo si la reservación está `creada`; si no, `409`. No se puede mover el inicio al pasado (`400`) ni a un horario ocupado (`409`).
- `200` → `{ "id_reservacion", "hora_inicio", "hora_fin" }`.

**Cancelar (`DELETE`).** `204`. Solo el dueño o un admin. Si está `finalizada`, `liberada` o `cancelada`, responde `409`.

**Actual.** `200` con una reservación, o `404` con `{ "mensaje": "No hay reservaciones activas" }` (el frontend muestra el logo de Kuby en ese caso).

---

## Historial de accesos — `/api/accesos`

El historial se crea solo cuando un dispositivo valida un intento de entrada (ver "API para dispositivos"). Se consulta con sesión.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/accesos` | Sesión | Historial. El usuario ve el suyo; el admin ve todo |
| POST | `/api/accesos/validar` | Clave de dispositivo | Lo usa el ESP32 (ver abajo) |

**Parámetros de `GET /api/accesos`** (todos opcionales)

| Parámetro | Descripción |
|---|---|
| `id_espacio` | Solo ese cubículo |
| `id_usuario` | Solo ese usuario (lo respeta solo el admin; a los demás se les ignora) |
| `resultado` | `permitido` o `denegado` |
| `desde`, `hasta` | Rango de fechas (ISO 8601, por ejemplo `2026-11-01T00:00:00Z`) |
| `limite` | 1 a 100 (por defecto 20) |
| `pagina` | Desde 1 (por defecto 1) |

Orden: del más reciente al más antiguo.

```json
{
  "datos": [
    {
      "id_acceso": 12,
      "resultado": "permitido",
      "metodo_utilizado": "qr",
      "motivo_denegacion": null,
      "fecha": "2026-11-12T19:10:00.000Z",
      "id_espacio": 1,
      "nombre_espacio": "Cubículo 1",
      "id_usuario": 2,
      "usuario": "Luis Usuario",
      "id_reservacion": 5
    }
  ],
  "pagina": 1,
  "limite": 20,
  "total": 1
}
```

Los intentos con una credencial desconocida quedan con `id_usuario` y `usuario` en `null`, y solo los ve el admin.

---

## Lecturas de sensores — `/api`

`sensor` puede ser `temperatura`, `humedad` o `proximidad`. Cualquier otro valor responde `404 "Sensor no existe"`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/lecturas/:sensor` | Clave de dispositivo | Guardar una lectura (lo usa el ESP32) |
| GET | `/api/lecturas/:sensor/recientes` | Sesión | Últimas lecturas |
| GET | `/api/lecturas/:sensor/ultima` | Sesión | La lectura más reciente de cada cubículo |
| GET | `/api/resumen` | Admin | Conteos generales |

**Recientes.** Parámetros opcionales: `limite` (1 a 500, por defecto 100) y `id_espacio`. La más reciente primero.

```json
[{ "id": 123, "valor": 24.5, "fecha": "2026-11-12T19:00:00.000Z", "id_espacio": 1 }]
```

En `proximidad`, `valor` es `1` (detectado) o `0`.

**Última por cubículo**

```json
[{ "id_espacio": 1, "valor": 24.5, "fecha": "2026-11-12T19:00:00.000Z" }]
```

**Resumen**

```json
{ "usuarios": 10, "espacios": 3, "reservaciones": 25, "accesos": 140 }
```

---

## API para dispositivos (ESP32)

Los dispositivos no usan cookie: se identifican con la clave compartida en el header `x-api-key`. La clave real (`SENSOR_API_KEY`) **no se guarda en el repo**; se pide a quien administra el backend.

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `x-api-key` | La clave compartida |

Respuestas comunes a los dos endpoints: `400` body inválido o con campos de más, `401` clave ausente o incorrecta.

### Validar un intento de entrada

`POST /api/accesos/validar`

```json
{ "id_espacio": 1, "metodo": "qr", "credencial": "<token o uid>" }
```

| Campo | Descripción |
|---|---|
| `id_espacio` | Cubículo donde está instalado el nodo |
| `metodo` | `qr` o `rfid` (el reconocimiento facial aún no está disponible) |
| `credencial` | Contenido del QR o UID de la tarjeta, tal como se leyó (hasta 255 caracteres) |

**Respuesta `200`**, tanto si se permite como si se niega:

```json
{ "acceso": true, "resultado": "permitido", "motivo": null, "id_acceso": 12 }
```

El nodo solo necesita revisar `acceso`. Si es `false`, `motivo` indica la causa:

| Motivo | Significado |
|---|---|
| `credencial_invalida` | La credencial no existe o no está asignada a nadie |
| `credencial_inactiva` | La credencial fue desactivada |
| `usuario_inactivo` | El usuario está dado de baja |
| `espacio_no_disponible` | El cubículo no está activo (por ejemplo, en mantenimiento) |
| `reservacion_liberada` | Tenía reservación, pero se liberó por no entrar en los primeros 10 minutos |
| `sin_reservacion_vigente` | No tiene reservación en este cubículo en este momento |

Otros códigos: `404` si el cubículo no existe. Cada intento (permitido o denegado) queda registrado en el historial. Ante cualquier error o falta de respuesta, el nodo debe **negar** el acceso.

### Enviar una lectura

`POST /api/lecturas/:sensor`

```json
{ "id_espacio": 1, "valor": 24.5 }
```

| Sensor | Valor aceptado |
|---|---|
| `temperatura` | Número entre -50 y 150 |
| `humedad` | Número entre 0 y 100 |
| `proximidad` | `true`/`false` o `1`/`0` |

- La fecha la pone el servidor.
- `201` → `{ "id": 123 }`. `404` si el sensor o el cubículo no existen.
- No mandes `NaN`: si un sensor falla en la lectura, no envíes nada.
- Recomendado: temperatura y humedad cada 30 a 60 segundos; proximidad solo cuando cambia.

---

## Seguridad y pendientes conocidos

- `POST /api/auth/signup` es público: cualquiera puede crear una cuenta con rol `usuario`.
- No hay límite de intentos en el login.
- No existen aún endpoints para dar de alta las credenciales QR y RFID: se insertan a mano en la base. Se guardan en texto plano.
- El reconocimiento facial, el control de luz y cortinas, y las preferencias de usuario (`preferencias_usuario`) no están implementados.
- El tráfico va por HTTP sin cifrar. Es aceptable dentro de una red propia protegida, no en una red abierta.
- El servidor escucha solo en `127.0.0.1`. Para que otros dispositivos de la red lleguen hay que cambiarlo a `0.0.0.0` y permitir el puerto 3001 en el firewall.
- Cualquier usuario con sesión puede leer las lecturas de todos los cubículos y la `ip_nodo_esp32` de cada uno.
- Las tablas `lecturas_*` crecen sin límite: falta una purga de lecturas viejas.
- Los nombres de los campos de fecha no son uniformes entre endpoints (`fecha`, `registrado_en`, `creada_en`, `creado_en`).

---

## Estructura

```
backend/
├── db/                       scripts SQL (migraciones)
├── requests/                 pruebas .http (REST Client)
├── src/
│   ├── index.ts              arranque, rutas y tarea de estados
│   ├── config.ts             lee y valida el .env
│   ├── db.ts                 conexión a la base
│   ├── dto/                  validación y forma de las respuestas (Zod)
│   ├── middleware/           auth, dispositivo, validación, errores
│   ├── routes/               un archivo por módulo
│   └── services/             lógica compartida (estados de reservaciones)
├── .env.example
└── package.json
```