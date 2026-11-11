# Test independiente de camara web

Solo camara, Wi-Fi y servidor HTTP. No compila la carpeta `test/camara/`,
no incorpora modelos de caras ni lector QR y no necesita Python.

Placa: ESP32-S3 N16R8 CAM con GPIO del pinout proporcionado por el usuario.
JPEG 320x240, XCLK 20 MHz, un buffer y captura bajo demanda.
Usa PSRAM si se detecta; si falta, lo indica y prueba con un buffer en DRAM.

## Uso

Conecta el puerto **USB OTG** de la placa y abre `ESP32/Kuby` en PlatformIO:

```sh
pio run -e camara_web -t upload
pio device monitor -e camara_web
```

El entorno predeterminado actual es `camara_esp_video`, con otra pila
de captura. Los comandos anteriores prueban explicitamente
`camara_web` con Arduino 3.3.12.
Para volver a la prueba completa, usa explicitamente `-e camara`.

1. Conectate a **Kuby-Camara-Test**, clave **kubycam123**.
2. Abre `http://192.168.4.1` o la IP del monitor serial.
3. La pagina actualiza la imagen 200 ms despues de cada captura recibida.
   No es streaming MJPEG: la velocidad depende de la captura y la red.
4. El monitor debe mostrar el PID del sensor, `Primera captura OK` y
   `Captura OK` cuando el navegador solicite imagenes.

La web arranca incluso si la primera captura falla, para permitir reintentos.
`/foto.jpg` entrega una imagen y `/estado` informa inicializacion y contadores.

## Interpretacion

- Si muestra imagen, la camara puede capturar con este programa; el problema
  de la prueba completa requiere revisar su integracion o recursos.
- Si tampoco captura, eso no prueba por si solo que la placa este danada:
  aun deben revisarse configuracion, alimentacion, cable y flex.
- Conserva el registro completo del driver, PID y errores. Desconecta toda
  alimentacion antes de revisar la conexion del flex.

La compilacion se verifica en la computadora; el resultado de captura
requiere ejecutar esta prueba en la placa fisica.

## Comparacion JPEG / RGB565

Si el PID es `0x3660`, la inicializacion devuelve `ESP_OK` y no hay cuadros
JPEG, prueba el entorno independiente `camara_web_rgb`:

```sh
pio run -e camara_web_rgb -t upload
pio device monitor -e camara_web_rgb
```

Comparte el mismo programa, GPIO, reloj de 20 MHz y QVGA, pero solicita
RGB565 al sensor. La primera captura ocurre antes de activar Wi-Fi. Para
mostrarla en el navegador se convierte a JPEG en la ESP; la red, clave e
IP son las mismas. El monitor identifica el formato y los bytes capturados.

- Si aparece `Primera captura OK` en RGB, el sensor entrega datos y el
  problema observado en JPEG requiere revisar ese modo y el driver.
- Si funciona la primera captura pero falla al activar Wi-Fi, hay que
  investigar recursos y temporizacion; RGB es mas exigente que JPEG.
- Si ambos formatos fallan, sigue sin demostrarse dano fisico: faltan
  pruebas de alimentacion, conexion y, si es posible, otra camara compatible.

Para regresar al test JPEG usa `-e camara_web`. Esta variante RGB es una
prueba de diagnostico, no una optimizacion para video continuo.

## Comparacion de framework (mismo test JPEG)

El entorno `camara_web_arduino2` usa el mismo `main.cpp`, pines, formato JPEG,
reloj y resolucion del test `camara_web`. Solo cambia la plataforma a
`espressif32@6.12.0`, que incluye Arduino-ESP32 2.0.17 / ESP-IDF 4.4.7.
Los entornos originales conservan Arduino-ESP32 3.3.12.

```sh
pio run -e camara_web_arduino2 -t upload
pio device monitor -e camara_web_arduino2
```

El monitor imprime las versiones efectivas. La red, clave y pagina son las
mismas. Si solo funciona con Arduino 2, hay evidencia de una diferencia de
software; si fallan ambos, no permite concluir dano fisico por si solo.
PlatformIO necesita descargar las herramientas de esta version la primera vez.

Referencias revisadas:

- https://github.com/platformio/platform-espressif32/releases/tag/v6.12.0
- https://github.com/espressif/esp32-camera/issues/862 (reporte similar,
  causa no confirmada para esta placa).
- https://github.com/espressif/arduino-esp32/issues/12921 (cambio del campo
  `jpeg_buffer_size`; nuestro `camera_config_t config = {}` ya lo inicializa
  a cero, por lo que esa correccion concreta ya esta cubierta).
