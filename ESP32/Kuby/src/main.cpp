#include <Arduino.h>
// #include <DHT.h>
// #include <ESP32Servo.h>
// #include <ESP_I2S.h>
// #include <ESP_SR.h>
// #include <esp_partition.h>
// #include <Stepper.h>
#include <FastLED.h>
#include "SensorBN.h"
#include "pins.h"

#define DHT_TYPE DHT11
const int NUM_LEDS = 5;
CRGB leds[NUM_LEDS];

// DHT dht(DHT_PIN, DHT_TYPE);
// SensorBN sensorBN(SENSOR_BN_PIN);
// Servo servo;

void setup()
{
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  Serial.begin(9600);
  // dht.begin();
  // servo.attach(SERVO_PIN);
  // pinMode(LED_PIN, OUTPUT);
}

void loop()
{
  // Leds
  for (int i = 0; i < NUM_LEDS; i++)
  {
    leds[i] = CRGB::Yellow1; // LED encendido
  }

  FastLED.show();

  // if (Serial.available() > 0)
  // {
  //   String numStr = Serial.readStringUntil('\n');
  //   int intensity = constrain(numStr.toInt(), 0, 100);

  //   while (Serial.available() > 0)
  //     Serial.read();

  //   Serial.print("Intensidad: ");
  //   Serial.print(intensity);
  //   Serial.println("%");

  //   analogWrite(LED_PIN, map(intensity, 0, 100, 0, 255));
  // }

  // /* Sensor BN */
  // if (sensorBN.getData() == 0)
  // {
  //   Serial.println("Detectado");
  //   servo.write(180);
  // }
  // else
  //   servo.write(0);

  // /* Temperatura */
  // float h = dht.readHumidity();    // Leemos la Humedad
  // float t = dht.readTemperature(); // Leemos la temperatura en grados Celsius
  // Serial.print("Humedad ");
  // Serial.print(h);
  // Serial.print(" %t");
  // Serial.print("Temperatura: ");
  // Serial.print(t);
  // Serial.println(" *C ");
}