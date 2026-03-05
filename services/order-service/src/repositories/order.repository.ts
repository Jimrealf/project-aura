import pool from "../utils/db";
import { Order, OrderItem, OrderWithItems, OrderQuery } from "../types/order.types";

export const OrderRepository = {
    async createOrder(
        userId: string,
        subtotal: number,
        shipping: number,
        total: number,
        shippingAddress: unknown,
        items: Omit<OrderItem, "id" | "order_id">[]
    ): Promise<OrderWithItems> {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            const orderResult = await client.query(
                `INSERT INTO orders (user_id, subtotal, shipping, total, shipping_address)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [userId, subtotal, shipping, total, JSON.stringify(shippingAddress)]
            );
            const order: Order = orderResult.rows[0];

            const orderItems: OrderItem[] = [];
            for (const item of items) {
                const itemResult = await client.query(
                    `INSERT INTO order_items (order_id, product_id, product_slug, product_name, unit_price, quantity, line_total, image)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     RETURNING *`,
                    [order.id, item.product_id, item.product_slug, item.product_name, item.unit_price, item.quantity, item.line_total, item.image]
                );
                orderItems.push(itemResult.rows[0]);
            }

            await client.query("COMMIT");
            return { ...order, items: orderItems };
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    },

    async findByUserId(userId: string, query: OrderQuery): Promise<{ orders: OrderWithItems[]; total: number }> {
        const { page = 1, limit = 10 } = query;
        const offset = (Number(page) - 1) * Number(limit);

        const countResult = await pool.query(
            "SELECT COUNT(*) FROM orders WHERE user_id = $1",
            [userId]
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const ordersResult = await pool.query(
            `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const orders: OrderWithItems[] = [];
        for (const order of ordersResult.rows) {
            const itemsResult = await pool.query(
                "SELECT * FROM order_items WHERE order_id = $1",
                [order.id]
            );
            orders.push({ ...order, items: itemsResult.rows });
        }

        return { orders, total };
    },

    async findById(orderId: string): Promise<OrderWithItems | null> {
        const orderResult = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [orderId]
        );
        if (orderResult.rows.length === 0) return null;

        const itemsResult = await pool.query(
            "SELECT * FROM order_items WHERE order_id = $1",
            [orderId]
        );

        return { ...orderResult.rows[0], items: itemsResult.rows };
    },

    async findAll(query: OrderQuery): Promise<{ orders: OrderWithItems[]; total: number }> {
        const { page = 1, limit = 10, status } = query;
        const offset = (Number(page) - 1) * Number(limit);

        let countSql = "SELECT COUNT(*) FROM orders";
        let ordersSql = "SELECT * FROM orders";
        const params: unknown[] = [];

        if (status) {
            countSql += " WHERE status = $1";
            ordersSql += " WHERE status = $1";
            params.push(status);
        }

        const countResult = await pool.query(countSql, params);
        const total = parseInt(countResult.rows[0].count, 10);

        ordersSql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const ordersResult = await pool.query(ordersSql, params);

        const orders: OrderWithItems[] = [];
        for (const order of ordersResult.rows) {
            const itemsResult = await pool.query(
                "SELECT * FROM order_items WHERE order_id = $1",
                [order.id]
            );
            orders.push({ ...order, items: itemsResult.rows });
        }

        return { orders, total };
    },

    async updateStatus(orderId: string, status: string): Promise<Order | null> {
        const result = await pool.query(
            `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, orderId]
        );
        return result.rows[0] ?? null;
    },
};
