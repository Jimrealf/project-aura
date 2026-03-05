import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { upload } from "../middlewares/upload";
import { verifyToken, requireRole } from "@aura/auth-middleware";

const router = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List products with pagination, search, and filters
 *     tags: [Products]
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
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Text search in name or description
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, newest]
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
router.get("/", ProductController.list);

/**
 * @openapi
 * /api/products/{slug}:
 *   get:
 *     summary: Get single product details by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get("/:slug", ProductController.getBySlug);

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin or Vendor)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, description, price, category]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Missing fields or invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin or vendor role)
 */
router.post(
    "/",
    verifyToken,
    requireRole("admin", "vendor"),
    upload.array("images", 5),
    ProductController.create
);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Update an existing product (Admin or Vendor)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated
 *       403:
 *         description: Forbidden (not yours)
 *       404:
 *         description: Product not found
 */
router.put(
    "/:id",
    verifyToken,
    requireRole("admin", "vendor"),
    upload.array("images", 5),
    ProductController.update
);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Soft-delete a product (Admin or Vendor)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       403:
 *         description: Forbidden (not yours)
 *       404:
 *         description: Product not found
 */
router.delete(
    "/:id",
    verifyToken,
    requireRole("admin", "vendor"),
    ProductController.remove
);

export default router;
