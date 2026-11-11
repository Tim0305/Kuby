#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <esp_err.h>
#include <esp_http_server.h>
#include <esp_heap_caps.h>
#include <jpeg_decoder.h>
#include <atomic>
#include "camera_pins.h"
#include "face_detect/human_face_detect.hpp"
#include "lector_qr.h"

const char *AP_SSID = "Kuby-Camara";
const char *AP_PASSWORD = "kubycam123";
constexpr size_t MAX_JPEG = 128 * 1024;
constexpr uint16_t ANCHO = 320;
constexpr uint16_t ALTO = 240;
constexpr uint32_t INTERVALO_DETECCION_MS = 250;
SemaphoreHandle_t mutexImagen;
uint8_t *ultimaImagen;
size_t longitudImagen = 0;
uint32_t numeroImagen = 0;
std::atomic<bool> caraDetectada{false};
std::atomic<bool> detectorListo{false};
std::atomic<bool> errorDetector{false};
std::atomic<unsigned> tiempoDeteccion{0};
std::atomic<unsigned> fpsCaptura{0};
std::atomic<uint32_t> ultimaCapturaMs{0};

const char PAGINA[] PROGMEM = R"html(
<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Camara Kuby</title>
<style>body{font-family:system-ui;text-align:center;background:#18212b;color:white}
img{width:640px;max-width:100%;height:auto;border-radius:12px}
#estado{font-size:1.5rem;font-weight:bold}.cara{color:#70ed9a}</style>
<h1>Camara Kuby</h1><img id="video" alt="Video de la camara">
<p id="videoEstado">Conectando video...</p>
<p><a id="videoDirecto" style="color:#70ed9a">Abrir video directamente</a>
 | <a href="/foto.jpg" target="_blank" style="color:#70ed9a">Comprobar una foto</a></p>
<p id="estado">Iniciando detector...</p><p id="datos"></p>
<h2>Codigos QR</h2><p id="qrEstado">Esperando un codigo QR...</p>
<pre id="qrContenido" style="white-space:pre-wrap;overflow-wrap:anywhere;max-width:640px;margin:auto"></pre>
<script>
const video=document.getElementById('video');
const estado=document.getElementById('estado');
const datos=document.getElementById('datos');
const qrEstado=document.getElementById('qrEstado');
const qrContenido=document.getElementById('qrContenido');
const videoEstado=document.getElementById('videoEstado');
const urlVideo=new URL(location.href);
urlVideo.port='81';urlVideo.pathname='/stream';urlVideo.search='';urlVideo.hash='';
document.getElementById('videoDirecto').href=urlVideo.href;
let reintentoVideo;
function conectar(){video.src=urlVideo.href+'?t='+Date.now();}
video.onload=()=>{videoEstado.textContent='Video conectado';};
video.onerror=()=>{
  videoEstado.textContent='No se recibio el video; reintentando. Puedes comprobar una foto.';
  clearTimeout(reintentoVideo);reintentoVideo=setTimeout(conectar,2000);
};
conectar();
async function consultar(){
  try{
    const r=await fetch('/estado',{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const s=await r.json();
    estado.textContent=s.error?'Error del detector; revisa el monitor serial':
      !s.listo?'Iniciando detector...':s.cara?'Cara detectada':'Sin cara detectada';
    estado.className=s.cara?'cara':'';
    datos.textContent=s.fps+' FPS de captura | Deteccion: '+s.ms+' ms';
    if(!s.captura)videoEstado.textContent='La camara no esta entregando imagenes; revisa el monitor serial.';
  }catch(e){estado.textContent='Sin conexion con la ESP; reconectando...';estado.className='';}
  setTimeout(consultar,300);
}
consultar();
async function consultarQR(){
  try{
    const r=await fetch('/qr',{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const q=await r.json();
    qrEstado.textContent=!q.listo?'Lector QR no disponible; revisa el monitor serial':
      !q.lecturas?'Esperando un codigo QR...':q.edad_ms<1500?'QR detectado':'Ultimo QR leido';
    qrEstado.className=q.listo&&q.lecturas&&q.edad_ms<1500?'cara':'';
    qrContenido.textContent=q.listo&&q.lecturas?
      new TextDecoder('utf-8').decode(Uint8Array.from(atob(q.contenido_b64),c=>c.charCodeAt(0))):'';
  }catch(e){qrEstado.textContent='Sin conexion con el lector QR';qrEstado.className='';}
  setTimeout(consultarQR,500);
}
consultarQR();
</script></html>
)html";

void detener(const char *mensaje)
{
    // Repetir el fallo permite verlo aunque el monitor se abra despues.
    while (true)
    {
        Serial.println(mensaje);
        Serial.println("Arranque incompleto: el servidor aun no esta listo.");
        delay(5000);
    }
}

// Cada consumidor recibe una copia: ni la red ni el detector retienen
// los buffers del driver, y un cliente lento no bloquea la captura.
size_t copiarImagen(uint8_t *destino, uint32_t &numero)
{
    xSemaphoreTake(mutexImagen, portMAX_DELAY);
    size_t longitud = longitudImagen;
    if (longitud > 0) memcpy(destino, ultimaImagen, longitud);
    numero = numeroImagen;
    xSemaphoreGive(mutexImagen);
    return longitud;
}

void capturar(void *)
{
    uint32_t inicio = millis();
    unsigned cuadros = 0;
    unsigned fallos = 0;
    for (;;)
    {
        camera_fb_t *foto = esp_camera_fb_get();
        if (foto != nullptr)
        {
            if (foto->format == PIXFORMAT_JPEG && foto->len <= MAX_JPEG)
            {
                xSemaphoreTake(mutexImagen, portMAX_DELAY);
                memcpy(ultimaImagen, foto->buf, foto->len);
                longitudImagen = foto->len;
                ++numeroImagen;
                ultimaCapturaMs = millis();
                xSemaphoreGive(mutexImagen);
                ++cuadros;
            }
            esp_camera_fb_return(foto);
        }
        else if (++fallos % 30 == 1) Serial.println("ERROR: fallo de captura.");
        const uint32_t ahora = millis();
        if (ahora - inicio >= 1000)
        {
            fpsCaptura = cuadros * 1000 / (ahora - inicio);
            cuadros = 0;
            inicio = ahora;
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void detectarCaras(void *)
{
    auto *jpeg = static_cast<uint8_t *>(ps_malloc(MAX_JPEG));
    auto *rgb = static_cast<uint8_t *>(ps_malloc(ANCHO * ALTO * 3));
    if (jpeg == nullptr || rgb == nullptr)
    {
        free(jpeg);
        free(rgb);
        errorDetector = true;
        Serial.println("ERROR: memoria insuficiente para el detector.");
        vTaskDelete(nullptr);
        return;
    }
    // Dos etapas MSR + MNP: deteccion de presencia, sin modelo de identidad.
    HumanFaceDetect detector(HumanFaceDetect::MSRMNP_S8_V1, false);
    detector.set_score_thr(0.6f, 0);
    detector.set_score_thr(0.7f, 1);
    detectorListo = true;
    Serial.println("Detector de caras listo (local, sin identificar personas).");
    uint32_t ultimoNumero = 0;
    uint32_t ultimaCara = 0;
    bool huboCara = false;
    uint8_t trabajoJpeg[3100];
    for (;;)
    {
        const uint32_t inicio = millis();
        uint32_t numero;
        size_t longitud = copiarImagen(jpeg, numero);
        if (longitud > 0 && numero != ultimoNumero)
        {
            ultimoNumero = numero;
            esp_jpeg_image_cfg_t decodificador = {};
            decodificador.indata = jpeg;
            decodificador.indata_size = longitud;
            decodificador.outbuf = rgb;
            decodificador.outbuf_size = ANCHO * ALTO * 3;
            decodificador.out_format = JPEG_IMAGE_FORMAT_RGB888;
            decodificador.out_scale = JPEG_IMAGE_SCALE_0;
            decodificador.advanced.working_buffer = trabajoJpeg;
            decodificador.advanced.working_buffer_size = sizeof(trabajoJpeg);
            esp_jpeg_image_output_t salida = {};
            if (esp_jpeg_decode(&decodificador, &salida) == ESP_OK &&
                salida.width == ANCHO && salida.height == ALTO)
            {
                dl::image::img_t imagen = {rgb, ANCHO, ALTO, dl::image::DL_IMAGE_PIX_TYPE_RGB888};
                const bool encontrada = !detector.run(imagen).empty();
                analizarQR(rgb);
                tiempoDeteccion = millis() - inicio;
                errorDetector = false;
                if (encontrada)
                {
                    ultimaCara = millis();
                    huboCara = true;
                }
            }
            else
            {
                errorDetector = true;
                Serial.println("ERROR: no se pudo decodificar el JPEG para detectar caras.");
            }
        }
        // Breve tolerancia a detecciones intermitentes, sin dejar un positivo
        // permanente si la camara deja de entregar imagenes.
        const bool presente = huboCara && millis() - ultimaCara < 1000;
        if (presente && !caraDetectada.load()) Serial.println("Cara detectada");
        caraDetectada = presente;
        const uint32_t transcurrido = millis() - inicio;
        vTaskDelay(pdMS_TO_TICKS(transcurrido < INTERVALO_DETECCION_MS
                                    ? INTERVALO_DETECCION_MS - transcurrido : 10));
    }
}

esp_err_t transmitir(httpd_req_t *peticion)
{
    auto *jpeg = static_cast<uint8_t *>(ps_malloc(MAX_JPEG));
    if (jpeg == nullptr) return httpd_resp_send_err(peticion, HTTPD_500_INTERNAL_SERVER_ERROR, "Sin memoria");
    httpd_resp_set_type(peticion, "multipart/x-mixed-replace; boundary=kubyframe");
    httpd_resp_set_hdr(peticion, "Cache-Control", "no-store");
    uint32_t anterior = 0;
    uint32_t ultimaImagenEnviada = millis();
    esp_err_t resultado = ESP_OK;
    while (resultado == ESP_OK)
    {
        uint32_t numero;
        size_t longitud = copiarImagen(jpeg, numero);
        if (longitud == 0 || numero == anterior)
        {
            if (millis() - ultimaImagenEnviada > 5000)
            {
                Serial.println("Video: sin cuadros nuevos durante 5 s; cerrando conexion.");
                resultado = ESP_FAIL;
                break;
            }
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }
        anterior = numero;
        char cabecera[128];
        const int n = snprintf(cabecera, sizeof(cabecera),
            "\r\n--kubyframe\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
            static_cast<unsigned>(longitud));
        resultado = httpd_resp_send_chunk(peticion, cabecera, n);
        if (resultado == ESP_OK)
            resultado = httpd_resp_send_chunk(peticion, reinterpret_cast<char *>(jpeg), longitud);
        if (resultado == ESP_OK) ultimaImagenEnviada = millis();
        vTaskDelay(pdMS_TO_TICKS(20));
    }
    free(jpeg);
    return resultado;
}

esp_err_t enviarFoto(httpd_req_t *peticion)
{
    auto *jpeg = static_cast<uint8_t *>(ps_malloc(MAX_JPEG));
    if (!jpeg) return httpd_resp_send_err(peticion, HTTPD_500_INTERNAL_SERVER_ERROR, "Sin memoria");
    uint32_t numero;
    const size_t longitud = copiarImagen(jpeg, numero);
    esp_err_t resultado;
    if (!longitud || millis() - ultimaCapturaMs.load() > 5000)
    {
        httpd_resp_set_status(peticion, "503 Service Unavailable");
        resultado = httpd_resp_sendstr(peticion, "Camara sin imagenes");
    }
    else
    {
        httpd_resp_set_type(peticion, "image/jpeg");
        httpd_resp_set_hdr(peticion, "Cache-Control", "no-store");
        resultado = httpd_resp_send(peticion, reinterpret_cast<char *>(jpeg), longitud);
    }
    free(jpeg);
    return resultado;
}

esp_err_t enviarPagina(httpd_req_t *peticion)
{
    httpd_resp_set_type(peticion, "text/html; charset=utf-8");
    return httpd_resp_send(peticion, PAGINA, HTTPD_RESP_USE_STRLEN);
}

esp_err_t enviarEstado(httpd_req_t *peticion)
{
    char json[160];
    snprintf(json, sizeof(json), "{\"listo\":%s,\"error\":%s,\"cara\":%s,\"fps\":%u,\"ms\":%u,\"captura\":%s}",
        detectorListo.load() ? "true" : "false", errorDetector.load() ? "true" : "false",
        caraDetectada.load() ? "true" : "false", fpsCaptura.load(), tiempoDeteccion.load(),
        ultimaCapturaMs.load() && millis() - ultimaCapturaMs.load() < 5000 ? "true" : "false");
    httpd_resp_set_type(peticion, "application/json");
    httpd_resp_set_hdr(peticion, "Cache-Control", "no-store");
    return httpd_resp_send(peticion, json, HTTPD_RESP_USE_STRLEN);
}

void setup()
{
    Serial.begin(115200);
    const uint32_t esperaSerial = millis();
    while (!Serial && millis() - esperaSerial < 5000) delay(20);
    delay(200);
    Serial.println("\nKuby: video, caras y codigos QR ESP32-S3 N16R8");
    Serial.println("[1/6] Comprobando PSRAM...");
    if (!psramFound()) detener("ERROR: no se detecto PSRAM. Usa el entorno camara.");
    ultimaImagen = static_cast<uint8_t *>(ps_malloc(MAX_JPEG));
    mutexImagen = xSemaphoreCreateMutex();
    if (ultimaImagen == nullptr || mutexImagen == nullptr) detener("ERROR: no hay memoria para la captura.");

    Serial.println("[2/6] Iniciando camara antes del Wi-Fi...");
    Serial.printf("RAM interna libre: %u | Mayor bloque DMA: %u | PSRAM libre: %u\n",
        static_cast<unsigned>(heap_caps_get_free_size(MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT)),
        static_cast<unsigned>(heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL | MALLOC_CAP_DMA)),
        static_cast<unsigned>(ESP.getFreePsram()));

    camera_config_t config = {};
    config.pin_pwdn = CAM_PWDN;
    config.pin_reset = CAM_RESET;
    config.pin_xclk = CAM_XCLK;
    config.pin_sccb_sda = CAM_SIOD;
    config.pin_sccb_scl = CAM_SIOC;
    config.pin_d0 = CAM_D0;
    config.pin_d1 = CAM_D1;
    config.pin_d2 = CAM_D2;
    config.pin_d3 = CAM_D3;
    config.pin_d4 = CAM_D4;
    config.pin_d5 = CAM_D5;
    config.pin_d6 = CAM_D6;
    config.pin_d7 = CAM_D7;
    config.pin_vsync = CAM_VSYNC;
    config.pin_href = CAM_HREF;
    config.pin_pclk = CAM_PCLK;
    config.xclk_freq_hz = 20000000;
    config.ledc_timer = LEDC_TIMER_0;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.pixel_format = PIXFORMAT_JPEG;
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 14;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_LATEST;
    bool capturaVerificada = false;
    for (int modo = 0; modo < 2 && !capturaVerificada; ++modo)
    {
        if (modo == 1)
        {
            config.fb_count = 1;
            config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
            Serial.println("Reintentando camara con un buffer y captura bajo demanda.");
        }
        const esp_err_t resultado = esp_camera_init(&config);
        if (resultado != ESP_OK)
        {
            Serial.printf("esp_camera_init: %s (0x%x)\n", esp_err_to_name(resultado), resultado);
            // No desinicializar tras un init fallido: el driver ya limpia sus recursos.
            delay(500);
            continue;
        }
        sensor_t *sensor = esp_camera_sensor_get();
        if (sensor) Serial.printf("Sensor detectado: PID=0x%04x\n", sensor->id.PID);
        delay(500);
        for (int intento = 1; intento <= 3 && !capturaVerificada; ++intento)
        {
            Serial.printf("Primera captura: intento %d/3, buffers=%d...\n", intento, config.fb_count);
            camera_fb_t *prueba = esp_camera_fb_get();
            if (prueba)
            {
                capturaVerificada = prueba->format == PIXFORMAT_JPEG &&
                    prueba->width == ANCHO && prueba->height == ALTO &&
                    prueba->len > 0 && prueba->len <= MAX_JPEG;
                Serial.printf("Cuadro: %ux%u | formato=%d | bytes=%u\n",
                    static_cast<unsigned>(prueba->width), static_cast<unsigned>(prueba->height),
                    prueba->format, static_cast<unsigned>(prueba->len));
                esp_camera_fb_return(prueba);
            }
            else Serial.println("La captura no entrego un cuadro (timeout del driver).");
            if (!capturaVerificada) delay(250);
        }
        if (!capturaVerificada)
        {
            const esp_err_t cierre = esp_camera_deinit();
            if (cierre != ESP_OK) detener("ERROR: no se pudo cerrar la camara para reintentar.");
            delay(500);
        }
    }
    if (!capturaVerificada)
        detener("ERROR: sin captura en ambos modos. Apaga la placa y revisa flex, cable USB y alimentacion.");
    Serial.println("Primera captura OK.");
    if (xTaskCreatePinnedToCore(capturar, "captura", 4096, nullptr, 2, nullptr, 1) != pdPASS)
        detener("ERROR: no se pudo crear la tarea de captura.");

    Serial.println("[3/6] Creando red Wi-Fi...");
    WiFi.mode(WIFI_AP);
    if (!WiFi.softAP(AP_SSID, AP_PASSWORD)) detener("ERROR: no se pudo crear la red Wi-Fi.");
    WiFi.setSleep(false);
    Serial.printf("Red: %s | Clave: %s\n", AP_SSID, AP_PASSWORD);
    Serial.print("IP de la ESP: ");
    Serial.println(WiFi.softAPIP());
    Serial.println("Espera el mensaje 'Servidor listo' antes de abrir la pagina.");

    Serial.println("[4/6] Iniciando lector QR...");
    iniciarQR(ANCHO, ALTO);
    Serial.println("[5/6] Iniciando servidores HTTP...");
    httpd_config_t httpConfig = HTTPD_DEFAULT_CONFIG();
    httpConfig.core_id = 0;
    httpConfig.stack_size = 6144;
    httpConfig.max_open_sockets = 3;
    httpConfig.lru_purge_enable = true;
    httpd_handle_t paginaServidor = nullptr;
    if (httpd_start(&paginaServidor, &httpConfig) != ESP_OK) detener("ERROR: no se pudo iniciar la pagina.");
    httpd_uri_t pagina = {};
    pagina.uri = "/";
    pagina.method = HTTP_GET;
    pagina.handler = enviarPagina;
    httpd_uri_t estado = {};
    estado.uri = "/estado";
    estado.method = HTTP_GET;
    estado.handler = enviarEstado;
    httpd_uri_t qr = {};
    qr.uri = "/qr";
    qr.method = HTTP_GET;
    qr.handler = enviarQR;
    httpd_uri_t foto = {};
    foto.uri = "/foto.jpg";
    foto.method = HTTP_GET;
    foto.handler = enviarFoto;
    if (httpd_register_uri_handler(paginaServidor, &pagina) != ESP_OK ||
        httpd_register_uri_handler(paginaServidor, &estado) != ESP_OK ||
        httpd_register_uri_handler(paginaServidor, &qr) != ESP_OK ||
        httpd_register_uri_handler(paginaServidor, &foto) != ESP_OK)
        detener("ERROR: no se pudieron registrar las rutas de la pagina.");
    // El stream ocupa su propia instancia; /estado sigue respondiendo.
    httpConfig.server_port = 81;
    httpConfig.ctrl_port += 1;
    httpConfig.max_open_sockets = 1;
    httpConfig.stack_size = 6144;
    httpConfig.send_wait_timeout = 3;
    httpd_handle_t videoServidor = nullptr;
    if (httpd_start(&videoServidor, &httpConfig) != ESP_OK) detener("ERROR: no se pudo iniciar el servidor de video.");
    httpd_uri_t ruta = {};
    ruta.uri = "/stream";
    ruta.method = HTTP_GET;
    ruta.handler = transmitir;
    if (httpd_register_uri_handler(videoServidor, &ruta) != ESP_OK) detener("ERROR: no se pudo registrar el video.");
    Serial.print("Servidor listo: http://");
    Serial.println(WiFi.softAPIP());
    Serial.printf("RAM interna libre: %u | PSRAM libre: %u\n",
        static_cast<unsigned>(heap_caps_get_free_size(MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT)),
        static_cast<unsigned>(ESP.getFreePsram()));
    // Reservar primero los recursos de camara, Wi-Fi y HTTP; despues el modelo.
    Serial.println("[6/6] Iniciando deteccion de caras...");
    if (xTaskCreatePinnedToCore(detectarCaras, "caras", 16384, nullptr, 1, nullptr, 1) != pdPASS)
        detener("ERROR: no se pudo crear la tarea de deteccion.");
}

void loop()
{
    static uint32_t ultimoAviso = 0;
    if (millis() - ultimoAviso >= 10000)
    {
        ultimoAviso = millis();
        Serial.print("Servidor listo: http://");
        Serial.println(WiFi.softAPIP());
    }
    delay(1000);
}
