#include <Arduino.h>
#include <ESP32Encoder.h>
#include "pins.h"

ESP32Encoder encoder;

long previousValue = 0;

void setup()
{
    Serial.begin(115200);
    pinMode(ENCODER_SW_PIN, INPUT_PULLUP);

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

    if (digitalRead(ENCODER_SW_PIN) == LOW)
    {
        Serial.println("Presionado");
        delay(200);
    }
}