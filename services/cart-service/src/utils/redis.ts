import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(REDIS_URL);

redis.on("connect", () => {
    console.log("[Cart Service] Connected to Redis");
});

redis.on("error", (error) => {
    console.error("[Cart Service] Redis connection error:", error);
});
