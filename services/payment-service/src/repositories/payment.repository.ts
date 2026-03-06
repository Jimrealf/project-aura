import pool from "../utils/db";
import { Payment, PaymentQuery } from "../types/payment.types";

export const PaymentRepository = {
    async findByOrderId(orderId: string): Promise<Payment | null> {
        const result = await pool.query(
            "SELECT * FROM payments WHERE order_id = $1",
            [orderId]
        );
        return result.rows[0] ?? null;
    },

    async findByStripeIntentId(stripeId: string): Promise<Payment | null> {
        const result = await pool.query(
            "SELECT * FROM payments WHERE stripe_payment_intent_id = $1",
            [stripeId]
        );
        return result.rows[0] ?? null;
    },

    async create(data: {
        order_id: string;
        user_id: string;
        stripe_payment_intent_id: string;
        amount: number;
        currency: string;
    }): Promise<Payment> {
        const result = await pool.query(
            `INSERT INTO payments (order_id, user_id, stripe_payment_intent_id, amount, currency)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [data.order_id, data.user_id, data.stripe_payment_intent_id, data.amount, data.currency]
        );
        return result.rows[0];
    },

    async updateStatus(stripeIntentId: string, status: string, failureReason?: string): Promise<Payment | null> {
        const result = await pool.query(
            `UPDATE payments SET status = $1, failure_reason = $2, updated_at = NOW()
             WHERE stripe_payment_intent_id = $3
             RETURNING *`,
            [status, failureReason ?? null, stripeIntentId]
        );
        return result.rows[0] ?? null;
    },

    async findAll(query: PaymentQuery): Promise<{ payments: Payment[]; total: number }> {
        const { page = 1, limit = 10, status } = query;
        const offset = (Number(page) - 1) * Number(limit);

        let countSql = "SELECT COUNT(*) FROM payments";
        let listSql = "SELECT * FROM payments";
        const params: unknown[] = [];

        if (status) {
            countSql += " WHERE status = $1";
            listSql += " WHERE status = $1";
            params.push(status);
        }

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].count, 10);

        listSql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const listResult = await pool.query(listSql, params);

        return { payments: listResult.rows, total };
    },
};
