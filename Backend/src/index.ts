import "dotenv/config";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";


const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const tablas = [
  "roles", "espacios", "reservaciones", "historial_accesos",
  "preferencias_usuario",
];

for (const tabla of tablas) {
  app.get(`/api/${tabla}`, async (_req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tabla}\``);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error en la base de datos" });
    }
  });
}

async function contar(tabla: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM \`${tabla}\``
  );
  return Number(rows[0].total);
}

app.get("/api/resumen", async (_req, res) => {
  try {
    const [usuarios, espacios, reservaciones, accesos] = await Promise.all([
      contar("usuarios"),
      contar("espacios"),
      contar("reservaciones"),
      contar("historial_accesos"),
    ]);
    res.json({ usuarios, espacios, reservaciones, accesos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

const sensores = {
  temperatura: { tabla: "lecturas_temperatura", id: "id_lectura_temp", valor: "valor_temperatura", tiempo: "time_temp" },
  humedad:     { tabla: "lecturas_humedad",     id: "id_lectura_hum",  valor: "valor_humedad",     tiempo: "time_hum" },
  proximidad:  { tabla: "lecturas_proximidad",  id: "id_lectura_prox", valor: "deteccion",         tiempo: "time_prox" },
} as const;

type NombreSensor = keyof typeof sensores;

function esSensor(nombre: string): nombre is NombreSensor {
  return Object.prototype.hasOwnProperty.call(sensores, nombre);
}

// Últimas N lecturas de un sensor (historial o gráfica)
app.get("/api/lecturas/:sensor/recientes", async (req, res) => {
  const nombre = req.params.sensor;
  if (!esSensor(nombre)) {
    res.status(404).json({ error: "Sensor no existe" });
    return;
  }
  const s = sensores[nombre];
  const limite = Math.min(Math.max(Math.floor(Number(req.query.limite)) || 100, 1), 500);

  try {
    const [rows] = await pool.query(
      `SELECT \`${s.id}\` AS id, \`${s.valor}\` AS valor, \`${s.tiempo}\` AS fecha, id_espacio
       FROM \`${s.tabla}\`
       ORDER BY \`${s.id}\` DESC
       LIMIT ?`,
      [limite]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

// Lectura más reciente de cada espacio (para tarjetas)
app.get("/api/lecturas/:sensor/ultima", async (req, res) => {
  const nombre = req.params.sensor;
  if (!esSensor(nombre)) {
    res.status(404).json({ error: "Sensor no existe" });
    return;
  }
  const s = sensores[nombre];

  try {
    const [rows] = await pool.query(
      `SELECT l.id_espacio, l.\`${s.valor}\` AS valor, l.\`${s.tiempo}\` AS fecha
       FROM \`${s.tabla}\` l
       JOIN (
         SELECT MAX(\`${s.id}\`) AS max_id
         FROM \`${s.tabla}\`
         GROUP BY id_espacio
       ) u ON u.max_id = l.\`${s.id}\``
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

app.get("/api/usuarios", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre, apellido, estatus, id_rol, creado_en
       FROM usuarios
       ORDER BY apellido, nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});



app.listen(3001, "127.0.0.1", () => console.log("API en http://localhost:3001"));