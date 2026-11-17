import "dotenv/config";

function requerida(nombre: string): string{
    const valor = process.env[nombre];
    if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
    return valor;
}

const frontendUrl = new URL(process.env.FRONTEND_URL || "http://localhost:5173");
if (!["http:", "https:"].includes(frontendUrl.protocol) || frontendUrl.username || frontendUrl.password || frontendUrl.pathname !== "/" || frontendUrl.search || frontendUrl.hash) {
    throw new Error("FRONTEND_URL debe ser un origen HTTP(S), sin ruta ni credenciales");
}

export const config = {
    frontendUrl: frontendUrl.origin,
    db: {
        host: requerida("DB_HOST"),
        port: Number(requerida("DB_PORT")),
        user: requerida("DB_USER"),
        password: process.env.DB_PASSWORD ?? "", // en XAMPP va vacía
        database: requerida("DB_NAME"),
    },
    jwtSecret: requerida("JWT_SECRET"),
    sensorApiKey: requerida("SENSOR_API_KEY"),
};

