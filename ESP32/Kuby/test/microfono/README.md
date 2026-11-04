# Microfono INMP441: comandos en ingles sin internet

Hardware: ESP32-S3-CAM N16R8 (16 MB flash, 8 MB PSRAM).

Esta es una prueba manual de hardware ubicada en `test/microfono/`.
Se compila y carga con el entorno `microfono` usando `pio run`, sin un
framework de pruebas unitarias. El entorno `esp32dev` compila solo `src/`.

| INMP441 | ESP32-S3 |
| --- | --- |
| SCK | GPIO 42 |
| WS | GPIO 41 |
| SD | GPIO 47 |
| VDD | 3.3 V |
| GND | GND |
| L/R | GND (canal izquierdo) |

## Compilar y cargar

Desde `ESP32/Kuby`, selecciona el entorno **microfono** en PlatformIO o ejecuta:

```sh
pio run -e microfono
pio run -e microfono -t upload
pio device monitor -e microfono
```

La primera compilacion necesita internet para descargar las herramientas y las
bibliotecas. Una vez cargado, el reconocimiento funciona completamente en el
ESP32-S3, sin Wi-Fi, servidores ni claves de API.

El entorno usa Arduino-ESP32 3.3.12, ESP_SR, PSRAM OPI y la tabla oficial
`esp_sr_16.csv`. PlatformIO agrega automaticamente `srmodels.bin` a la carga en
`0xC10000`. Se necesita la carga completa con `-t upload`, no solo copiar el
archivo de la aplicacion: el modelo debe quedar grabado en la particion `model`.
La tabla de particiones cambia; respalda datos anteriores de flash si los tienes.

## Uso

En VS Code usa **PROJECT TASKS > microfono > General > Upload** y luego
**Monitor**. El entorno predeterminado del proyecto es `microfono`.
Los mensajes usan la consola ROM, la misma salida que los registros de ESP_SR,
para evitar perder los avisos de la aplicacion en la salida Arduino HWCDC.
Selecciona el puerto
`/dev/cu.usbmodem...` de la placa. Si abriste el monitor despues del arranque,
pulsa **RESET** sin mantener BOOT para volver a ver los mensajes iniciales.

Abre el monitor serial a **115200 baudios**, espera el mensaje `Listo` y di
uno de estos cinco comandos:

| Comando | Porcentaje | ID |
| --- | --- | --- |
| `Turn off the light` | 0 % | 1 |
| `Set brightness to low` | 25 % | 2 |
| `Set brightness to medium` | 50 % | 3 |
| `Set brightness to high` | 75 % | 4 |
| `Set maximum brightness` | 100 % | 5 |

El porcentaje se calcula con `(idComando - 1) * 25`, se guarda en
`porcentajeLuz` y se imprime en la consola. Estos cinco comandos reemplazan
las 101 frases de porcentajes.
Escucha directamente, sin palabra de activacion, y vuelve a escuchar despues de
cada comando y de cada tiempo de espera. Prueba inicialmente cerca del microfono
y con poco ruido. Solo reconoce las frases registradas; no transcribe voz libre.
No se controla una luz fisica; agrega esa accion en `alReconocerVoz()` usando
`porcentajeLuz` cuando se defina el actuador y su pin.

Para cambiar las frases, edita `comandos[]` en `main.cpp` y vuelve a compilar y
cargar. Las frases deben estar en ingles; sus fonemas se generan localmente.

Si no inicia, revisa los mensajes de PSRAM, I2S y del modelo. Usa alimentacion de
3.3 V para el INMP441 y tierra comun. No inicies la camara ni otros perifericos
que utilicen los GPIO 41, 42 o 47 mientras funciona este programa.

Referencia: [ejemplo oficial ESP_SR de Espressif](https://github.com/espressif/arduino-esp32/tree/master/libraries/ESP_SR/examples/Basic).
