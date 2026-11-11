# quirc

Fuente: https://github.com/dlbeer/quirc
Commit: `f2e4271ae43a15d9263704e07bc86cba5697d74d`

Archivos de `lib/`, con licencia ISC en `LICENSE`.
Adaptacion local en `quirc.c`: en ESP32 (`ESP_PLATFORM`), las reservas de
memoria de quirc usan PSRAM explicitamente para conservar RAM interna
para Wi-Fi, tareas y servidores HTTP. Fuera de ESP32 se conserva el
asignador original. El algoritmo de lectura QR no se modifica.
PlatformIO compila estos archivos solamente en el entorno `camara`.
Se habilitan `QUIRC_FLOAT_TYPE=float` y `QUIRC_USE_TGMATH` para aprovechar
la FPU de precision simple del ESP32-S3.
