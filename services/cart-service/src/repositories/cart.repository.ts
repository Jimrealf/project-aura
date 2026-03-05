import { redis } from "../utils/redis";
import { Cart } from "../types/cart.types";

const CART_TTL = 900;

function cartKey(userId: string): string {
    return `cart:${userId}`;
}

export class CartRepository {
    async get(userId: string): Promise<Cart | null> {
        const data = await redis.get(cartKey(userId));
        if (!data) return null;
        return JSON.parse(data) as Cart;
    }

    async set(userId: string, cart: Cart): Promise<void> {
        await redis.set(cartKey(userId), JSON.stringify(cart), "EX", CART_TTL);
    }

    async del(userId: string): Promise<void> {
        await redis.del(cartKey(userId));
    }
}

export const cartRepository = new CartRepository();
