import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";
import { metricsMiddleware, metricsEndpoint } from "@aura/metrics";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(metricsMiddleware);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
});

app.use(globalLimiter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "api-gateway" });
});

app.get("/metrics", metricsEndpoint);

app.use(
    "/api/auth",
    strictLimiter,
    createProxyMiddleware({
        target: "http://localhost:3001",
        changeOrigin: true,
    })
);

app.use(
    "/api/products",
    createProxyMiddleware({
        target: "http://localhost:3002",
        changeOrigin: true,
    })
);

app.use(
    "/api/cart",
    createProxyMiddleware({
        target: "http://localhost:3003",
        changeOrigin: true,
    })
);

app.use(
    "/api/orders",
    createProxyMiddleware({
        target: "http://localhost:3004",
        changeOrigin: true,
    })
);

app.use(
    "/api/checkout",
    strictLimiter,
    createProxyMiddleware({
        target: "http://localhost:3004",
        changeOrigin: true,
    })
);

app.use(
    "/api/payments",
    createProxyMiddleware({
        target: "http://localhost:3005",
        changeOrigin: true,
    })
);

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[API Gateway] Running on http://localhost:${PORT}`);
        console.log(`[API Gateway] Swagger UI at http://localhost:${PORT}/api-docs`);
    });
}

export default app;
