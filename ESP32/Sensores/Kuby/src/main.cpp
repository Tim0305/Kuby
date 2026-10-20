#include <Arduino.h>
#include <DHT.h>

#include "SensorBN.h"

#define DHT_TYPE DHT11

const int DHT_PIN = 13;
const int SENSOR_BN_PIN = 14;

DHT dht(DHT_PIN, DHT_TYPE);
SensorBN sensorBN(SENSOR_BN_PIN);

void setup()
{
  Serial.begin(9600);
  dht.begin();
}

void loop()
{

  /* Sensor BN */
  if (sensorBN.getData() == 0)
    Serial.println("Detectado");

  /* Temperatura
  float h = dht.readHumidity();    // Leemos la Humedad
  float t = dht.readTemperature(); // Leemos la temperatura en grados Celsius
  Serial.print("Humedad ");
  Serial.print(h);
  Serial.print(" %t");
  Serial.print("Temperatura: ");
  Serial.print(t);
  Serial.println(" *C ");
  */
}