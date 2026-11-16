#include <Arduino.h>
#include <FastLED.h>
#include "pins.h"

#define DHT_TYPE DHT11
const int LED_PIN = LED_PIN;
const int NUM_LEDS = 5;
CRGB leds[NUM_LEDS];

void setup()
{
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  Serial.begin(9600);
}

void loop()
{
  // Leds
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Yellow1; // LED encendido
  }

  FastLED.show();
}