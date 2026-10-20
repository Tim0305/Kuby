#include "SensorBN.h"

SensorBN::SensorBN(int pinData)
{
    this->pinData = pinData;
    pinMode(pinData, INPUT);
}

long SensorBN::getData()
{
    return digitalRead(pinData);
}