import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { connectDb } from "./utils/db";
import productRoutes from "./routes/product.routes";

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(express.json());

app.use("/api/products", productRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "catalog-service" });
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
