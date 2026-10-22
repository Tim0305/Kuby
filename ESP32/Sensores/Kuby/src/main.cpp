#include <Arduino.h>
#include <DHT.h>
#include <ESP32Servo.h>

#include "SensorBN.h"

#define DHT_TYPE DHT11

const int DHT_PIN = 13;
const int SENSOR_BN_PIN = 14;
const int LED_PIN = 27;
const int SERVO_PIN = 26;

DHT dht(DHT_PIN, DHT_TYPE);
SensorBN sensorBN(SENSOR_BN_PIN);
Servo servo;

void setup()
{
  analogWriteResolution(LED_PIN, 8); // 8 bits de resolución
  Serial.begin(9600);
  dht.begin();
  servo.attach(SERVO_PIN);
  pinMode(LED_PIN, OUTPUT);
}

void loop()
{
  if (Serial.available() > 0)
  {
    String numStr = Serial.readStringUntil('\n');
    int intensity = constrain(numStr.toInt(), 0, 100);

    while (Serial.available() > 0)
      Serial.read();

    Serial.print("Intensidad: ");
    Serial.print(intensity);
    Serial.println("%");

    analogWrite(LED_PIN, map(intensity, 0, 100, 0, 255));
  }

  /* Sensor BN */
  if (sensorBN.getData() == 0)
  {
    Serial.println("Detectado");
    servo.write(180);
  }
  else
    servo.write(0);

  /* Temperatura */
  float h = dht.readHumidity();    // Leemos la Humedad
  float t = dht.readTemperature(); // Leemos la temperatura en grados Celsius
  Serial.print("Humedad ");
  Serial.print(h);
  Serial.print(" %t");
  Serial.print("Temperatura: ");
  Serial.print(t);
  Serial.println(" *C ");
}