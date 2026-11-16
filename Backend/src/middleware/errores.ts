import type { ErrorRequestHandler } from "express";
import multer from "multer";

export const manejadorErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  // AGREGA ESTA LÍNEA PARA VER EL ERROR REAL:
  console.error("=== ERROR DEL PORTERO ===", err);

  if (err instanceof multer.MulterError) {
    const grande = err.code === "LIMIT_FILE_SIZE";
    res.status(grande ? 413 : 400).json({
      error: grande ? "La foto no puede pasar de 2 MB" : "Archivo inválido",
    });
    return;
  }
  if ((err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON mal formado" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};