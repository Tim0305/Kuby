#include <Arduino.h>
#include <Stepper.h>

constexpr int MOTOR_IN1_PIN = 4;
constexpr int MOTOR_IN2_PIN = 5;
constexpr int MOTOR_IN3_PIN = 6;
constexpr int MOTOR_IN4_PIN = 7;

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