import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { dispositivoMqtt } from "../services/mqtt.js";

export const dispositivosRouter = Router();
const porcentaje = z.number().int().min(0).max(100);
const niveles = z.strictObject({ luz: porcentaje, cortina: porcentaje });

dispositivosRouter.get("/:id/dispositivo", requireAuth, requireAdmin, (req, res) => {
  const configurado = !!dispositivoMqtt && String(dispositivoMqtt.espacio) === req.params.id;
  res.json({ configurado, brokerConectado: configurado && !!dispositivoMqtt?.conectado() });
});

dispositivosRouter.put("/:id/dispositivo/niveles", requireAuth, requireAdmin, async (req, res) => {
  if (!dispositivoMqtt || String(dispositivoMqtt.espacio) !== req.params.id) {
    res.status(404).json({ error: "Este cubículo no tiene un dispositivo MQTT configurado" });
    return;
  }
  const datos = niveles.safeParse(req.body);
  if (!datos.success) {
    res.status(400).json({ error: "Luz y cortina deben ser enteros de 0 a 100" });
    return;
  }
  try {
    await dispositivoMqtt.publicarNiveles(datos.data.luz, datos.data.cortina);
    res.status(202).json({ publicado: true });
  } catch {
    res.status(503).json({ error: "El backend no pudo publicar la orden por MQTT" });
  }
});
