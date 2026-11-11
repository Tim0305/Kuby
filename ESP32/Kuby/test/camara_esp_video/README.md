# Camara con otra biblioteca: ESP_Video

Prueba independiente para ESP32-S3 N16R8 y el pinout OV3660 proporcionado.
Utiliza `ESP_Video.h` y los componentes `esp_video`, `esp_cam_sensor` y el
controlador DVP. No utiliza `esp_camera_init()` ni `esp_camera_fb_get()`.
No incluye modelos de caras ni lectura QR.

ESP_Video ya esta incluida en Arduino-ESP32 3.3.12 del entorno instalado.
No hace falta instalar manualmente otra biblioteca ni ejecutar Python.

## Cargar

Desde `ESP32/Kuby`, con el cable conectado al **USB OTG**:

```sh
pio run -e camara_esp_video -t upload
pio device monitor -e camara_esp_video
```

`camara_esp_video` es el entorno predeterminado del proyecto para esta prueba.

1. Conectate a **Kuby-ESP-Video**, clave **kubycam123**.
2. Abre `http://192.168.4.1` o la IP indicada en el monitor.
3. Observa el contador **Cuadros del sensor**.
4. Pulsa **Tomar foto** para mostrar una imagen. No es streaming continuo.

El monitor imprime la version del framework, el formato y resolucion nativos,
los bytes recibidos y `ESP_Video captura OK` cuando recibe datos reales.
La pagina y el monitor siguen disponibles si la tarea se queda esperando
una captura. El estado indica tambien fallos al configurar SCCB/DVP, abrir
el dispositivo o iniciar la captura.

## Diferencia respecto a los otros tests

- La captura usa la API V4L2 de ESP_Video y `/dev/video2`.
- Conserva los GPIO del pinout. XCLK es 20 MHz, requerido por el modo nativo
  OV3660 `DVP_8bit_20Minput_YUV422_YUYV_640x480_10fps` incluido en el SDK.
  No se usa el reloj de 10 MHz del ejemplo generico para otra configuracion.
- Se conserva el formato y resolucion nativos elegidos por el nuevo driver.
  No se exige al sensor la salida JPEG del test anterior.
- JPEG se envia directamente. RGB565, RGB888, gris y YUV422 YUYV/UYVY se
  convierten a BMP de 24 bits, reducido como maximo a 320x240 para la web.
  La conversion es local en `imagen_bmp.h`, sin usar conversiones del
  controlador clasico. Los BMP pueden tardar mas en transmitirse que JPEG.
- Si hay cuadros pero no se puede preparar la imagen web, la pagina lo
  distingue de la ausencia de datos del sensor.

Si aparece una foto, confirma que la camara puede capturar con esta pila y
configuracion. No demuestra por si solo cual de las diferencias con el
test anterior explica el fallo. Si tampoco captura, eso no prueba dano
fisico: conserva el registro completo para diagnosticarlo.

## Verificacion realizada sin hardware

- Compilacion del firmware con PlatformIO.
- Verificacion de que el binario enlaza `esp_video` y el controlador DVP,
  sin `esp_camera_init`, `esp_camera_fb_get`, detector de caras ni quirc.
- Pruebas del conversor BMP con sanitizadores de memoria y comportamiento:
  RGB565, RGB888, YUYV, UYVY, gris, reduccion, limites y falta de memoria.

La captura fisica sigue pendiente de probar en la placa.

## Mensaje E:RX

`E:RX:614400-15360` compara el tamano esperado con el contabilizado por el
driver: VGA YUV422 necesita `640 * 480 * 2 = 614400` bytes. El driver rechaza
el cuadro cuando los tamanos no coinciden. En esta configuracion, 15360 es
el tamano de un bloque DMA; al cerrar por VSYNC el driver suma ese bloque
sin validar en ese camino cuantos bytes llegaron realmente. Ese numero
no demuestra por si solo recepcion de pixeles validos ni dano fisico.

La primera version de este test usaba 10 MHz, que no coincide con el modo
nativo OV3660 del SDK. Se corrigio a 20 MHz. La correccion necesita probarse
en la placa; no se afirma que explique todos los fallos de tests anteriores.

Fuentes:

- https://github.com/espressif/esp-video-components/blob/master/esp_cam_sensor/src/driver_dvp/esp_cam_ctlr_dvp_cam.c
- https://github.com/espressif/esp-video-components/blob/master/esp_cam_sensor/sensors/ov3660/ov3660.c

Referencia: [ESP_Video y ejemplo DVP de Espressif](https://developer.espressif.com/blog/2026/09/arduino-esp-video-camera-capture/).
