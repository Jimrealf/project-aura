import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "catalog-service" });
});

app.listen(PORT, () => {
    console.log(`[Catalog Service] Running on http://localhost:${PORT}`);
});

export default app;
