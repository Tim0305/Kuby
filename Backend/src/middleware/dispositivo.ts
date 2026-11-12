import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

const esperada = Buffer.from(config.sensorApiKey);

export const requireDispositivo: RequestHandler = (req, res, next) => {
  const recibida = Buffer.from(String(req.header("x-api-key") ?? ""));
  const valida =
    recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  if (!valida) {
    res.status(401).json({ error: "Clave de dispositivo inválida" });
    return;
  }
  next();
};