#include <Arduino.h>
#include <ESP_I2S.h>
#include <ESP_SR.h>
#include <esp_partition.h>

#if !CONFIG_IDF_TARGET_ESP32S3 || !CONFIG_MODEL_IN_FLASH
#error "Selecciona el entorno microfono con Arduino-ESP32 3.3.12 y ESP-SR en flash."
#endif
#ifdef CONFIG_SR_MN_EN_NONE
#error "El framework debe incluir el modelo MultiNet en ingles."
#endif

// INMP441: VDD a 3.3 V; GND y L/R a GND (canal izquierdo).
const int I2S_SCK = 42;
const int I2S_WS = 41;
const int I2S_SD = 47;
const uint32_t SAMPLE_RATE = 16000;

I2SClass microfono;

// Cinco niveles de luz: apagada, baja, media, alta y maxima.
// El ID permite calcular el porcentaje con (idComando - 1) * 25.
const sr_cmd_t comandos[] = {
    {1, "Turn off the light"},
    {2, "Set brightness to low"},
    {3, "Set brightness to medium"},
    {4, "Set brightness to high"},
    {5, "Set maximum brightness"},
};
const int NUM_COMANDOS = sizeof(comandos) / sizeof(comandos[0]);

int porcentajeLuz = 0;

// Si falla la configuracion, mostrar el motivo y detener el programa.
void detener(const char *mensaje)
{
    Serial.print("ERROR: ");
    Serial.println(mensaje);
    while (true)
    {
        delay(1000);
    }
}

// ESP_SR llama a esta funcion cuando reconoce una frase o termina su espera.
void alReconocerVoz(sr_event_t evento, int idComando, int idFrase)
{
    switch (evento)
    {
    case SR_EVENT_COMMAND:
        Serial.print("ID comando: ");
        Serial.print(idComando);
        Serial.print(" | ID frase: ");
        Serial.println(idFrase);
        // Hay una frase por comando, con IDs consecutivos de 1 a 5.
        // Usar el mismo ID para mostrar el texto y calcular el porcentaje.
        if (idComando >= 1 && idComando <= NUM_COMANDOS)
        {
            int indice = idComando - 1;
            Serial.print("Comando detectado: ");
            Serial.println(comandos[indice].str);
            porcentajeLuz = (idComando - 1) * 25;
            Serial.print("Porcentaje de luz: ");
            Serial.print(porcentajeLuz);
            Serial.println("%");
            // Agregar aqui el control de la luz usando porcentajeLuz.
        }
        else
        {
            Serial.println("Comando desconocido");
        }
        break;

    case SR_EVENT_TIMEOUT:
    case SR_EVENT_WAKEWORD:
    case SR_EVENT_WAKEWORD_CHANNEL:
        break;

    default:
        return;
    }

    // Continuar escuchando despues del comando o del tiempo de espera.
    if (!ESP_SR.setMode(SR_MODE_COMMAND))
    {
        Serial.println("ERROR: no se pudo reanudar el reconocimiento.");
    }
}

void setup()
{
    Serial.begin(115200);
    // Dar tiempo al monitor serial para conectarse despues del reinicio.
    delay(1500);
    Serial.println();
    Serial.println("Kuby: comandos de voz en ingles sin internet");
    Serial.print("INMP441: SCK=");
    Serial.print(I2S_SCK);
    Serial.print(", WS=");
    Serial.print(I2S_WS);
    Serial.print(", SD=");
    Serial.print(I2S_SD);
    Serial.println("; L/R=GND");

    if (!psramFound())
    {
        detener("No se detecto PSRAM. Usa el entorno microfono para N16R8 (qio_opi).");
    }
    Serial.print("PSRAM: ");
    Serial.print(ESP.getPsramSize());
    Serial.println(" bytes");
    if (esp_partition_find_first(ESP_PARTITION_TYPE_DATA,
                                 ESP_PARTITION_SUBTYPE_ANY, "model") == nullptr)
    {
        detener("Falta la particion model. Carga el firmware con esp_sr_16.csv.");
    }

    microfono.setPins(I2S_SCK, I2S_WS, -1, I2S_SD);
    microfono.setTimeout(1000);
    // El INMP441 envia 24 bits en ranuras de 32 bits; L/R=GND selecciona LEFT.
    if (!microfono.begin(I2S_MODE_STD, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_32BIT,
                         I2S_SLOT_MODE_MONO, I2S_STD_SLOT_LEFT))
    {
        detener("No se pudo iniciar I2S.");
    }
    // ESP_SR necesita PCM con signo de 16 bits, mono, a 16 kHz.
    if (!microfono.configureRX(SAMPLE_RATE, I2S_DATA_BIT_WIDTH_32BIT,
                               I2S_SLOT_MODE_MONO, I2S_RX_TRANSFORM_32_TO_16))
    {
        detener("No se pudo configurar la conversion de audio a 16 bits.");
    }

    ESP_SR.onEvent(alReconocerVoz);
    Serial.println("Iniciando reconocimiento de voz...");
    if (!ESP_SR.begin(microfono, comandos, NUM_COMANDOS,
                      SR_CHANNELS_MONO, SR_MODE_COMMAND, "M"))
    {
        detener("No se pudo iniciar ESP_SR. Revisa PSRAM y la carga de srmodels.bin.");
    }

    Serial.println("Listo. Di directamente cualquiera de estas frases:");
    for (int i = 0; i < NUM_COMANDOS; i++)
    {
        Serial.print("  - ");
        Serial.println(comandos[i].str);
    }
}

void loop()
{
    // ESP_SR captura audio y reconoce los comandos en sus tareas FreeRTOS.
    // No leer el microfono aqui: consumiria las muestras del reconocedor.
    delay(100);
}
