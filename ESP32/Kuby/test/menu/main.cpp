
#include <Arduino.h>
#include <Wire.h>
#include "SSD1306Wire.h"
#include <ESP32Encoder.h>
#include "pins.h"

// -------------------- OLED --------------------

constexpr int OLED_SCL = OLED_SCL_PIN;
constexpr int OLED_SDA = OLED_SDA_PIN;
constexpr int OLED_ADDRESS = 0x3C;

SSD1306Wire display(
    OLED_ADDRESS,
    OLED_SDA,
    OLED_SCL,
    GEOMETRY_128_64);

// -------------------- ENCODER --------------------

ESP32Encoder encoder;

long previousValue = 0;

// -------------------- MENU --------------------

const char *menuOptions[] = {
    "Sensores",
    "Bluetooth",
    "WiFi",
    "Configuracion",
    "Informacion",
    "Reiniciar",
    "Acerca de"};

constexpr int MENU_SIZE =
    sizeof(menuOptions) / sizeof(menuOptions[0]);

constexpr int VISIBLE_ITEMS = 4;

int selectedOption = 0;

// -------------------- DIBUJAR MENU --------------------

void drawMenu()
{

    display.clear();

    // Titulo
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.setFont(ArialMT_Plain_10);

    display.drawString(64, 0, "MENU PRINCIPAL");

    display.drawHorizontalLine(0, 12, 128);

    // Calcular primera opcion visible
    int firstVisible = selectedOption - VISIBLE_ITEMS / 2;

    if (firstVisible < 0)
        firstVisible = 0;

    if (firstVisible > MENU_SIZE - VISIBLE_ITEMS)
        firstVisible = MENU_SIZE - VISIBLE_ITEMS;

    firstVisible = max(0, firstVisible);

    // Dibujar opciones
    for (int i = 0; i < VISIBLE_ITEMS; i++)
    {

        int optionIndex = firstVisible + i;

        if (optionIndex >= MENU_SIZE)
            break;

        int y = 15 + (i * 12);

        // Seleccion actual
        if (optionIndex == selectedOption)
        {

            display.setColor(WHITE);
            display.fillRect(0, y - 1, 128, 12);

            display.setColor(BLACK);
        }
        else
        {

            display.setColor(WHITE);
        }

        display.setTextAlignment(TEXT_ALIGN_LEFT);
        display.setFont(ArialMT_Plain_10);

        display.drawString(
            5,
            y,
            String(optionIndex == selectedOption ? "> " : "  ") +
                menuOptions[optionIndex]);
    }

    // Restaurar color
    display.setColor(WHITE);

    display.display();
}

// -------------------- SELECCIONAR --------------------

void selectOption()
{

    display.clear();

    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.setFont(ArialMT_Plain_10);

    display.drawString(64, 15, "Seleccionaste:");

    display.setFont(ArialMT_Plain_16);

    display.drawString(
        64,
        35,
        menuOptions[selectedOption]);

    display.display();

    Serial.print("Seleccionado: ");
    Serial.println(menuOptions[selectedOption]);

    delay(700);

    drawMenu();
}

// -------------------- SETUP --------------------

void setup()
{

    Serial.begin(115200);

    // Inicializar OLED
    display.init();
    display.flipScreenVertically();
    display.clear();

    // Inicializar encoder
    ESP32Encoder::useInternalWeakPullResistors = puType::up;

    encoder.attachFullQuad(
        ENCODER_DT_PIN,
        ENCODER_CLK_PIN);

    encoder.setFilter(500);
    encoder.clearCount();

    pinMode(ENCODER_SW_PIN, INPUT_PULLUP);

    drawMenu();

    Serial.println("Menu iniciado");
}

// -------------------- LOOP --------------------

void loop()
{

    // Leer encoder
    long currentValue = encoder.getCount() / 4;

    if (currentValue != previousValue)
    {

        previousValue = currentValue;

        selectedOption = ((currentValue % MENU_SIZE) + MENU_SIZE) % MENU_SIZE;

        drawMenu();
    }

    // Leer pulsador
    static bool lastButtonState = HIGH;
    static unsigned long lastButtonTime = 0;

    bool currentButtonState = digitalRead(ENCODER_SW_PIN);

    if (lastButtonState == HIGH &&
        currentButtonState == LOW &&
        millis() - lastButtonTime > 200)
    {

        lastButtonTime = millis();
        selectOption();
    }

    lastButtonState = currentButtonState;
}
