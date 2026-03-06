import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { verifyToken, requireRole } from "@aura/auth-middleware";

const router = Router();

/**
 * @openapi
 * /api/payments/intent:
 *   post:
 *     summary: Create a Stripe PaymentIntent for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_id]
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: PaymentIntent created, returns client_secret
 *       400:
 *         description: Missing order_id
 *       403:
 *         description: Cannot pay for another user's order
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order already paid or intent already exists
 */
router.post("/intent", verifyToken, requireRole("customer"), PaymentController.createIntent);

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint (Stripe-only, not for manual use)
 *     description: >
 *       This endpoint is called exclusively by Stripe's servers to deliver
 *       payment events (e.g. payment_intent.succeeded, payment_intent.payment_failed).
 *       It verifies the Stripe-Signature header against the webhook secret.
 *       Do NOT call this endpoint manually — it will reject any request
 *       without a valid Stripe signature.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Raw Stripe event payload (sent automatically by Stripe)
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       400:
 *         description: Invalid or missing Stripe signature
 */
router.post("/webhook", PaymentController.handleWebhook);

/**
 * @openapi
 * /api/payments/order/{orderId}:
 *   get:
 *     summary: Get payment status for a specific order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details
 *       403:
 *         description: Cannot view another user's payment
 *       404:
 *         description: Payment not found
 */
router.get("/order/:orderId", verifyToken, PaymentController.getPaymentByOrderId);

/**
 * @openapi
 * /api/payments:
 *   get:
 *     summary: List all payments (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, succeeded, failed, cancelled]
 *     responses:
 *       200:
 *         description: Paginated list of payments
 *       403:
 *         description: Admin access required
 */
router.get("/", verifyToken, requireRole("admin"), PaymentController.getAllPayments);

export default router;
