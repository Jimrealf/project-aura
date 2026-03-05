import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cartRoutes from "./routes/cart.routes";

const app = express();
const PORT = process.env.PORT ?? 3003;

app.use(express.json());

app.use("/api/cart", cartRoutes);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cart-service" });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Cart Service] Running on http://localhost:${PORT}`);
    });
}

export default app;
