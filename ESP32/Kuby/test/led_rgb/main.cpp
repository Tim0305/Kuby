#include <Arduino.h>
#include "pins.h"

const int frecuencia = 5000; // 5 kHz (evita parpadeos visibles)
const int resolucion = 8;    // 8 bits (valores de 0 a 255)

// Cambia a 'true' si tu LED es de Ánodo Común (pata larga a 3.3V)
// Déjalo en 'false' si es de Cátodo Común (pata larga a GND)
const bool esAnodoComun = false;

// Función para enviar el brillo (0-255) a cada canal
void establecerColor(int rojo, int verde, int azul)
{
    if (esAnodoComun)
    {
        // En ánodo común la lógica es invertida (0 es brillo máximo, 255 es apagado)
        rojo = 255 - rojo;
        verde = 255 - verde;
        azul = 255 - azul;
    }

    ledcWrite(LED_R_PIN, rojo);
    ledcWrite(LED_G_PIN, verde);
    ledcWrite(LED_B_PIN, azul);
}

void setup()
{
    // Configura el PWM directamente en cada pin
    ledcAttach(LED_R_PIN, frecuencia, resolucion);
    ledcAttach(LED_G_PIN, frecuencia, resolucion);
    ledcAttach(LED_B_PIN, frecuencia, resolucion);
}

void loop()
{
    // Colores básicos (Rojo, Verde, Azul)
    establecerColor(255, 0, 0); // Rojo
    delay(1000);

    establecerColor(0, 255, 0); // Verde
    delay(1000);
}