import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response, NextFunction } from "express";
import { initializeDatabase } from "./utils/initDb";
import paymentRoutes from "./routes/payment.routes";

const app = express();
const PORT = process.env.PORT ?? 3005;

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());

app.use("/api/payments", paymentRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "payment-service" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Payment Service] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
});

const start = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`[Payment Service] Running on http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    start();
}

export default app;
