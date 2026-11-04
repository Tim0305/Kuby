#include <Arduino.h>
#include <ESP_I2S.h>
#include <ESP_SR.h>
#include <esp_partition.h>
#include <esp_rom_sys.h>

#if !CONFIG_IDF_TARGET_ESP32S3 || !CONFIG_MODEL_IN_FLASH
#error "Selecciona el entorno microfono con Arduino-ESP32 3.3.12 y ESP-SR en flash."
#endif
#ifdef CONFIG_SR_MN_EN_NONE
#error "El framework debe incluir el modelo MultiNet en ingles."
#endif

namespace {
// INMP441: VDD a 3.3 V; GND y L/R a GND (canal izquierdo).
constexpr int I2S_SCK = 42;
constexpr int I2S_WS = 41;
constexpr int I2S_SD = 47;
constexpr uint32_t SAMPLE_RATE = 16000;

I2SClass microfono;

enum Comando {
    LUZ_ENCENDER = 1,
    LUZ_APAGAR,
    VENTILADOR_ENCENDER,
    VENTILADOR_APAGAR,
};

// Lista cerrada de frases en ingles; ESP_SR genera sus fonemas localmente.
// Varias frases pueden compartir el mismo identificador de comando.
const sr_cmd_t comandos[] = {
    {LUZ_ENCENDER, "Turn on the light"},
    {LUZ_ENCENDER, "Lights on"},
    {LUZ_APAGAR, "Turn off the light"},
    {LUZ_APAGAR, "Lights off"},
    {VENTILADOR_ENCENDER, "Start fan"},
    {VENTILADOR_APAGAR, "Stop fan"},
};
constexpr size_t NUM_COMANDOS = sizeof(comandos) / sizeof(comandos[0]);

[[noreturn]] void detener(const char *mensaje)
{
    esp_rom_printf("ERROR: %s\n", mensaje);
    while (true) {
        delay(1000);
        esp_rom_printf("ERROR: %s\n", mensaje);
    }
}

void reanudarEscucha()
{
    if (!ESP_SR.setMode(SR_MODE_COMMAND)) {
        esp_rom_printf("%s\n", "ERROR: no se pudo reanudar el reconocimiento.");
    }
}

void alReconocerVoz(sr_event_t evento, int idComando, int idFrase)
{
    switch (evento) {
    case SR_EVENT_COMMAND:
        if (idFrase >= 0 && static_cast<size_t>(idFrase) < NUM_COMANDOS) {
            esp_rom_printf("Comando detectado: %s | ID: %d\n",
                          comandos[idFrase].str, idComando);
        } else {
            esp_rom_printf("Comando detectado | ID: %d\n", idComando);
        }
        // Punto de integracion para las acciones de Kuby.
        // Por ahora solo reportamos el comando, sin asignar pines de actuadores.
        switch (idComando) {
        case LUZ_ENCENDER: esp_rom_printf("%s\n", "Accion: encender luz"); break;
        case LUZ_APAGAR: esp_rom_printf("%s\n", "Accion: apagar luz"); break;
        case VENTILADOR_ENCENDER: esp_rom_printf("%s\n", "Accion: encender ventilador"); break;
        case VENTILADOR_APAGAR: esp_rom_printf("%s\n", "Accion: apagar ventilador"); break;
        default: esp_rom_printf("%s\n", "Comando desconocido"); break;
        }
        reanudarEscucha();
        break;
    case SR_EVENT_TIMEOUT:
        // MultiNet cierra su ventana tras unos segundos: volver a escuchar.
        reanudarEscucha();
        break;
    case SR_EVENT_WAKEWORD:
    case SR_EVENT_WAKEWORD_CHANNEL:
        reanudarEscucha();
        break;
    default:
        break;
    }
}
} // namespace

void setup()
{
    // Usar la consola ROM, como los logs visibles de ESP_SR. La salida
    // de Serial (HWCDC) no estaba llegando al monitor de esta placa.
    delay(1500);
    esp_rom_printf("%s\n", "\nKuby: comandos de voz en ingles sin internet");
    esp_rom_printf("INMP441: SCK=%d, WS=%d, SD=%d; L/R=GND\n",
                  I2S_SCK, I2S_WS, I2S_SD);

    if (!psramFound()) {
        detener("No se detecto PSRAM. Usa el entorno microfono para N16R8 (qio_opi).");
    }
    esp_rom_printf("PSRAM: %lu bytes\n", static_cast<unsigned long>(ESP.getPsramSize()));
    if (esp_partition_find_first(ESP_PARTITION_TYPE_DATA,
                                 ESP_PARTITION_SUBTYPE_ANY, "model") == nullptr) {
        detener("Falta la particion model. Carga el firmware con esp_sr_16.csv.");
    }

    microfono.setPins(I2S_SCK, I2S_WS, -1, I2S_SD);
    microfono.setTimeout(1000);
    // El INMP441 envia 24 bits en ranuras de 32 bits; L/R=GND selecciona LEFT.
    if (!microfono.begin(I2S_MODE_STD, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_32BIT,
                         I2S_SLOT_MODE_MONO, I2S_STD_SLOT_LEFT)) {
        detener("No se pudo iniciar I2S.");
    }
    // ESP_SR necesita PCM con signo de 16 bits, mono, a 16 kHz.
    if (!microfono.configureRX(SAMPLE_RATE, I2S_DATA_BIT_WIDTH_32BIT,
                               I2S_SLOT_MODE_MONO, I2S_RX_TRANSFORM_32_TO_16)) {
        detener("No se pudo configurar la conversion de audio a 16 bits.");
    }

    ESP_SR.onEvent(alReconocerVoz);
    esp_rom_printf("%s\n", "Iniciando ESP_SR y registrando comandos...");
    if (!ESP_SR.begin(microfono, comandos, NUM_COMANDOS,
                      SR_CHANNELS_MONO, SR_MODE_COMMAND, "M")) {
        detener("No se pudo iniciar ESP_SR. Revisa PSRAM y la carga de srmodels.bin.");
    }

    esp_rom_printf("%s\n", "Listo. Di directamente cualquiera de estas frases:");
    for (const auto &comando : comandos) {
        esp_rom_printf("  - %s\n", comando.str);
    }
}

void loop()
{
    // ESP_SR captura audio y reconoce los comandos en sus tareas FreeRTOS.
    // No leer el microfono aqui: consumiria las muestras del reconocedor.
    static unsigned long ultimoAviso = 0;
    if (millis() - ultimoAviso >= 5000) {
        ultimoAviso = millis();
        esp_rom_printf("%s\n", "Listo: reconocimiento iniciado. Prueba: Turn on the light");
    }
    delay(100);
}
