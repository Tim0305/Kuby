import { connect } from "mqtt";
import { pool } from "../db.js";
import { LecturaHumedadDto, LecturaTemperaturaDto } from "../dto/lecturas.dto.js";
import { validarAcceso } from "./accesos.js";

function iniciarMqtt() {
  const url = process.env.MQTT_URL;
  if (!url) return;

  const protocolo = new URL(url).protocol;
  const id = process.env.MQTT_DEVICE_ID || "kuby-1";
  const espacio = Number(process.env.MQTT_SPACE_ID || "1");
  const username = process.env.MQTT_USER;
  const password = process.env.MQTT_PASSWORD;
  if (!["mqtt:", "mqtts:"].includes(protocolo) || !username || !password) {
    throw new Error("Revisa MQTT_URL, MQTT_USER y MQTT_PASSWORD");
  }
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id) || !Number.isSafeInteger(espacio) || espacio < 1) {
    throw new Error("Revisa MQTT_DEVICE_ID y MQTT_SPACE_ID");
  }

  const prefijo = `kuby/${id}`;
  const telemetria = `${prefijo}/telemetria`;
  const solicitud = `${prefijo}/auth/solicitud`;
  const cliente = connect(url, { username, password, queueQoSZero: false, resubscribe: false });
  let listo = false;

  cliente.on("connect", () => {
    cliente.subscribe([telemetria, solicitud], (error, temas) => {
      listo = !error && !!temas && temas.length === 2 && temas.every(({ qos }) => qos === 0);
      if (listo) console.log(`MQTT conectado para ${id} (cubículo ${espacio})`);
      else console.error("MQTT: no se pudo suscribir a telemetría y solicitudes RFID");
    });
  });
  cliente.on("close", () => { listo = false; });
  cliente.on("error", (error) => console.error("MQTT:", error.message));
  cliente.on("message", async (tema, datos, paquete) => {
    if (paquete.retain || datos.length > 128) return;

    if (tema === solicitud) {
      const mensaje = /^([a-f0-9]{16}) ([A-Za-z0-9._:-]{1,64})$/.exec(datos.toString());
      if (!mensaje) return;
      const [, idSolicitud, credencial] = mensaje;
      let resultado = "error";
      try {
        const acceso = await validarAcceso({ id_espacio: espacio, metodo: "rfid", credencial });
        if (acceso) resultado = acceso.acceso ? "ok" : "denegado";
        else console.error("MQTT: el cubículo configurado no existe");
      } catch (error) {
        console.error("MQTT: no se pudo validar el acceso", error instanceof Error ? error.name : "");
      }
      cliente.publish(`${prefijo}/auth/respuesta/${idSolicitud}`, resultado, (error) => {
        if (error) console.error("MQTT: no se pudo responder al ESP32");
      });
      return;
    }

    if (tema !== telemetria) return;
    let lectura: { temperatura?: unknown; humedad?: unknown } | null;
    try {
      lectura = JSON.parse(datos.toString());
    } catch {
      return;
    }
    const temperatura = LecturaTemperaturaDto.safeParse({ id_espacio: espacio, valor: lectura?.temperatura });
    const humedad = LecturaHumedadDto.safeParse({ id_espacio: espacio, valor: lectura?.humedad });
    if (!temperatura.success || !humedad.success) return;

    try {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.execute("INSERT INTO lecturas_temperatura (valor_temperatura, id_espacio) VALUES (?, ?)", [temperatura.data.valor, espacio]);
        await conn.execute("INSERT INTO lecturas_humedad (valor_humedad, id_espacio) VALUES (?, ?)", [humedad.data.valor, espacio]);
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error("MQTT: no se pudo guardar la telemetría", error);
    }
  });

  return {
    espacio,
    conectado: () => listo && cliente.connected,
    async publicarNiveles(luz: number, cortina: number) {
      if (!listo || !cliente.connected) throw new Error("Broker desconectado");
      await cliente.publishAsync(`${prefijo}/niveles`, `${luz} ${cortina}`);
    },
  };
}

export const dispositivoMqtt = iniciarMqtt();
