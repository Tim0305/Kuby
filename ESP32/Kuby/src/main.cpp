#include <Arduino.h>
#include <DHT.h>
#if CONFIG_IDF_TARGET_ESP32S3
#include <Adafruit_NeoPixel.h>
#else
#include <ESP32Servo.h>
#endif
#include <PubSubClient.h>
#include <WiFi.h>
#include <esp_system.h>

#include "ValidacionUsuario.h"

#if __has_include("MqttConfig.h")
#include "MqttConfig.h"
#else
#include "MqttConfig.example.h"
#endif

#ifdef MQTT_CA_CERT
#include <WiFiClientSecure.h>
#include <time.h>
WiFiClientSecure network;
#else
WiFiClient network;
#endif

namespace
{
#if CONFIG_IDF_TARGET_ESP32S3
constexpr int DHT_PIN = S3_DHT_PIN;
Adafruit_NeoPixel strip(S3_LED_COUNT, S3_LED_PIN, NEO_GRB + NEO_KHZ800);
constexpr uint8_t motorSequence[] = {1, 3, 2, 6, 4, 12, 8, 9};
constexpr unsigned long STEP_INTERVAL_US = 4000;
constexpr long BENCH_STEPS_PER_TURN = 4096;
long curtainPosition = 0;
long curtainTarget = 0;
long curtainTravel = 0;
unsigned long lastStep = 0;
uint8_t phase = 0;
bool motorEnergized = false;
#else
constexpr int DHT_PIN = 13;
constexpr int SENSOR_BN_PIN = 14;
constexpr int LED_PIN = 27;
constexpr int SERVO_PIN = 26;
Servo servo;
bool manualCurtain = false;
#endif
constexpr unsigned long TELEMETRY_INTERVAL = 30000;
constexpr unsigned long RETRY_INTERVAL = 5000;
constexpr unsigned long AUTH_TIMEOUT = 5000;

DHT dht(DHT_PIN, DHT11);
PubSubClient mqtt(network);
String telemetryTopic;
String levelsTopic;
String authRequestTopic;
String authResultPrefix;
String pendingAuthTopic;
AlValidarUsuario authCallback = nullptr;
unsigned long authSentAt = 0;
unsigned long lastTelemetry = 0;
unsigned long lastConnectAttempt = 0;
bool mqttConfigured = false;
bool firstTelemetry = true;

void setLight(unsigned int level)
{
#if CONFIG_IDF_TARGET_ESP32S3
  unsigned int encendidos = (level * strip.numPixels() + 50) / 100;
  strip.clear();
  if (encendidos > 0)
    strip.fill(strip.Color(0, 0, 255), 0, encendidos);
  strip.show();
#else
  if (LED_PIN >= 0)
    analogWrite(LED_PIN, map(level, 0, 100, 0, 255));
#endif
}

#if CONFIG_IDF_TARGET_ESP32S3
void writeMotor(uint8_t mask)
{
  for (int i = 0; i < 4; ++i)
    digitalWrite(S3_MOTOR_PINS[i], (mask >> i) & 1);
}

void serviceCurtain()
{
  unsigned long now = micros();
  if (now - lastStep < STEP_INTERVAL_US)
    return;

  if (curtainPosition == curtainTarget)
  {
    if (motorEnergized)
    {
      writeMotor(0);
      motorEnergized = false;
    }
    return;
  }

  lastStep = now;
  int direction = curtainTarget > curtainPosition ? 1 : -1;
  int phaseStep = S3_CURTAIN_REVERSE ? -direction : direction;
  phase = (phase + 8 + phaseStep) % 8;
  writeMotor(motorSequence[phase]);
  motorEnergized = true;
  curtainPosition += direction;
}
#endif

void finishValidation(ResultadoValidacion result)
{
  pendingAuthTopic = "";
  auto callback = authCallback;
  authCallback = nullptr;
  switch (result)
  {
    case ResultadoValidacion::Aprobado: Serial.println("Autenticacion aprobada"); break;
    case ResultadoValidacion::Denegado: Serial.println("Autenticacion denegada"); break;
    case ResultadoValidacion::Error: Serial.println("Error al validar en el backend"); break;
    case ResultadoValidacion::SinRespuesta: Serial.println("Validacion sin respuesta"); break;
  }
  if (callback)
    callback(result);
}

void receiveMqtt(char *topic, byte *payload, unsigned int length)
{
  if (pendingAuthTopic.length() && pendingAuthTopic == topic)
  {
    if (millis() - authSentAt >= AUTH_TIMEOUT)
      return;
    if (length == 2 && memcmp(payload, "ok", 2) == 0)
      finishValidation(ResultadoValidacion::Aprobado);
    else if (length == 8 && memcmp(payload, "denegado", 8) == 0)
      finishValidation(ResultadoValidacion::Denegado);
    else if (length == 5 && memcmp(payload, "error", 5) == 0)
      finishValidation(ResultadoValidacion::Error);
    return;
  }

  if (levelsTopic != topic || length < 3 || length > 7)
    return;

  char levels[8] = {};
  unsigned int separator = 0;
  for (unsigned int i = 0; i < length; ++i)
  {
    if (payload[i] == ' ' && i > 0 && separator == 0)
      separator = i;
    else if (payload[i] < '0' || payload[i] > '9')
      return;
    levels[i] = payload[i];
  }

  if (separator == 0 || separator > 3 || length - separator < 2 || length - separator > 4)
    return;
  levels[separator] = '\0';
  unsigned int light = atoi(levels);
  unsigned int curtain = atoi(levels + separator + 1);
  if (light > 100 || curtain > 100)
    return;

  setLight(light);
#if CONFIG_IDF_TARGET_ESP32S3
  if (curtainTravel > 0)
  {
    curtainTarget = map(curtain, 0, 100, 0, curtainTravel);
    Serial.printf("Posicion solicitada: %ld semipasos\n", curtainTarget);
  }
  else
    Serial.println("Cortina pendiente de calibrar. Solo se aplica el nivel de luz.");
#else
  manualCurtain = true;
  if (SERVO_PIN >= 0)
    servo.write(map(curtain, 0, 100, 0, 180));
#endif
  Serial.printf("Orden MQTT: luz %u%%, cortina %u%%\n", light, curtain);
}

void handleSerialCommand(const String &command)
{
#if CONFIG_IDF_TARGET_ESP32S3
  if (command == "cortina cero" || command == "motor banco")
  {
    if (curtainPosition != curtainTarget)
    {
      Serial.println("Espera a que el motor se detenga");
      return;
    }
    bool bench = command == "motor banco";
    if (!bench && S3_CURTAIN_STEPS <= 0)
    {
      Serial.println("Configura el recorrido medido para usar cortina cero");
      return;
    }
    curtainTravel = bench ? BENCH_STEPS_PER_TURN : S3_CURTAIN_STEPS;
    curtainPosition = curtainTarget = 0;
    Serial.println(bench ? "Prueba de banco: 100% = 4096 semipasos nominales" : "Cortina cerrada registrada como 0%");
    return;
  }
#endif
  if (command.startsWith("auth "))
  {
    if (!solicitarValidacionUsuario(command.c_str() + 5))
      Serial.println("Codigo invalido, MQTT desconectado o validacion pendiente");
    return;
  }

  if (command.length() && strspn(command.c_str(), "0123456789") == command.length())
    setLight(constrain(command.toInt(), 0L, 100L));
}

void readSerial()
{
  static String command;
  static bool overflow = false;
  while (Serial.available())
  {
    char c = Serial.read();
    if (c == '\n')
    {
      if (!overflow)
        handleSerialCommand(command);
      command = "";
      overflow = false;
    }
    else if (c != '\r' && !overflow)
    {
      if (command.length() < 69)
        command += c;
      else
        overflow = true;
    }
  }
}

void serviceMqtt()
{
  if (!mqttConfigured || WiFi.status() != WL_CONNECTED)
    return;

  if (mqtt.connected())
  {
    mqtt.loop();
    return;
  }

#ifdef MQTT_CA_CERT
  // El reloj se usa al verificar la vigencia del certificado.
  if (time(nullptr) < 1700000000)
    return;
#endif

  unsigned long now = millis();
  if (now - lastConnectAttempt < RETRY_INTERVAL)
    return;
  lastConnectAttempt = now;
  if (!mqtt.connect(MQTT_DEVICE_ID, MQTT_USER, MQTT_PASSWORD))
  {
    Serial.printf("Conexion MQTT fallida (%d)\n", mqtt.state());
    return;
  }

  String authSubscription = authResultPrefix + "+";
  if (!mqtt.subscribe(levelsTopic.c_str()) || !mqtt.subscribe(authSubscription.c_str()))
  {
    mqtt.disconnect();
    return;
  }
  Serial.println("MQTT conectado");
  firstTelemetry = true;
}

void publishTelemetry()
{
  if (DHT_PIN < 0)
    return;

  unsigned long now = millis();
  if ((!firstTelemetry || now < 2000) && now - lastTelemetry < TELEMETRY_INTERVAL)
    return;
  firstTelemetry = false;
  lastTelemetry = now;

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature))
  {
    Serial.println("No se pudo leer el DHT11");
    return;
  }

  Serial.printf("Temperatura %.1f C, humedad %.1f%%\n", temperature, humidity);
  if (mqtt.connected())
  {
    char payload[80];
    snprintf(payload, sizeof(payload), "{\"temperatura\":%.1f,\"humedad\":%.1f}",
             temperature, humidity);
    mqtt.publish(telemetryTopic.c_str(), payload, false);
  }
}
}

bool solicitarValidacionUsuario(const char *codigo, AlValidarUsuario alValidar)
{
  constexpr char caracteres[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-";
  if (!codigo || !mqtt.connected() || pendingAuthTopic.length())
    return false;

  size_t length = strnlen(codigo, 65);
  if (length == 0 || length > 64 || strspn(codigo, caracteres) != length)
    return false;

  char requestId[17];
  snprintf(requestId, sizeof(requestId), "%08lx%08lx",
           static_cast<unsigned long>(esp_random()), static_cast<unsigned long>(esp_random()));
  String payload = String(requestId) + " " + codigo;
  if (!mqtt.publish(authRequestTopic.c_str(), payload.c_str(), false))
    return false;

  pendingAuthTopic = authResultPrefix + requestId;
  authSentAt = millis();
  authCallback = alValidar;
  return true;
}

void setup()
{
  Serial.begin(9600);
#if CONFIG_IDF_TARGET_ESP32S3
  strip.begin();
  setLight(0);
  for (int pin : S3_MOTOR_PINS)
    pinMode(pin, OUTPUT);
  writeMotor(0);
#else
  if (LED_PIN >= 0)
  {
    pinMode(LED_PIN, OUTPUT);
    analogWriteResolution(LED_PIN, 8);
    setLight(0);
  }
  if (SERVO_PIN >= 0)
    servo.attach(SERVO_PIN);
  if (SENSOR_BN_PIN >= 0)
    pinMode(SENSOR_BN_PIN, INPUT);
#endif
  if (DHT_PIN >= 0)
    dht.begin();

  if (!WIFI_SSID[0] || !MQTT_HOST[0] || !MQTT_USER[0] || !MQTT_PASSWORD[0])
  {
    Serial.println("Copia MqttConfig.example.h a MqttConfig.h y configura Wi-Fi y MQTT");
    return;
  }

  String prefix = String("kuby/") + MQTT_DEVICE_ID;
  telemetryTopic = prefix + "/telemetria";
  levelsTopic = prefix + "/niveles";
  authRequestTopic = prefix + "/auth/solicitud";
  authResultPrefix = prefix + "/auth/respuesta/";

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(receiveMqtt);
  mqtt.setSocketTimeout(2);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
#ifdef MQTT_CA_CERT
  network.setCACert(MQTT_CA_CERT);
  network.setHandshakeTimeout(3);
  configTime(0, 0, "pool.ntp.org");
#endif
  lastConnectAttempt = millis() - RETRY_INTERVAL;
  mqttConfigured = true;
}

void loop()
{
  serviceMqtt();
  if (pendingAuthTopic.length() && millis() - authSentAt >= AUTH_TIMEOUT)
    finishValidation(ResultadoValidacion::SinRespuesta);
  readSerial();

#if CONFIG_IDF_TARGET_ESP32S3
  serviceCurtain();
#else
  if (!manualCurtain && SERVO_PIN >= 0 && SENSOR_BN_PIN >= 0)
    servo.write(digitalRead(SENSOR_BN_PIN) == LOW ? 180 : 0);
#endif

  publishTelemetry();
  delay(1);
}
