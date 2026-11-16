# Prueba NFC/RFID

Prueba independiente de lectura de UID con PN532 en modo I2C y ESP32-S3 N16R8.
Usa los pines de `include/pins.h`:

| PN532 | GPIO del ESP32-S3 |
| --- | --- |
| SDA | 8 |
| SCL | 9 |
| IRQ | 1 |
| RESET | 2 |

Configura los selectores del modulo en modo I2C y conecta GND comun.
Alimenta el modulo segun sus especificaciones.

Desde la carpeta del proyecto:

```sh
pio run -e nfc
pio run -e nfc -t upload
pio device monitor -e nfc
```

El monitor funciona a 115200 baudios. Muestra la deteccion del lector,
su firmware y el UID hexadecimal de tarjetas o etiquetas ISO14443A.
Si el lector no inicia, muestra un mensaje para revisar la conexion.
