#include <Arduino.h>
#include <ESP32Encoder.h>

constexpr int ENCODER_CLK_PIN = 21;
constexpr int ENCODER_DT_PIN = 16;

ESP32Encoder encoder;

long previousValue = 0;

void setup()
{
    Serial.begin(115200);

    ESP32Encoder::useInternalWeakPullResistors = puType::up;

    encoder.attachFullQuad(
        ENCODER_DT_PIN,
        ENCODER_CLK_PIN);

    encoder.setFilter(500);
    encoder.clearCount();
}

void loop()
{
    long currentValue = encoder.getCount() / 4;

    if (currentValue != previousValue)
    {
        Serial.printf("Contador: %ld\n", currentValue);
        previousValue = currentValue;
    }
}