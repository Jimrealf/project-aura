import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "identity-service" });
});

app.listen(PORT, () => {
    console.log(`[Identity Service] Running on http://localhost:${PORT}`);
});

export default app;
