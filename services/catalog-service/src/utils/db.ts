import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/aura_catalog";

export const connectDb = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`[Catalog Service] Connected to MongoDB at ${MONGO_URI}`);
    } catch (error) {
        console.error("[Catalog Service] Failed to connect to MongoDB", error);
        process.exit(1);
    }
};
