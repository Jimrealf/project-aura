import axios from "axios";
import { CartResponse } from "../types/order.types";

const CART_URL = process.env.CART_SERVICE_URL!;

export async function fetchCart(token: string): Promise<CartResponse> {
    const response = await axios.get(`${CART_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data as CartResponse;
}

export async function clearCart(token: string): Promise<void> {
    await axios.delete(`${CART_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
    });
}
