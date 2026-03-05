import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { initializeDatabase } from "./utils/initDb";
import orderRoutes from "./routes/order.routes";

const app = express();
const PORT = process.env.PORT ?? 3004;

app.use(express.json());

app.use("/api", orderRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order-service" });
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
