import { Request, Response } from "express";
import { PaymentService } from "../services/payment.service";

export const PaymentController = {
    async createIntent(req: Request, res: Response): Promise<void> {
        const userId = req.userId!;
        const token = req.headers.authorization!;
        const { order_id } = req.body;

        if (!order_id) {
            res.status(400).json({ success: false, error: "order_id is required", code: "VALIDATION_ERROR" });
            return;
        }

        try {
            const result = await PaymentService.createIntent(userId, order_id, token);
            res.status(201).json({ success: true, data: result });
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
            if (error.code === "ALREADY_PAID") {
                res.status(409).json({ success: false, error: error.message, code: "ALREADY_PAID" });
                return;
            }
            console.error("[Payment Controller] createIntent:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async handleWebhook(req: Request, res: Response): Promise<void> {
        const signature = req.headers["stripe-signature"] as string;

        if (!signature) {
            res.status(400).json({ success: false, error: "Missing stripe-signature header", code: "INVALID_SIGNATURE" });
            return;
        }

        try {
            const result = await PaymentService.handleWebhook(req.body, signature);
            res.status(200).json(result);
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "INVALID_SIGNATURE") {
                res.status(400).json({ success: false, error: error.message, code: "INVALID_SIGNATURE" });
                return;
            }
            console.error("[Payment Controller] handleWebhook:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
        const userId = req.userId!;
        const role = req.role!;
        const { orderId } = req.params;

        try {
            const payment = await PaymentService.getPaymentByOrderId(orderId, userId, role);
            res.status(200).json({ success: true, data: payment });
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
            console.error("[Payment Controller] getPaymentByOrderId:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async getAllPayments(req: Request, res: Response): Promise<void> {
        try {
            const result = await PaymentService.getAllPayments(req.query);
            res.status(200).json({ success: true, data: result });
        } catch (error: unknown) {
            console.error("[Payment Controller] getAllPayments:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },
};
