import axios from "axios";
import { OrderResponse } from "../types/payment.types";

const ORDER_URL = process.env.ORDER_SERVICE_URL;

export async function fetchOrder(orderId: string, token: string): Promise<OrderResponse | null> {
    try {
        const response = await axios.get(`${ORDER_URL}/api/orders/me/${orderId}`, {
            headers: { Authorization: token },
        });
        if (response.data.success) {
            return response.data.data as OrderResponse;
        }
        return null;
    } catch {
        return null;
    }
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
    const adminToken = `Bearer ${process.env.INTERNAL_ADMIN_TOKEN}`;
    await axios.patch(
        `${ORDER_URL}/api/orders/${orderId}/status`,
        { status },
        { headers: { Authorization: adminToken } }
    );
}
