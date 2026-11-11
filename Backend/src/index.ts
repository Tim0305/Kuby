import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.routes.js";
import { lecturasRouter } from "./routes/lecturas.routes.js";
import { manejadorErrores } from "./middleware/errores.js";
import { usuariosRouter } from "./routes/usuarios.routes.js";


const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/usuarios", usuariosRouter);   // <- nueva
app.use("/api", lecturasRouter);

app.use(manejadorErrores); // siempre al final

app.listen(3001, "127.0.0.1", () => console.log("API en http://localhost:3001"));