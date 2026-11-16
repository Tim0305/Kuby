#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include "pins.h"

Adafruit_PN532 nfc(RFID_IRQ_PIN, RFID_RESET_PIN, &Wire);
bool nfcListo = false;

void setup()
{
  Serial.begin(115200);
  delay(2000);
  Serial.println("\nPrueba NFC/RFID: PN532 por I2C");

  if (!Wire.begin(RFID_SDA_PIN, RFID_SCL_PIN, 100000) || !nfc.begin())
  {
    Serial.println("ERROR: no se pudo iniciar la comunicacion I2C.");
    return;
  }

  const uint32_t version = nfc.getFirmwareVersion();
  if (!version)
  {
    Serial.println("ERROR: PN532 no detectado. Revisa conexiones y modo I2C.");
    return;
  }

  Serial.printf("PN5%02X detectado. Firmware %u.%u\n",
                static_cast<unsigned int>((version >> 24) & 0xFF),
                static_cast<unsigned int>((version >> 16) & 0xFF),
                static_cast<unsigned int>((version >> 8) & 0xFF));

  if (!nfc.SAMConfig() || !nfc.setPassiveActivationRetries(0x02))
  {
    Serial.println("ERROR: no se pudo configurar el lector.");
    return;
  }

  nfcListo = true;
  Serial.println("Acerca una tarjeta o etiqueta ISO14443A para leer su UID.");
}

void loop()
{
  if (!nfcListo)
  {
    Serial.println("Lector no disponible. Revisa el cableado y reinicia la placa.");
    delay(3000);
    return;
  }

  uint8_t uid[7] = {};
  uint8_t longitud = 0;
  if (!nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &longitud, 1000))
  {
    delay(100);
    return;
  }

  Serial.printf("Tarjeta detectada (%u bytes). UID: ", longitud);
  for (uint8_t i = 0; i < longitud; ++i)
  {
    if (i > 0)
      Serial.print(':');
    if (uid[i] < 0x10)
      Serial.print('0');
    Serial.print(uid[i], HEX);
  }
  Serial.println();
  delay(1000);
}
