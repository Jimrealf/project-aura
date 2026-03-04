import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3004;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "order-service" });
});

app.listen(PORT, () => {
    console.log(`[Order Service] Running on http://localhost:${PORT}`);
});

export default app;
