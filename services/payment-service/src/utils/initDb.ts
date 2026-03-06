import fs from "fs";
import path from "path";
import pool from "./db";

export async function initializeDatabase(): Promise<void> {
    const sqlPath = path.resolve(__dirname, "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    try {
        await pool.query(sql);
        console.log("[Payment Service] Database initialized successfully");
    } catch (err) {
        console.error("[Payment Service] Database initialization failed:", err);
        throw err;
    }
}
