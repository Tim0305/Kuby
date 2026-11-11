#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>
#include <esp_err.h>
#include <esp_arduino_version.h>
#include <esp_system.h>
#include <img_converters.h>
#include "camera_pins.h"

#ifdef CAMARA_RGB565
constexpr pixformat_t FORMATO = PIXFORMAT_RGB565;
const char *NOMBRE_FORMATO = "RGB565";
#else
constexpr pixformat_t FORMATO = PIXFORMAT_JPEG;
const char *NOMBRE_FORMATO = "JPEG";
#endif

const char *RED = "Kuby-Camara-Test";
const char *CLAVE = "kubycam123";
WebServer servidor(80);
esp_err_t estadoCamara = ESP_FAIL;
unsigned capturas = 0;
unsigned fallos = 0;

const char PAGINA[] PROGMEM = R"html(
<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prueba de camara</title>
<style>body{font-family:system-ui;text-align:center;background:#18212b;color:white}
img{width:640px;max-width:100%;height:auto}p{padding:0 1rem}</style>
<h1>Prueba de camara</h1><p id="estado">Solicitando imagen...</p>
<img id="foto" alt="Imagen de la camara">
<p>Solo camara. Capturas de 320 x 240, sin deteccion de caras ni QR.</p>
<script>
const foto=document.getElementById('foto');
const estado=document.getElementById('estado');
function actualizar(){foto.src='/foto.jpg?t='+Date.now();}
foto.onload=()=>{estado.textContent='Camara funcionando';setTimeout(actualizar,200);};
foto.onerror=async()=>{
  estado.textContent='No se recibio una imagen; reintentando...';
  try{
    const r=await fetch('/estado',{cache:'no-store'});
    const s=await r.json();
    estado.textContent=s.iniciada?
      'Camara inicializada, pero fallo la captura. Revisa el monitor serial.':
      'Error al iniciar camara: '+s.error;
  }catch(e){estado.textContent='Sin conexion con la ESP. Revisa la red Wi-Fi.';}
  setTimeout(actualizar,2000);
};
actualizar();
</script></html>
)html";

bool cuadroValido(camera_fb_t *foto)
{
    return foto && foto->format == FORMATO && foto->len > 0;
}

void enviarFoto()
{
    if (estadoCamara != ESP_OK)
    {
        servidor.send(503, "text/plain", "Camara no inicializada");
        return;
    }
    camera_fb_t *foto = esp_camera_fb_get();
    if (!cuadroValido(foto))
    {
        if (foto) esp_camera_fb_return(foto);
        ++fallos;
        Serial.printf("ERROR: captura %u fallida; revisa los mensajes del driver.\n", fallos);
        servidor.send(503, "text/plain", "No se pudo capturar una imagen");
        return;
    }
    uint8_t *jpegConvertido = nullptr;
    uint8_t *jpeg = foto->buf;
    size_t longitudJpeg = foto->len;
    if (foto->format != PIXFORMAT_JPEG)
    {
        if (!frame2jpg(foto, 80, &jpegConvertido, &longitudJpeg))
        {
            free(jpegConvertido);
            esp_camera_fb_return(foto);
            ++fallos;
            Serial.println("RGB capturado, pero fallo su conversion a JPEG para la web.");
            servidor.send(500, "text/plain", "Fallo al convertir RGB a JPEG");
            return;
        }
        jpeg = jpegConvertido;
    }
    servidor.sendHeader("Cache-Control", "no-store");
    servidor.setContentLength(longitudJpeg);
    servidor.send(200, "image/jpeg", "");
    WiFiClient cliente = servidor.client();
    const size_t enviados = cliente.write(jpeg, longitudJpeg);
    if (enviados != longitudJpeg) cliente.stop();
    ++capturas;
    if (capturas == 1 || capturas % 30 == 0)
        Serial.printf("Captura OK #%u: %ux%u, %u bytes de sensor; JPEG enviado %u\n", capturas,
            static_cast<unsigned>(foto->width), static_cast<unsigned>(foto->height),
            static_cast<unsigned>(foto->len), static_cast<unsigned>(enviados));
    free(jpegConvertido);
    esp_camera_fb_return(foto);
}

void setup()
{
    Serial.begin(115200);
    const uint32_t inicio = millis();
    while (!Serial && millis() - inicio < 5000) delay(20);
    Serial.println("\nTEST camara_web: solo camara, Wi-Fi y HTTP");
    Serial.printf("Arduino-ESP32: %d.%d.%d | ESP-IDF: %s\n",
        ESP_ARDUINO_VERSION_MAJOR, ESP_ARDUINO_VERSION_MINOR, ESP_ARDUINO_VERSION_PATCH,
        esp_get_idf_version());
    Serial.printf("Formato de prueba: %s\n", NOMBRE_FORMATO);
    Serial.printf("PSRAM: %s | bytes: %u\n", psramFound() ? "OK" : "NO DETECTADA",
        static_cast<unsigned>(ESP.getPsramSize()));

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
    config.pixel_format = FORMATO;
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    Serial.printf("Iniciando camara: %s QVGA, 20 MHz, un buffer...\n", NOMBRE_FORMATO);
    estadoCamara = esp_camera_init(&config);
    Serial.printf("esp_camera_init: %s (0x%x)\n", esp_err_to_name(estadoCamara), estadoCamara);
    if (estadoCamara == ESP_OK)
    {
        sensor_t *sensor = esp_camera_sensor_get();
        if (sensor) Serial.printf("Sensor PID: 0x%04x\n", sensor->id.PID);
        delay(500);
        camera_fb_t *prueba = esp_camera_fb_get();
        Serial.println(cuadroValido(prueba) ? "Primera captura OK" :
            "ERROR: no hay primera captura. La web seguira disponible para reintentar.");
        if (prueba) Serial.printf("Primera imagen: %ux%u | formato=%d | bytes=%u (antes de Wi-Fi)\n",
            static_cast<unsigned>(prueba->width), static_cast<unsigned>(prueba->height),
            prueba->format, static_cast<unsigned>(prueba->len));
        if (prueba) esp_camera_fb_return(prueba);
    }
    // El servidor arranca incluso si no hay imagen, para mostrar el error.
    WiFi.mode(WIFI_AP);
    if (!WiFi.softAP(RED, CLAVE))
    {
        while (true)
        {
            Serial.println("ERROR: no se pudo crear la red Wi-Fi.");
            delay(5000);
        }
    }
    WiFi.setSleep(false);
    servidor.on("/", HTTP_GET, []() { servidor.send_P(200, "text/html; charset=utf-8", PAGINA); });
    servidor.on("/foto.jpg", HTTP_GET, enviarFoto);
    servidor.on("/estado", HTTP_GET, []() {
        char json[180];
        snprintf(json, sizeof(json), "{\"iniciada\":%s,\"error\":\"%s\",\"capturas\":%u,\"fallos\":%u,\"formato\":\"%s\"}",
            estadoCamara == ESP_OK ? "true" : "false", esp_err_to_name(estadoCamara), capturas, fallos, NOMBRE_FORMATO);
        servidor.sendHeader("Cache-Control", "no-store");
        servidor.send(200, "application/json", json);
    });
    servidor.begin();
    Serial.printf("Red: %s | Clave: %s\n", RED, CLAVE);
    Serial.print("Servidor listo: http://");
    Serial.println(WiFi.softAPIP());
}

void loop()
{
    servidor.handleClient();
    static uint32_t ultimoAviso = 0;
    if (millis() - ultimoAviso >= 10000)
    {
        ultimoAviso = millis();
        Serial.print("Test camara_web: http://");
        Serial.println(WiFi.softAPIP());
    }
    delay(2);
}
