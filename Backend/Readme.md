## API para dispositivos (ESP32)

### Validar un intento de entrada

`POST /api/accesos/validar`

**Headers**

| Header | Valor |
|---|---|
| `Content-Type` | `application/json` |
| `x-api-key` | La clave compartida del backend (`SENSOR_API_KEY`). No se guarda en el repo; se pide al responsable del backend. |

**Body**

```json
{ "id_espacio": 1, "metodo": "qr", "credencial": "<token o uid>" }
```

| Campo | Descripción |
|---|---|
| `id_espacio` | Id del cubículo donde está instalado el nodo |
| `metodo` | `"qr"` o `"rfid"` |
| `credencial` | Token del QR o UID de la tarjeta, tal como se leyó |

**Respuesta `200`** (tanto si se permite como si se niega)

```json
{ "acceso": true, "resultado": "permitido", "motivo": null, "id_acceso": 12 }
```

El nodo solo necesita revisar el campo `acceso`. Si es `false`, `motivo` indica la causa:

| Motivo | Significado |
|---|---|
| `credencial_invalida` | La credencial no existe o no está asignada a nadie |
| `credencial_inactiva` | La credencial fue desactivada |
| `usuario_inactivo` | El usuario está dado de baja |
| `espacio_no_disponible` | El cubículo no está activo (por ejemplo, en mantenimiento) |
| `reservacion_liberada` | Tenía reservación, pero se liberó por no entrar en los primeros 10 minutos |
| `sin_reservacion_vigente` | No tiene reservación en este cubículo en este momento |

**Otros códigos**

| Código | Significa |
|---|---|
| `400` | Body inválido o con campos de más |
| `401` | Falta la clave o es incorrecta |
| `404` | El cubículo no existe |

### Reglas de entrada
- Se puede entrar desde el inicio de la reservación hasta su fin.
- La primera entrada debe ocurrir dentro de los 10 minutos posteriores al inicio. Si no, la reservación se libera.
- Después de la primera entrada se puede volver a entrar hasta la hora de fin.