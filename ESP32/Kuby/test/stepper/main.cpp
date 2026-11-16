#include <Arduino.h>
#include <Stepper.h>
#include "pins.h"

const int PASOS_VUELTA = 2048;

// Orden de pines para el ULN2003
Stepper motor(PASOS_VUELTA, MOTOR_IN1_PIN, MOTOR_IN3_PIN, MOTOR_IN2_PIN, MOTOR_IN4_PIN);

void setup()
{
  Serial.begin(115200);

  motor.setSpeed(10);

  Serial.println("Motor paso a paso listo");
}

void loop()
{
  Serial.println("Girando a la derecha");

  motor.step(512);

  delay(1000);

  Serial.println("Girando a la izquierda");

  motor.step(-512);

  delay(1000);
}