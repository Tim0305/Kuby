# Video, deteccion de caras y lectura QR

Entorno `camara`: ESP32-S3 N16R8 CAM OV3660, flash de 16 MB y PSRAM OPI
de 8 MB. Los GPIO de `camera_pins.h` corresponden al pinout proporcionado.
D0..D7 son Y2..Y9; PWDN y RESET no usan GPIO dedicado.

## Cargar y abrir

Desde `ESP32/Kuby`, conecta el cable al puerto **USB OTG** (izquierdo en el
pinout), y selecciona ese mismo puerto para carga y monitor:

El entorno predeterminado del proyecto es `camara_esp_video`, la prueba
con otra biblioteca de captura. Para esta prueba completa selecciona explicitamente `-e camara`;
para el microfono, `-e microfono`.

```sh
pio run -e camara -t upload
pio device monitor -e camara
```

1. Conectate a **Kuby-Camara**, clave **kubycam123**.
2. Abre `http://192.168.4.1` (o la IP indicada en el monitor).
3. Espera el mensaje `Detector de caras listo`.
4. Coloca una cara de frente, bien iluminada, cerca de la camara.
5. Veras **Cara detectada** en la pagina y en el monitor serial al pasar
   de ausencia a presencia. Al retirarla, el aviso desaparece tras un segundo.
6. Presenta un QR de frente, con buena luz y margen blanco alrededor. La
   seccion **Codigos QR** muestra su contenido y el monitor imprime `QR detectado:`.
   El ultimo resultado permanece visible al retirar el codigo.

La red no tiene internet; conserva la conexion si el telefono lo pregunta.
La prueba muestra texto, no reproduce voz ni requiere un altavoz.
La camara se comprueba antes de iniciar Wi-Fi para reservar primero sus
recursos. La IP se imprime al crear la red, despues de `Primera captura OK`. Espera
`Servidor listo` para abrir la pagina; ese mensaje se repite cada 10 segundos.
El arranque muestra etapas `[1/6]` a `[6/6]` y los errores fatales se repiten
cada 5 segundos para poder verlos al abrir tarde el monitor.

## Fluidez y deteccion

- MJPEG continuo en `http://192.168.4.1:81/stream`, sin recargar fotos cada 500 ms.
- Resolucion QVGA (320x240), calidad JPEG 14 y dos buffers de camara en PSRAM.
- Captura, envio y deteccion en tareas separadas. Cada consumidor copia la
  ultima imagen disponible; un navegador lento no retiene el buffer de captura.
- La pagina consulta `/estado` cada 300 ms. Indica FPS de **captura** y tiempo
  de procesamiento del detector; los FPS recibidos dependen del Wi-Fi.
- El detector analiza como maximo unas cuatro imagenes por segundo; el video
  continua entre analisis. Si un analisis tarda mas, disminuye esa frecuencia.
- Modelo local MSR + MNP de Espressif. Solo detecta presencia de caras;
  no incluye reconocimiento de identidad ni guarda una base de personas.
- Umbrales 0.6 / 0.7 y tolerancia de un segundo para evitar parpadeos del aviso.
  Puede haber falsos positivos o negativos; prueba con buena iluminacion.
- Lectura QR local con quirc en una tarea independiente, con pila propia.
  Recibe una imagen gris preparada a partir del RGB del detector de caras;
  si sigue ocupado se omite el envio de otro cuadro, sin bloquear el video
  ni acumular imagenes antiguas. El tiempo mostrado mide el analisis de
  caras y la preparacion del cuadro gris, no la decodificacion QR.
- Los buffers y estructuras de quirc se reservan explicitamente en PSRAM.
  Se comprueba la primera captura antes de iniciar Wi-Fi; los servidores
  se inician antes de cargar el modelo de caras.
- El arranque espera 500 ms tras inicializar el sensor y prueba hasta tres
  capturas. Si falla con dos buffers, desinicializa y vuelve a probar con
  un buffer y `CAMERA_GRAB_WHEN_EMPTY`. Este modo de respaldo puede reducir
  la fluidez; solo se selecciona si el modo habitual falla.
- Presenta un QR a la vez: se publica el primero que se pueda decodificar.
  El mismo contenido no se vuelve a imprimir mientras siga visible;
  se registra de nuevo si pasan mas de 2.5 segundos sin leerlo.
- La pagina muestra texto UTF-8 y no abre enlaces automaticamente.
  `/qr` conserva los bytes originales en `contenido_b64` y entrega `listo`,
  `lecturas`, `edad_ms` y `bytes`. Comillas y saltos no rompen el JSON.
  Los bytes de control se escapan en el monitor serial.
- A 320x240 usa QR sencillos y grandes en la imagen. Codigos pequenos,
  densos, desenfocados o con reflejos pueden no leerse.

Abre una sola ventana de video a la vez. El servidor de streaming atiende
una conexion continua; cierra esa ventana antes de abrir otra.
La ruta `/foto.jpg` permite comprobar una imagen sin abrir el stream.

## Dependencias

Arduino-ESP32 3.3.12 instalado incluye camara, Wi-Fi, servidor HTTP y ESP-DL
3.3.11. Se incorporaron a esta carpeta el componente de deteccion y los dos
modelos S3 de [ESP-DL v3.3.2](https://github.com/espressif/esp-dl/tree/v3.3.2/models/human_face_detect),
con licencia MIT en `face_detect/LICENSE`. No hay descargas en el navegador
ni se necesita internet durante el uso. `platformio.ini` incorpora el modelo
empaquetado al firmware; basta con cargar normalmente, sin subir filesystem.

El lector QR se incluye como codigo fuente en `quirc/`, con su licencia ISC
y procedencia en `quirc/README.md`. No requiere instalar librerias manualmente.

Para regenerar el paquete desde los modelos originales:

```sh
python3 test/camara/models/pack_espdl_models.py \
  -m test/camara/models/human_face_detect_msr_s8_v1.espdl \
     test/camara/models/human_face_detect_mnp_s8_v1.espdl \
  -o test/camara/models/human_face_detect.espdl
```

Adaptaciones del componente original: simbolo de datos para PlatformIO,
seleccion fija del modelo MSR/MNP en rodata y valor predeterminado explicito
en el constructor. No se modificaron los algoritmos de deteccion.

## Diagnostico

Si falla `esp_camera_init`, revisa los GPIO, el flex con la placa apagada y
la alimentacion. Si no detecta PSRAM, selecciona el entorno `camara`.
Para imagen detenida o FPS bajos, prueba cerca de la placa, cierra otras
ventanas de video y revisa la alimentacion y el monitor serial.

Si la pagina aparece pero falta el video:

1. Revisa que el monitor muestre `Primera captura OK` y la RAM libre.
2. Pulsa **Comprobar una foto** o abre `http://192.168.4.1/foto.jpg`.
   Si hay imagen, la captura funciona; prueba **Abrir video directamente**.
3. Si aparecen 0 FPS o `Camara sin imagenes`, conserva el registro serial
   completo, incluidos reinicios y errores, para diagnosticar la placa.
4. El stream cierra una conexion si no recibe cuadros nuevos por 5 segundos;
   el navegador reintenta cuando hay error. Los servidores liberan conexiones
   antiguas para evitar que las recargas agoten sus cupos.

Si no pasa de la primera captura, espera a que finalicen ambos modos
(cada llamada de captura puede tardar varios segundos). Copia el PID del
sensor, los mensajes del driver y el detalle de los intentos. Si ambos fallan,
desconecta toda alimentacion antes de revisar y recolocar el flex; vuelve
a probar con cable USB de datos y alimentacion estable. El log por si solo
no distingue entre un problema electrico, de conexion o del driver.

La compilacion puede comprobarse sin hardware. La fluidez y las detecciones
necesitan validarse en la placa fisica.
