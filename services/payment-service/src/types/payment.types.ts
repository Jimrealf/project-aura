export interface Payment {
    id: string;
    order_id: string;
    user_id: string;
    stripe_payment_intent_id: string;
    amount: number;
    currency: string;
    status: string;
    failure_reason: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface OrderResponse {
    id: string;
    user_id: string;
    status: string;
    subtotal: string;
    shipping: string;
    total: string;
    items: unknown[];
}

export interface PaymentQuery {
    page?: number;
    limit?: number;
    status?: string;
}
