#include <Arduino.h>
#include <DHT.h>

#define DHT_TYPE DHT11
const int DHT_PIN = 13;

DHT dht(DHT_PIN, DHT_TYPE);

void setup()
{
  Serial.begin(9600);
  Serial.println("Iniciando...");
  dht.begin();
}

void loop()
{
  delay(2000);
  float h = dht.readHumidity();    // Leemos la Humedad
  float t = dht.readTemperature(); // Leemos la temperatura en grados Celsius
  Serial.print("Humedad ");
  Serial.print(h);
  Serial.print(" %t");
  Serial.print("Temperatura: ");
  Serial.print(t);
  Serial.println(" *C ");
}