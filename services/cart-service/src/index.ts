import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart-service" });
});

app.listen(PORT, () => {
    console.log(`[Cart Service] Running on http://localhost:${PORT}`);
});

export default app;
