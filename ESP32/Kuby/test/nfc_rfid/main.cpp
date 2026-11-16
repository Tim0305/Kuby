#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <ESP32Servo.h>
#include "pins.h"

Adafruit_PN532 nfc(
    PN532_IRQ_PIN,
    PN532_RESET_PIN,
    &Wire);

Servo servoPuerta;

bool nfcListo = false;

void iniciarNfc()
{
  nfcListo = false;
  Serial.println("Iniciando PN532: SDA=8, SCL=9, IRQ=1, RESET=2");
  if (!nfc.begin())
  {
    Serial.println("ERROR: no se pudo iniciar el bus del PN532.");
    return;
  }

  // Se escanea despues de begin(), que reinicia y despierta el PN532.
  Serial.println("Escaneando I2C (PN532 esperado en 0x24)...");
  bool encontrado = false;
  bool pn532Responde = false;
  for (uint8_t direccion = 1; direccion < 127; direccion++)
  {
    Wire.beginTransmission(direccion);
    if (Wire.endTransmission() == 0)
    {
      Serial.printf("Dispositivo I2C: 0x%02X\n", direccion);
      encontrado = true;
      pn532Responde |= direccion == 0x24;
    }
  }

  if (!encontrado)
    Serial.println("Ningun dispositivo I2C responde. Revisa modo I2C, alimentacion, GND y SDA/SCL.");

  if (!pn532Responde)
  {
    Serial.println("El PN532 no responde en 0x24; no es un problema de la tarjeta RFID.");
    return;
  }

  const uint32_t version = nfc.getFirmwareVersion();
  if (!version)
  {
    Serial.printf("Hay respuesta en 0x24, pero no se pudo leer el firmware. IRQ GPIO 1: %s\n",
                  digitalRead(PN532_IRQ_PIN) == HIGH ? "HIGH" : "LOW");
    Serial.println("Revisa especialmente IRQ y RESET, ademas del modo I2C.");
    return;
  }

  if (!nfc.SAMConfig() || !nfc.setPassiveActivationRetries(0x02))
  {
    Serial.println("PN532 detectado, pero fallo la configuracion de lectura.");
    return;
  }

  nfcListo = true;
  Serial.println("PN532 DETECTADO. Acerca una tarjeta ISO14443A.");
}

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("===== INICIANDO KUBY =====");

  // PASO 1: I2C
  Serial.println("1. Iniciando I2C");

  if (!Wire.begin(SDA_PIN, SCL_PIN, 100000))
  {
    Serial.println("ERROR: no se pudo iniciar I2C en GPIO 8/9.");
    while (true)
      delay(1000);
  }
  Wire.setTimeOut(50);

  Serial.println("I2C iniciado");

  // PASO 2: NFC
  Serial.println("2. Iniciando PN532");

  iniciarNfc();

  // PASO 3: SERVO
  Serial.println("3. Configurando servo");

  servoPuerta.setPeriodHertz(50);

  servoPuerta.attach(SERVO_PIN, 500, 2400);

  if (servoPuerta.attached())
  {
    Serial.println("SERVO CONFIGURADO CORRECTAMENTE");
  }
  else
  {
    Serial.println("ERROR: Servo no configurado");
  }

  Serial.println("===== SETUP TERMINADO =====");
}

void loop()
{
  if (!nfcListo)
  {
    Serial.println("NFC no disponible. Reintentando en 5 segundos...");
    delay(5000);
    iniciarNfc();
    return;
  }

  uint8_t uid[7];
  uint8_t uidLength = 0;

  bool detectado = nfc.readPassiveTargetID(
      PN532_MIFARE_ISO14443A,
      uid,
      &uidLength,
      1000);

  if (detectado)
  {
    Serial.println("TARJETA DETECTADA");

    Serial.print("UID: ");

    for (uint8_t i = 0; i < uidLength; i++)
    {
      if (uid[i] < 0x10)
        Serial.print("0");
      Serial.print(uid[i], HEX);
      Serial.print(" ");
    }

    Serial.println();

    Serial.println("Orden: ABRIR");

    servoPuerta.write(90);
    delay(5000);

    Serial.println("Orden: CERRAR");

    servoPuerta.write(0);
    delay(1500);
  }
}
