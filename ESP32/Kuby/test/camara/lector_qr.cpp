#include "lector_qr.h"
#include <Arduino.h>
#include <mbedtls/base64.h>
#include "quirc/quirc.h"

namespace {
quirc *lector = nullptr;
quirc_code *codigo = nullptr;
quirc_data *datos = nullptr;
SemaphoreHandle_t mutexQR = nullptr;
uint8_t *ultimoContenido = nullptr;
size_t longitudContenido = 0;
uint32_t ultimaLectura = 0;
uint32_t lecturas = 0;
int anchoImagen = 0;
int altoImagen = 0;
bool listo = false;
SemaphoreHandle_t imagenDisponible = nullptr;
TaskHandle_t tareaQR = nullptr;
constexpr size_t MAX_BASE64 = 4 * ((QUIRC_MAX_PAYLOAD + 2) / 3) + 1;
void procesarQR();

void ejecutarQR(void *)
{
    for (;;)
    {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        procesarQR();
        xSemaphoreGive(imagenDisponible);
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}
}

bool iniciarQR(int ancho, int alto)
{
    mutexQR = xSemaphoreCreateMutex();
    imagenDisponible = xSemaphoreCreateBinary();
    lector = quirc_new();
    codigo = static_cast<quirc_code *>(ps_malloc(sizeof(quirc_code)));
    datos = static_cast<quirc_data *>(ps_malloc(sizeof(quirc_data)));
    ultimoContenido = static_cast<uint8_t *>(ps_malloc(QUIRC_MAX_PAYLOAD));
    listo = mutexQR && imagenDisponible && lector && codigo && datos && ultimoContenido &&
            quirc_resize(lector, ancho, alto) == 0;
    anchoImagen = ancho;
    altoImagen = alto;
    if (listo)
        listo = xTaskCreatePinnedToCore(ejecutarQR, "lectorQR", 12288, nullptr, 1, &tareaQR, 1) == pdPASS;
    if (!listo)
    {
        if (lector) quirc_destroy(lector);
        lector = nullptr;
        free(codigo);
        free(datos);
        free(ultimoContenido);
        codigo = nullptr;
        datos = nullptr;
        ultimoContenido = nullptr;
        if (mutexQR) vSemaphoreDelete(mutexQR);
        if (imagenDisponible) vSemaphoreDelete(imagenDisponible);
        mutexQR = nullptr;
        imagenDisponible = nullptr;
        Serial.println("ERROR: no se pudo reservar memoria para leer QR.");
        return false;
    }
    xSemaphoreGive(imagenDisponible);
    Serial.println("Lector QR listo (tarea independiente, buffers en PSRAM).");
    return true;
}

void analizarQR(const uint8_t *rgb)
{
    // Solo una imagen en vuelo. Saltar si el lector aun esta ocupado,
    // en lugar de bloquear el analisis de caras o acumular cuadros viejos.
    if (!listo || xSemaphoreTake(imagenDisponible, 0) != pdTRUE) return;
    uint8_t *gris = quirc_begin(lector, nullptr, nullptr);
    for (int i = 0; i < anchoImagen * altoImagen; ++i)
    {
        const uint8_t *pixel = rgb + i * 3;
        gris[i] = (77 * pixel[0] + 150 * pixel[1] + 29 * pixel[2]) >> 8;
    }
    xTaskNotifyGive(tareaQR);
}

namespace {
void procesarQR()
{
    quirc_end(lector);
    const int encontrados = quirc_count(lector);
    for (int i = 0; i < encontrados; ++i)
    {
        quirc_extract(lector, i, codigo);
        quirc_decode_error_t resultado = quirc_decode(codigo, datos);
        if (resultado == QUIRC_ERROR_DATA_ECC)
        {
            quirc_flip(codigo);
            resultado = quirc_decode(codigo, datos);
        }
        if (resultado != QUIRC_SUCCESS) continue;
        const size_t longitud = datos->payload_len;
        const uint32_t ahora = millis();
        xSemaphoreTake(mutexQR, portMAX_DELAY);
        const bool nuevo = lecturas == 0 || longitud != longitudContenido ||
                           memcmp(ultimoContenido, datos->payload, longitud) != 0 ||
                           ahora - ultimaLectura > 2500;
        memcpy(ultimoContenido, datos->payload, longitud);
        longitudContenido = longitud;
        ultimaLectura = ahora;
        if (nuevo) ++lecturas;
        xSemaphoreGive(mutexQR);
        if (nuevo)
        {
            Serial.print("QR detectado: ");
            // Escapar controles para que el contenido no altere la terminal.
            for (size_t j = 0; j < longitud; ++j)
            {
                const uint8_t c = datos->payload[j];
                if (c < 32 || c == 127) Serial.printf("\\x%02x", c);
                else Serial.write(c);
            }
            Serial.println();
        }
        // Un resultado por imagen: presenta un QR a la vez.
        break;
    }
}
}

esp_err_t enviarQR(httpd_req_t *peticion)
{
    httpd_resp_set_type(peticion, "application/json");
    httpd_resp_set_hdr(peticion, "Cache-Control", "no-store");
    if (!listo) return httpd_resp_sendstr(peticion, "{\"listo\":false}");
    auto *base64 = static_cast<unsigned char *>(ps_malloc(MAX_BASE64));
    if (!base64) return httpd_resp_send_err(peticion, HTTPD_500_INTERNAL_SERVER_ERROR, "Sin memoria");
    size_t longitudBase64 = 0;
    xSemaphoreTake(mutexQR, portMAX_DELAY);
    const uint32_t contador = lecturas;
    const uint32_t edad = contador ? millis() - ultimaLectura : 0;
    const size_t bytes = longitudContenido;
    const int resultado = mbedtls_base64_encode(base64, MAX_BASE64, &longitudBase64,
                                               ultimoContenido, bytes);
    xSemaphoreGive(mutexQR);
    if (resultado != 0)
    {
        free(base64);
        return httpd_resp_send_err(peticion, HTTPD_500_INTERNAL_SERVER_ERROR, "Error al codificar QR");
    }
    char cabecera[160];
    snprintf(cabecera, sizeof(cabecera),
        "{\"listo\":true,\"lecturas\":%lu,\"edad_ms\":%lu,\"bytes\":%u,\"contenido_b64\":\"",
        static_cast<unsigned long>(contador), static_cast<unsigned long>(edad), static_cast<unsigned>(bytes));
    // Base64 preserva bytes y evita que comillas, saltos o NUL rompan el JSON.
    esp_err_t envio = httpd_resp_send_chunk(peticion, cabecera, strlen(cabecera));
    if (envio == ESP_OK && longitudBase64)
        envio = httpd_resp_send_chunk(peticion, reinterpret_cast<char *>(base64), longitudBase64);
    if (envio == ESP_OK) envio = httpd_resp_send_chunk(peticion, "\"}", 2);
    if (envio == ESP_OK) envio = httpd_resp_send_chunk(peticion, nullptr, 0);
    free(base64);
    return envio;
}
