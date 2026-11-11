#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESP_Video.h>
#include <esp_arduino_version.h>
#include <atomic>
#include "camera_pins.h"
#include "imagen_bmp.h"

#if !CONFIG_ESP_VIDEO_ENABLE_DVP_VIDEO_DEVICE
#error "Este test requiere el componente DVP de ESP_Video habilitado."
#endif

ESPVideoClass video;
ESPVideoCaptureDevClass captura;
WebServer servidor(80);
const char *RED = "Kuby-ESP-Video";
const char *CLAVE = "kubycam123";
// El modo nativo OV3660 YUV422 640x480 seleccionado en este SDK usa 20 MHz.
constexpr uint32_t XCLK_HZ = 20000000;
std::atomic<const char *> estado{"Inicializando ESP_Video"};
std::atomic<unsigned> cuadrosSensor{0};
std::atomic<unsigned> erroresCaptura{0};
std::atomic<unsigned> anchoSensor{0}, altoSensor{0};
SemaphoreHandle_t mutexImagen;
uint8_t *ultimaImagen = nullptr;
size_t longitudImagen = 0;
bool imagenJPEG = false;

const char PAGINA[] PROGMEM = R"html(
<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Camara con ESP_Video</title>
<style>body{font-family:system-ui;background:#18212b;color:white;text-align:center}
img{max-width:100%;width:640px;height:auto}button{padding:12px;font-size:1rem}</style>
<h1>Prueba con ESP_Video</h1><p id="estado">Consultando estado...</p>
<p id="datos"></p><button id="tomar">Tomar foto</button>
<p id="resultado"></p><img id="foto" alt="Pulsa Tomar foto para comprobar la imagen">
<p>Solo captura y web. Sin caras ni QR.</p>
<script>
const foto=document.getElementById('foto');
const boton=document.getElementById('tomar');
const resultado=document.getElementById('resultado');
boton.onclick=()=>{boton.disabled=true;resultado.textContent='Solicitando foto...';foto.src='/foto?t='+Date.now();};
foto.onload=()=>{boton.disabled=false;resultado.textContent='Imagen recibida: la captura funciona.';};
foto.onerror=()=>{boton.disabled=false;resultado.textContent='No hay foto disponible. Revisa el estado y el monitor serial.';};
async function consultar(){
 try{
  const r=await fetch('/estado',{cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const s=await r.json();
  document.getElementById('estado').textContent=s.estado;
  document.getElementById('datos').textContent='Cuadros del sensor: '+s.cuadros+
    ' | Errores: '+s.errores+' | Resolucion: '+s.ancho+' x '+s.alto;
 }catch(e){document.getElementById('estado').textContent='Sin conexion con la ESP.';}
 setTimeout(consultar,1000);
}
consultar();
</script></html>
)html";

uint8_t *prepararImagen(ESPVideoBufferClass &buffer, size_t &longitud, bool &esJPEG)
{
    esJPEG = buffer.formatType() == ESP_VIDEO_FORMAT_JPEG;
    if (esJPEG)
    {
        longitud = buffer.size();
        auto *copia = static_cast<uint8_t *>(ps_malloc(longitud));
        if (copia) memcpy(copia, buffer.data(), longitud);
        return copia;
    }
    FormatoImagen formato;
    switch (buffer.formatType())
    {
        case ESP_VIDEO_FORMAT_RGB565: formato = FormatoImagen::RGB565; break;
        case ESP_VIDEO_FORMAT_RGB888: formato = FormatoImagen::RGB888; break;
        case ESP_VIDEO_FORMAT_GRAY8: formato = FormatoImagen::GRIS8; break;
        case ESP_VIDEO_FORMAT_YUV422_YUYV: formato = FormatoImagen::YUYV; break;
        case ESP_VIDEO_FORMAT_YUV422_UYVY: formato = FormatoImagen::UYVY; break;
        default: return nullptr;
    }
    return crearBMP(buffer.data(), buffer.size(), buffer.getWidth(), buffer.getHeight(),
        formato, longitud, ps_malloc);
}

void recibirCuadros(void *)
{
    uint32_t ultimaConversion = 0, ultimoError = 0;
    estado = "Esperando el primer cuadro del driver alternativo";
    for (;;)
    {
        // Esta llamada puede esperar al driver. Solo bloquea esta tarea;
        // la pagina HTTP y el monitor siguen disponibles.
        ESPVideoBufferClass buffer = captura.captureBuffer();
        if (!buffer.valid())
        {
            ++erroresCaptura;
            estado = "ESP_Video no entrego un cuadro; revisa el monitor";
            if (!ultimoError || millis() - ultimoError > 5000)
            {
                ultimoError = millis();
                Serial.println("ESP_Video: captureBuffer() no entrego datos.");
            }
            vTaskDelay(pdMS_TO_TICKS(1000));
            continue;
        }
        const unsigned numero = ++cuadrosSensor;
        anchoSensor = buffer.getWidth();
        altoSensor = buffer.getHeight();
        if (numero == 1 || numero % 100 == 0)
            Serial.printf("ESP_Video captura OK #%u: %lux%lu | %s | %u bytes\n", numero,
                static_cast<unsigned long>(buffer.getWidth()), static_cast<unsigned long>(buffer.getHeight()),
                buffer.formatName(), static_cast<unsigned>(buffer.size()));
        if (ultimaConversion && millis() - ultimaConversion < 500)
        {
            vTaskDelay(pdMS_TO_TICKS(1));
            continue;
        }
        ultimaConversion = millis();
        size_t longitud = 0;
        bool esJPEG = false;
        uint8_t *imagen = prepararImagen(buffer, longitud, esJPEG);
        if (imagen)
        {
            xSemaphoreTake(mutexImagen, portMAX_DELAY);
            free(ultimaImagen);
            ultimaImagen = imagen;
            longitudImagen = longitud;
            imagenJPEG = esJPEG;
            xSemaphoreGive(mutexImagen);
            estado = "Captura funcionando con ESP_Video";
        }
        else
            estado = "Hay cuadros, pero no se pudo preparar la imagen web";
        // El destructor de buffer lo devuelve al driver en cada iteracion.
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

bool iniciarCamara()
{
    ESPVideoCamConfigClass control;
    if (!control.begin(0, CAM_SIOC, CAM_SIOD, 100000, CAM_RESET, CAM_PWDN))
    { estado = "Fallo configurando el bus SCCB"; return false; }
    ESPVideoDVPPinsConfigClass pines;
    if (!pines.begin(CAM_VSYNC, CAM_HREF, CAM_PCLK, CAM_XCLK,
        CAM_D0, CAM_D1, CAM_D2, CAM_D3, CAM_D4, CAM_D5, CAM_D6, CAM_D7))
    { estado = "Fallo configurando los pines DVP"; return false; }
    ESPVideoDVPConfigClass config;
    Serial.printf("ESP_Video: XCLK=%lu Hz (modo OV3660 YUV422 VGA).\n",
        static_cast<unsigned long>(XCLK_HZ));
    if (!config.begin(control, pines, XCLK_HZ))
    { estado = "Fallo creando la configuracion DVP"; return false; }
    if (!video.begin(config))
    { estado = "Fallo al inicializar ESP_Video DVP"; return false; }
    Serial.println("ESP_Video: sensor y controlador DVP inicializados.");
    if (!captura.begin(ESP_VIDEO_DVP_DEVICE_NAME, 2))
    { estado = "Fallo al abrir /dev/video2 o reservar buffers"; return false; }
    Serial.printf("Formato nativo: %s | %lux%lu\n", captura.getFormatName(),
        static_cast<unsigned long>(captura.getWidth()), static_cast<unsigned long>(captura.getHeight()));
    if (!captura.startCapture())
    { estado = "Fallo al iniciar captura DVP"; return false; }
    if (xTaskCreatePinnedToCore(recibirCuadros, "videoDVP", 6144, nullptr, 1, nullptr, 1) != pdPASS)
    {
        captura.stopCapture();
        estado = "Sin memoria para crear la tarea de captura";
        return false;
    }
    return true;
}

void enviarFoto()
{
    xSemaphoreTake(mutexImagen, portMAX_DELAY);
    const size_t longitud = longitudImagen;
    const bool esJPEG = imagenJPEG;
    uint8_t *copia = longitud ? static_cast<uint8_t *>(ps_malloc(longitud)) : nullptr;
    if (copia) memcpy(copia, ultimaImagen, longitud);
    xSemaphoreGive(mutexImagen);
    if (!copia)
    {
        servidor.send(longitud ? 500 : 503, "text/plain; charset=utf-8",
            longitud ? "Sin memoria para enviar la imagen" : estado.load());
        return;
    }
    servidor.sendHeader("Cache-Control", "no-store");
    servidor.setContentLength(longitud);
    servidor.send(200, esJPEG ? "image/jpeg" : "image/bmp", "");
    WiFiClient cliente = servidor.client();
    if (cliente.write(copia, longitud) != longitud) cliente.stop();
    free(copia);
}

void setup()
{
    Serial.begin(115200);
    const uint32_t inicio = millis();
    while (!Serial && millis() - inicio < 5000) delay(20);
    Serial.printf("\nTEST camara_esp_video | Arduino %d.%d.%d\n",
        ESP_ARDUINO_VERSION_MAJOR, ESP_ARDUINO_VERSION_MINOR, ESP_ARDUINO_VERSION_PATCH);
    Serial.println("Captura: ESP_Video / esp_video / esp_cam_sensor; sin esp_camera.");
    Serial.printf("PSRAM: %u bytes\n", static_cast<unsigned>(ESP.getPsramSize()));
    mutexImagen = xSemaphoreCreateMutex();
    if (!mutexImagen || !psramFound())
    {
        while (true) { Serial.println("ERROR: se requiere PSRAM y memoria para el mutex."); delay(5000); }
    }
    const bool camaraLista = iniciarCamara();
    if (!camaraLista) Serial.println(estado.load());
    // No esperar a la primera captura para poder consultar un fallo en la web.
    WiFi.mode(WIFI_AP);
    if (!WiFi.softAP(RED, CLAVE))
    {
        while (true) { Serial.println("ERROR: no se pudo crear la red Wi-Fi."); delay(5000); }
    }
    WiFi.setSleep(false);
    servidor.on("/", HTTP_GET, []() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA); });
    servidor.on("/foto", HTTP_GET, enviarFoto);
    servidor.on("/estado", HTTP_GET, []() {
        char json[280];
        snprintf(json, sizeof(json), "{\"estado\":\"%s\",\"cuadros\":%u,\"errores\":%u,\"ancho\":%u,\"alto\":%u}",
            estado.load(), cuadrosSensor.load(), erroresCaptura.load(), anchoSensor.load(), altoSensor.load());
        servidor.sendHeader("Cache-Control", "no-store");
        servidor.send(200, "application/json", json);
    });
    servidor.begin();
    Serial.printf("Red: %s | Clave: %s\n", RED, CLAVE);
    Serial.print("Servidor listo: http://"); Serial.println(WiFi.softAPIP());
}

void loop()
{
    servidor.handleClient();
    static uint32_t ultimoAviso = 0;
    if (millis() - ultimoAviso >= 10000)
    {
        ultimoAviso = millis();
        Serial.printf("ESP_Video: %s | cuadros=%u | errores=%u\n",
            estado.load(), cuadrosSensor.load(), erroresCaptura.load());
        Serial.print("Web: http://"); Serial.println(WiFi.softAPIP());
    }
    delay(2);
}
