#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>

// Conversion independiente del driver esp_camera; BMP de 24 bits para la web.
enum class FormatoImagen { RGB565, RGB888, GRIS8, YUYV, UYVY };

inline uint8_t limitarColor(int n) { return n < 0 ? 0 : n > 255 ? 255 : n; }
inline void escribir32(uint8_t *p, uint32_t n)
{
    for (int i = 0; i < 4; ++i) p[i] = (n >> (8 * i)) & 255;
}

inline uint8_t *crearBMP(const uint8_t *fuente, size_t bytes, unsigned ancho,
    unsigned alto, FormatoImagen formato, size_t &longitud,
    void *(*reservar)(size_t) = malloc)
{
    longitud = 0;
    if (!fuente || !ancho || !alto || ancho > 4096 || alto > 4096) return nullptr;
    const unsigned bpp = formato == FormatoImagen::RGB888 ? 3 : formato == FormatoImagen::GRIS8 ? 1 : 2;
    const bool yuv = formato == FormatoImagen::YUYV || formato == FormatoImagen::UYVY;
    if ((yuv && (ancho & 1)) || bytes < static_cast<size_t>(ancho) * alto * bpp) return nullptr;
    unsigned paso = (ancho + 319) / 320;
    if ((alto + 239) / 240 > paso) paso = (alto + 239) / 240;
    const unsigned w = (ancho + paso - 1) / paso;
    const unsigned h = (alto + paso - 1) / paso;
    const size_t fila = (w * 3 + 3) & ~size_t(3);
    const size_t total = 54 + fila * h;
    auto *bmp = static_cast<uint8_t *>(reservar(total));
    if (!bmp) return nullptr;
    memset(bmp, 0, total);
    bmp[0] = 'B'; bmp[1] = 'M';
    escribir32(bmp + 2, total); escribir32(bmp + 10, 54);
    escribir32(bmp + 14, 40); escribir32(bmp + 18, w);
    escribir32(bmp + 22, static_cast<uint32_t>(-static_cast<int32_t>(h)));
    bmp[26] = 1; bmp[28] = 24; escribir32(bmp + 34, fila * h);
    for (unsigned y = 0; y < h; ++y)
        for (unsigned x = 0; x < w; ++x)
        {
            const unsigned sx = x * paso, sy = y * paso;
            const size_t i = (static_cast<size_t>(sy) * ancho + sx) * bpp;
            uint8_t r, g, b;
            if (formato == FormatoImagen::RGB565)
            {
                const uint16_t p = fuente[i] | (fuente[i + 1] << 8);
                r = ((p >> 11) & 31) * 255 / 31;
                g = ((p >> 5) & 63) * 255 / 63;
                b = (p & 31) * 255 / 31;
            }
            else if (formato == FormatoImagen::RGB888)
            { r = fuente[i]; g = fuente[i + 1]; b = fuente[i + 2]; }
            else if (formato == FormatoImagen::GRIS8)
            { r = g = b = fuente[i]; }
            else
            {
                const size_t par = (static_cast<size_t>(sy) * ancho + (sx & ~1u)) * 2;
                const bool uyvy = formato == FormatoImagen::UYVY;
                const int yy = fuente[par + (sx & 1) * 2 + (uyvy ? 1 : 0)];
                const int u = fuente[par + (uyvy ? 0 : 1)] - 128;
                const int v = fuente[par + (uyvy ? 2 : 3)] - 128;
                const int c = yy > 16 ? yy - 16 : 0;
                r = limitarColor((298 * c + 409 * v + 128) >> 8);
                g = limitarColor((298 * c - 100 * u - 208 * v + 128) >> 8);
                b = limitarColor((298 * c + 516 * u + 128) >> 8);
            }
            uint8_t *destino = bmp + 54 + y * fila + x * 3;
            destino[0] = b; destino[1] = g; destino[2] = r;
        }
    longitud = total;
    return bmp;
}
