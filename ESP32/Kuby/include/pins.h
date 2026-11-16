#pragma once

// RFID
// SDA 8
// SCL 9
// IR 1
// RESET 2
constexpr int RFID_IRQ_PIN = 1;
constexpr int RFID_RESET_PIN = 2;
constexpr int RFID_SDA_PIN = 8;
constexpr int RFID_SCL_PIN = 9;

// Motor a pasos
// IN1 4
// IN2 5
// IN3 6
// IN4 7
constexpr int MOTOR_IN1_PIN = 4;
constexpr int MOTOR_IN2_PIN = 5;
constexpr int MOTOR_IN3_PIN = 6;
constexpr int MOTOR_IN4_PIN = 7;

// Servo motor
// Signal 10
constexpr int SERVO_PIN = 10;

// DHT
// Signal 11
constexpr int DHT_PIN = 11;

// Tira LED
// Data 12
constexpr int LED_PIN = 12;

// Microfono
// SCK 13
// WS 14
// SD 15
constexpr int MIC_SCK_PIN = 13;
constexpr int MIC_WS_PIN = 14;
constexpr int MIC_SD_PIN = 15;