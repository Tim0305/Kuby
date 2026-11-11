import "dotenv/config";

function requerida(nombre: string): string{
    const valor = process.env[nombre];
    if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
    return valor;
}

export const config = {
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

