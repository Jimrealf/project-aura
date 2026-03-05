import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { verifyToken, requireRole } from "@aura/auth-middleware";

const router = Router();

/**
 * @openapi
 * /api/checkout:
 *   post:
 *     summary: Place an order from the current cart
 *     tags: [Checkout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipping_address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   country:
 *                     type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Empty cart, product unavailable, or insufficient stock
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Price mismatch detected
 */
router.post("/checkout", verifyToken, requireRole("customer"), OrderController.checkout);

/**
 * @openapi
 * /api/orders/me:
 *   get:
 *     summary: View my order history
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated order history
 *       401:
 *         description: Unauthorized
 */
router.get("/orders/me", verifyToken, OrderController.getMyOrders);

/**
 * @openapi
 * /api/orders/me/{orderId}:
 *   get:
 *     summary: View a specific order's details
 *     tags: [Orders]
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
 *         description: Order details with items
 *       403:
 *         description: Cannot view another user's order
 *       404:
 *         description: Order not found
 */
router.get("/orders/me/:orderId", verifyToken, OrderController.getOrderById);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: View all orders (Admin only)
 *     tags: [Orders]
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
 *           enum: [confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Paginated list of all orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get("/orders", verifyToken, requireRole("admin"), OrderController.getAllOrders);

/**
 * @openapi
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Order not found
 */
router.patch("/orders/:orderId/status", verifyToken, requireRole("admin"), OrderController.updateStatus);

export default router;
