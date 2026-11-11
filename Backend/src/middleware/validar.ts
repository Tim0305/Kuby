import type { Request, RequestHandler, Response } from "express";
import { z } from "zod";
import type { ZodType } from "zod";

export function parsearBody<T extends ZodType>(
  esquema: T,
  req: Request,
  res: Response
): z.output<T> | null {
  const resultado = esquema.safeParse(req.body);
  if (!resultado.success) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: resultado.error.issues.map((i) => ({
        campo: i.path.map(String).join("."),
        mensaje: i.message,
      })),
    });
    return null;
  }
  return resultado.data as z.output<T>;
}

export function validarBody(esquema: ZodType): RequestHandler {
  return (req, res, next) => {
    const datos = parsearBody(esquema, req, res);
    if (datos === null) return;
    req.body = datos;
    next();
  };
}

export const validarId: RequestHandler = (req, res, next) => {
  const n = Number(req.params.id);
  if (!Number.isInteger(n) || n <= 0) {
    res.status(400).json({ error: "Id inválido" });
    return;
  }
  next();
};