import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express, { Request, Response, NextFunction } from "express";
import cartRoutes from "./routes/cart.routes";
import { metricsMiddleware, metricsEndpoint } from "@aura/metrics";

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(metricsMiddleware);
app.use(express.json());

app.use("/api/cart", cartRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart-service" });
});
app.get("/metrics", metricsEndpoint);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Cart Service] Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Cart Service] Running on http://localhost:${PORT}`);
    });
}

export default app;
