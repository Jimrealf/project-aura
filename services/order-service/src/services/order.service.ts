import { OrderRepository } from "../repositories/order.repository";
import { fetchCart, clearCart } from "../utils/cart";
import { fetchProduct } from "../utils/catalog";
import { computeShipping } from "../utils/shipping";
import { OrderWithItems, OrderItem, OrderQuery, ShippingAddress, VALID_STATUSES, OrderStatus } from "../types/order.types";

export const OrderService = {
    async checkout(token: string, userId: string, shippingAddress?: ShippingAddress): Promise<OrderWithItems> {
        const cart = await fetchCart(token);

        if (!cart.items || cart.items.length === 0) {
            const error = new Error("Cart is empty");
            (error as NodeJS.ErrnoException).code = "EMPTY_CART";
            throw error;
        }

        const verifiedItems: Omit<OrderItem, "id" | "order_id">[] = [];

        for (const cartItem of cart.items) {
            const product = await fetchProduct(cartItem.slug);

            if (!product) {
                const error = new Error(`Product "${cartItem.name}" is no longer available`);
                (error as NodeJS.ErrnoException).code = "PRODUCT_UNAVAILABLE";
                throw error;
            }

            if (product.price !== cartItem.price) {
                const error = new Error(`Price changed for "${cartItem.name}"`);
                (error as NodeJS.ErrnoException).code = "PRICE_MISMATCH";
                (error as unknown as Record<string, unknown>).details = {
                    product: cartItem.name,
                    slug: cartItem.slug,
                    stale_price: cartItem.price,
                    current_price: product.price,
                };
                throw error;
            }

            if (cartItem.quantity > product.stock) {
                const error = new Error(`Insufficient stock for "${cartItem.name}"`);
                (error as NodeJS.ErrnoException).code = "INSUFFICIENT_STOCK";
                (error as unknown as Record<string, unknown>).details = {
                    product: cartItem.name,
                    requested: cartItem.quantity,
                    available: product.stock,
                };
                throw error;
            }

            const lineTotal = Math.round(product.price * cartItem.quantity * 100) / 100;
            verifiedItems.push({
                product_id: cartItem.product_id,
                product_slug: cartItem.slug,
                product_name: product.name,
                unit_price: product.price,
                quantity: cartItem.quantity,
                line_total: lineTotal,
                image: cartItem.image,
            });
        }

        const subtotal = Math.round(verifiedItems.reduce((sum, item) => sum + item.line_total, 0) * 100) / 100;
        const shipping = computeShipping(subtotal);
        const total = Math.round((subtotal + shipping) * 100) / 100;

        const order = await OrderRepository.createOrder(
            userId, subtotal, shipping, total, shippingAddress ?? null, verifiedItems
        );

        await clearCart(token);

        return order;
    },

    async getMyOrders(userId: string, query: OrderQuery): Promise<{ orders: OrderWithItems[]; total: number; page: number; pages: number }> {
        const { page = 1, limit = 10 } = query;
        const { orders, total } = await OrderRepository.findByUserId(userId, query);

        return {
            orders,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        };
    },

    async getOrderById(orderId: string, userId: string, role: string): Promise<OrderWithItems> {
        const order = await OrderRepository.findById(orderId);

        if (!order) {
            const error = new Error("Order not found");
            (error as NodeJS.ErrnoException).code = "NOT_FOUND";
            throw error;
        }

        if (role !== "admin" && order.user_id !== userId) {
            const error = new Error("You can only view your own orders");
            (error as NodeJS.ErrnoException).code = "FORBIDDEN";
            throw error;
        }

        return order;
    },

    async getAllOrders(query: OrderQuery): Promise<{ orders: OrderWithItems[]; total: number; page: number; pages: number }> {
        const { page = 1, limit = 10 } = query;
        const { orders, total } = await OrderRepository.findAll(query);

        return {
            orders,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        };
    },

    async updateStatus(orderId: string, status: string): Promise<OrderWithItems> {
        if (!VALID_STATUSES.includes(status as OrderStatus)) {
            const error = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
            (error as NodeJS.ErrnoException).code = "VALIDATION_ERROR";
            throw error;
        }

        const updated = await OrderRepository.updateStatus(orderId, status);
        if (!updated) {
            const error = new Error("Order not found");
            (error as NodeJS.ErrnoException).code = "NOT_FOUND";
            throw error;
        }

        const order = await OrderRepository.findById(orderId);
        return order!;
    },
};
