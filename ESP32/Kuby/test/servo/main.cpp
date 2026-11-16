#include <Arduino.h>
#include <ESP32Servo.h>

constexpr int SERVO_PIN = 10;
Servo servo;

void setup()
{
  Serial.begin(9600);
  servo.setPeriodHertz(50);
  servo.attach(SERVO_PIN);
}

void loop()
{
  Serial.println("Servo: 180 grados");
  servo.write(180);
  delay(1000);
  Serial.println("Servo: 0 grados");
  servo.write(0);
  delay(1000);
}
