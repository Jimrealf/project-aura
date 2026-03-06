import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response, NextFunction } from "express";
import { connectDb } from "./utils/db";
import productRoutes from "./routes/product.routes";
import { metricsMiddleware, metricsEndpoint } from "@aura/metrics";

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(metricsMiddleware);
app.use(express.json());

app.use("/api/products", productRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "catalog-service" });
});
app.get("/metrics", metricsEndpoint);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Catalog Service] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
});

const start = async () => {
    await connectDb();
    app.listen(PORT, () => {
        console.log(`[Catalog Service] Running on http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    start();
}

export default app;
