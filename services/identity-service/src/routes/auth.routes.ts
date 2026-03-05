import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { verifyToken, requireAdmin } from "@aura/auth-middleware";

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already registered
 */
router.post("/register", AuthController.register);

/**
 * @openapi
 * /api/auth/register/vendor:
 *   post:
 *     summary: Register a new vendor account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, business_name]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               business_name:
 *                 type: string
 *               business_address:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor account created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already registered
 */
router.post("/register/vendor", AuthController.registerVendor);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", AuthController.login);

/**
 * @openapi
 * /api/auth/internal-user:
 *   post:
 *     summary: Create an internal user (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name, role]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [support, admin]
 *     responses:
 *       201:
 *         description: Internal user created
 *       400:
 *         description: Missing or invalid fields
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       409:
 *         description: Email already registered
 */
router.post("/internal-user", verifyToken, requireAdmin, AuthController.createInternalUser);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset token generated
 *       400:
 *         description: Missing email
 */
router.post("/forgot-password", AuthController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, new_password]
 *             properties:
 *               token:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post("/reset-password", AuthController.resetPassword);

export default router;
