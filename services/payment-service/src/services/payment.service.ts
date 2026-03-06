import Stripe from "stripe";
import stripe from "../utils/stripe";
import { PaymentRepository } from "../repositories/payment.repository";
import { fetchOrder, updateOrderStatus } from "../utils/order";
import { PaymentQuery } from "../types/payment.types";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export const PaymentService = {
    async createIntent(userId: string, orderId: string, token: string) {
        const order = await fetchOrder(orderId, token);
        if (!order) {
            const error = new Error("Order not found");
            (error as NodeJS.ErrnoException).code = "NOT_FOUND";
            throw error;
        }

        if (order.user_id !== userId) {
            const error = new Error("You can only pay for your own orders");
            (error as NodeJS.ErrnoException).code = "FORBIDDEN";
            throw error;
        }

        const paidStatuses = ["processing", "shipped", "delivered"];
        if (paidStatuses.includes(order.status)) {
            const error = new Error("This order has already been paid");
            (error as NodeJS.ErrnoException).code = "ALREADY_PAID";
            throw error;
        }

        const existing = await PaymentRepository.findByOrderId(orderId);
        if (existing && existing.status === "pending") {
            return { client_secret: existing.stripe_payment_intent_id, payment_id: existing.id };
        }
        if (existing && existing.status === "succeeded") {
            const error = new Error("Payment already completed for this order");
            (error as NodeJS.ErrnoException).code = "ALREADY_PAID";
            throw error;
        }

        const amountInCents = Math.round(parseFloat(order.total) * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            metadata: {
                order_id: orderId,
                user_id: userId,
            },
        });

        await PaymentRepository.create({
            order_id: orderId,
            user_id: userId,
            stripe_payment_intent_id: paymentIntent.id,
            amount: parseFloat(order.total),
            currency: "usd",
        });

        return { client_secret: paymentIntent.client_secret, payment_id: paymentIntent.id };
    },

    async handleWebhook(rawBody: Buffer, signature: string) {
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
        } catch {
            const error = new Error("Invalid webhook signature");
            (error as NodeJS.ErrnoException).code = "INVALID_SIGNATURE";
            throw error;
        }

        switch (event.type) {
            case "payment_intent.succeeded": {
                const intent = event.data.object as Stripe.PaymentIntent;
                await this.handlePaymentSucceeded(intent);
                break;
            }
            case "payment_intent.payment_failed": {
                const intent = event.data.object as Stripe.PaymentIntent;
                await this.handlePaymentFailed(intent);
                break;
            }
            default:
                console.log(`[Payment Service] Ignoring event type: ${event.type}`);
        }

        return { received: true };
    },

    async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
        const payment = await PaymentRepository.findByStripeIntentId(intent.id);
        if (!payment) {
            console.warn(`[Payment Service] No payment record for intent ${intent.id}`);
            return;
        }

        if (payment.status === "succeeded") {
            return;
        }

        await PaymentRepository.updateStatus(intent.id, "succeeded");

        try {
            await updateOrderStatus(payment.order_id, "processing");
        } catch (err) {
            console.error(`[Payment Service] Failed to update order ${payment.order_id} status:`, err);
        }
    },

    async handlePaymentFailed(intent: Stripe.PaymentIntent) {
        const payment = await PaymentRepository.findByStripeIntentId(intent.id);
        if (!payment) {
            console.warn(`[Payment Service] No payment record for intent ${intent.id}`);
            return;
        }

        const failureMessage = intent.last_payment_error?.message ?? "Payment failed";
        await PaymentRepository.updateStatus(intent.id, "failed", failureMessage);
    },

    async getPaymentByOrderId(orderId: string, userId: string, role: string) {
        const payment = await PaymentRepository.findByOrderId(orderId);
        if (!payment) {
            const error = new Error("Payment not found");
            (error as NodeJS.ErrnoException).code = "NOT_FOUND";
            throw error;
        }

        if (role !== "admin" && payment.user_id !== userId) {
            const error = new Error("You can only view your own payments");
            (error as NodeJS.ErrnoException).code = "FORBIDDEN";
            throw error;
        }

        return payment;
    },

    async getAllPayments(query: PaymentQuery) {
        const { page = 1, limit = 10 } = query;
        const { payments, total } = await PaymentRepository.findAll(query);

        return {
            payments,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        };
    },
};
