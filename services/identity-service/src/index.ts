import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import { initializeDatabase } from "./utils/initDb";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "identity-service" });
});

app.use("/api/auth", authRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Identity Service] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[Identity Service] Running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("[Identity Service] Failed to start:", err);
        process.exit(1);
    });

export default app;
