#include <Arduino.h>
#include <Wire.h>
#include "SSD1306Wire.h"
#include "pins.h"

#define OLED_SDA OLED_SDA_PIN
#define OLED_SCL OLED_SCL_PIN
#define OLED_ADDRESS 0x3C

SSD1306Wire display(
    OLED_ADDRESS,
    OLED_SDA,
    OLED_SCL,
    GEOMETRY_128_64);

void setup()
{
    Serial.begin(115200);

    display.init();
    display.flipScreenVertically();

    display.clear();

    display.setTextAlignment(TEXT_ALIGN_CENTER);

    display.setFont(ArialMT_Plain_10);
    display.drawString(64, 5, "PRUEBA DE PANTALLA");

    display.drawHorizontalLine(0, 20, 128);

    display.setFont(ArialMT_Plain_16);
    display.drawString(64, 28, "128 x 64");

    display.drawRect(5, 48, 118, 14);

    display.display();
}

void loop()
{
}