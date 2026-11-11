import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db.js";

export const lecturasRouter = Router();