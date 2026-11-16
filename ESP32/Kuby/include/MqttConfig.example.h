#pragma once

constexpr char WIFI_SSID[] = "";
constexpr char WIFI_PASSWORD[] = "";
constexpr char MQTT_HOST[] = "192.168.1.100";
constexpr uint16_t MQTT_PORT = 1884;
constexpr char MQTT_USER[] = "kuby-1";
constexpr char MQTT_PASSWORD[] = "";
constexpr char MQTT_DEVICE_ID[] = "kuby-1";

// Pines del ESP32-S3. Ajusta la cantidad de píxeles y el recorrido medido.
constexpr int S3_DHT_PIN = 11;
constexpr int S3_LED_PIN = 12;
constexpr int S3_LED_COUNT = 5;
constexpr int S3_MOTOR_PINS[] = {4, 5, 6, 7};
constexpr long S3_CURTAIN_STEPS = 0; // Semipasos entre cerrada y abierta.
constexpr bool S3_CURTAIN_REVERSE = false;

// Para TLS, usa el puerto del broker y define la CA en formato PEM.
// #define MQTT_CA_CERT "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
