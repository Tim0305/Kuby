#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include "pins.h"

Adafruit_PN532 nfc(PN532_IRQ_PIN, PN532_RESET_PIN, &Wire);

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println("Iniciando I2C...");

  Wire.begin(PN532_SDA_PIN, PN532_SCL_PIN, 100000);

  Serial.println("Escaneando dispositivos...");

  for (uint8_t address = 1; address < 127; address++)
  {
    Wire.beginTransmission(address);

    if (Wire.endTransmission() == 0)
    {
      Serial.printf("Encontrado: 0x%02X\n", address);
    }
  }

  Serial.println("Iniciando PN532...");

  nfc.begin();

  uint32_t version = nfc.getFirmwareVersion();

  if (!version)
  {
    Serial.println("ERROR: PN532 no responde.");
    return;
  }

  Serial.printf("Firmware: %lu\n", version);

  nfc.SAMConfig();

  Serial.println("Acerca una tarjeta...");
}

void loop()
{
  Serial.println("Buscando tarjeta...");

  uint8_t uid[7];
  uint8_t uidLength;

  bool success = nfc.readPassiveTargetID(
      PN532_MIFARE_ISO14443A,
      uid,
      &uidLength,
      1000);

  if (success)
  {
    Serial.println("TARJETA DETECTADA");

    for (uint8_t i = 0; i < uidLength; i++)
    {
      Serial.printf("%02X ", uid[i]);
    }

    Serial.println();
  }

  delay(500);
}