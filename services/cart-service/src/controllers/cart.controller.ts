import { Request, Response } from "express";
import { cartService } from "../services/cart.service";

export class CartController {
    static async addItem(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { slug, quantity } = req.body;

            if (!slug || quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    error: "Missing required fields: slug, quantity",
                    code: "VALIDATION_ERROR",
                });
            }

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    success: false,
                    error: "Quantity must be a positive integer",
                    code: "VALIDATION_ERROR",
                });
            }

            const cart = await cartService.addItem(userId, { slug, quantity });
            res.status(200).json({ success: true, data: cart });
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message === "PRODUCT_NOT_FOUND") {
                    return res.status(404).json({ success: false, error: "Product not found", code: "NOT_FOUND" });
                }
                if (error.message === "INSUFFICIENT_STOCK") {
                    return res.status(400).json({ success: false, error: "Requested quantity exceeds available stock", code: "INSUFFICIENT_STOCK" });
                }
            }
            console.error("[Cart Controller] addItem:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async getCart(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const cart = await cartService.getCart(userId);
            res.status(200).json({ success: true, data: cart });
        } catch (error: unknown) {
            console.error("[Cart Controller] getCart:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async updateItem(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { product_id, quantity } = req.body;

            if (!product_id || quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    error: "Missing required fields: product_id, quantity",
                    code: "VALIDATION_ERROR",
                });
            }

            if (!Number.isInteger(quantity) || quantity < 0) {
                return res.status(400).json({
                    success: false,
                    error: "Quantity must be a non-negative integer",
                    code: "VALIDATION_ERROR",
                });
            }

            const cart = await cartService.updateItem(userId, { product_id, quantity });
            res.status(200).json({ success: true, data: cart });
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message === "CART_NOT_FOUND") {
                    return res.status(404).json({ success: false, error: "Cart not found", code: "NOT_FOUND" });
                }
                if (error.message === "ITEM_NOT_FOUND") {
                    return res.status(404).json({ success: false, error: "Item not found in cart", code: "NOT_FOUND" });
                }
                if (error.message === "INSUFFICIENT_STOCK") {
                    return res.status(400).json({ success: false, error: "Requested quantity exceeds available stock", code: "INSUFFICIENT_STOCK" });
                }
            }
            console.error("[Cart Controller] updateItem:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async removeItem(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { productId } = req.params;

            const cart = await cartService.removeItem(userId, productId);
            res.status(200).json({ success: true, data: cart });
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.message === "CART_NOT_FOUND") {
                    return res.status(404).json({ success: false, error: "Cart not found", code: "NOT_FOUND" });
                }
                if (error.message === "ITEM_NOT_FOUND") {
                    return res.status(404).json({ success: false, error: "Item not found in cart", code: "NOT_FOUND" });
                }
            }
            console.error("[Cart Controller] removeItem:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async clearCart(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            await cartService.clearCart(userId);
            res.status(200).json({ success: true, data: { message: "Cart cleared successfully" } });
        } catch (error: unknown) {
            console.error("[Cart Controller] clearCart:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }
}
