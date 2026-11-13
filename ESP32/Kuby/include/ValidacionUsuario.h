#pragma once

enum class ResultadoValidacion
{
  Aprobado,
  Denegado,
  Error,
  SinRespuesta
};

using AlValidarUsuario = void (*)(ResultadoValidacion);

// Llamar desde loop() cuando esté disponible el código procesado del RFID.
// Devuelve true al enviar la solicitud. El resultado llega de forma asíncrona.
bool solicitarValidacionUsuario(const char *codigo, AlValidarUsuario alValidar = nullptr);
