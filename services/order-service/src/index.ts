import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response, NextFunction } from "express";
import { initializeDatabase } from "./utils/initDb";
import orderRoutes from "./routes/order.routes";
import { metricsMiddleware, metricsEndpoint } from "@aura/metrics";

const app = express();
const PORT = process.env.PORT ?? 3004;

app.use(metricsMiddleware);
app.use(express.json());

app.use("/api", orderRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order-service" });
});
app.get("/metrics", metricsEndpoint);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Order Service] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
});

const start = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`[Order Service] Running on http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    start();
}

export default app;
