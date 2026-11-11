#pragma once
#include <stdint.h>
#include <esp_http_server.h>

bool iniciarQR(int ancho, int alto);
void analizarQR(const uint8_t *rgb);
esp_err_t enviarQR(httpd_req_t *peticion);
