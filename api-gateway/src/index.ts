import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "api-gateway" });
});

app.use(
    "/api/auth",
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
    createProxyMiddleware({
        target: "http://localhost:3004",
        changeOrigin: true,
    })
);

app.listen(PORT, () => {
    console.log(`[API Gateway] Running on http://localhost:${PORT}`);
    console.log(`[API Gateway] Swagger UI at http://localhost:${PORT}/api-docs`);
});

export default app;
