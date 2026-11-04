#ifndef SENSORBN_H
#define SENSORBN_H

#include "Arduino.h"

class SensorBN
{
public:
    int pinData;
    SensorBN(int pinData);
    long getData();
};

#endif