#include <Arduino.h>
#include <DHT.h>
#include "pins.h"

#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

void setup()
{
    Serial.begin(9600);
    dht.begin();
}

void loop()
{
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
