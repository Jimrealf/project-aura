import { Request, Response } from "express";
import { OrderService } from "../services/order.service";

export const OrderController = {
    async checkout(req: Request, res: Response): Promise<void> {
        const userId = req.userId!;
        const token = req.headers.authorization!;
        const { shipping_address } = req.body;

        try {
            const order = await OrderService.checkout(token, userId, shipping_address);
            res.status(201).json({ success: true, data: order });
        } catch (err) {
            const error = err as NodeJS.ErrnoException & { details?: unknown };
            if (error.code === "EMPTY_CART") {
                res.status(400).json({ success: false, error: error.message, code: "EMPTY_CART" });
                return;
            }
            if (error.code === "PRODUCT_UNAVAILABLE") {
                res.status(400).json({ success: false, error: error.message, code: "PRODUCT_UNAVAILABLE" });
                return;
            }
            if (error.code === "PRICE_MISMATCH") {
                res.status(409).json({ success: false, error: error.message, code: "PRICE_MISMATCH", details: error.details });
                return;
            }
            if (error.code === "INSUFFICIENT_STOCK") {
                res.status(400).json({ success: false, error: error.message, code: "INSUFFICIENT_STOCK", details: error.details });
                return;
            }
            console.error("[Order Controller] checkout:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async getMyOrders(req: Request, res: Response): Promise<void> {
        const userId = req.userId!;

        try {
            const result = await OrderService.getMyOrders(userId, req.query);
            res.status(200).json({ success: true, data: result });
        } catch (error: unknown) {
            console.error("[Order Controller] getMyOrders:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async getOrderById(req: Request, res: Response): Promise<void> {
        const userId = req.userId!;
        const role = req.role!;
        const { orderId } = req.params;

        try {
            const order = await OrderService.getOrderById(orderId, userId, role);
            res.status(200).json({ success: true, data: order });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "NOT_FOUND") {
                res.status(404).json({ success: false, error: error.message, code: "NOT_FOUND" });
                return;
            }
            if (error.code === "FORBIDDEN") {
                res.status(403).json({ success: false, error: error.message, code: "FORBIDDEN" });
                return;
            }
            console.error("[Order Controller] getOrderById:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async getAllOrders(req: Request, res: Response): Promise<void> {
        try {
            const result = await OrderService.getAllOrders(req.query);
            res.status(200).json({ success: true, data: result });
        } catch (error: unknown) {
            console.error("[Order Controller] getAllOrders:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async updateStatus(req: Request, res: Response): Promise<void> {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            res.status(400).json({ success: false, error: "Status is required", code: "VALIDATION_ERROR" });
            return;
        }

        try {
            const order = await OrderService.updateStatus(orderId, status);
            res.status(200).json({ success: true, data: order });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "VALIDATION_ERROR") {
                res.status(400).json({ success: false, error: error.message, code: "VALIDATION_ERROR" });
                return;
            }
            if (error.code === "NOT_FOUND") {
                res.status(404).json({ success: false, error: error.message, code: "NOT_FOUND" });
                return;
            }
            console.error("[Order Controller] updateStatus:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },
};
