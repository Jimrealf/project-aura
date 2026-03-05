import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

export const AuthController = {
    async register(req: Request, res: Response): Promise<void> {
        const { email, password, first_name, last_name } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: "Email and password are required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            const result = await AuthService.register({ email, password, first_name, last_name });
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "CONFLICT") {
                res.status(409).json({ success: false, error: error.message, code: "CONFLICT" });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async registerVendor(req: Request, res: Response): Promise<void> {
        const { email, password, first_name, last_name, business_name, business_address } = req.body;

        if (!email || !password || !business_name) {
            res.status(400).json({
                success: false,
                error: "Email, password, and business_name are required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            const result = await AuthService.registerVendor({
                email, password, first_name, last_name, business_name, business_address,
            });
            res.status(201).json({ success: true, data: result });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "CONFLICT") {
                res.status(409).json({ success: false, error: error.message, code: "CONFLICT" });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: "Email and password are required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            const result = await AuthService.login({ email, password });
            res.status(200).json({ success: true, data: result });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "UNAUTHORIZED") {
                res.status(401).json({ success: false, error: error.message, code: "UNAUTHORIZED" });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async createInternalUser(req: Request, res: Response): Promise<void> {
        const { email, password, first_name, last_name, role } = req.body;

        if (!email || !password || !first_name || !last_name || !role) {
            res.status(400).json({
                success: false,
                error: "All fields (email, password, first_name, last_name, role) are required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        if (role !== "support" && role !== "admin") {
            res.status(400).json({
                success: false,
                error: "Role must be 'support' or 'admin'",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            const user = await AuthService.createInternalUser({ email, password, first_name, last_name, role });
            res.status(201).json({ success: true, data: user });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "CONFLICT") {
                res.status(409).json({ success: false, error: error.message, code: "CONFLICT" });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async forgotPassword(req: Request, res: Response): Promise<void> {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({
                success: false,
                error: "Email is required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            const resetToken = await AuthService.forgotPassword({ email });
            res.status(200).json({
                success: true,
                data: { reset_token: resetToken },
                message: "If the email exists, a reset token has been generated",
            });
        } catch {
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },

    async resetPassword(req: Request, res: Response): Promise<void> {
        const { token, new_password } = req.body;

        if (!token || !new_password) {
            res.status(400).json({
                success: false,
                error: "Token and new_password are required",
                code: "VALIDATION_ERROR",
            });
            return;
        }

        try {
            await AuthService.resetPassword({ token, new_password });
            res.status(200).json({ success: true, message: "Password reset successful" });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "BAD_REQUEST") {
                res.status(400).json({ success: false, error: error.message, code: "BAD_REQUEST" });
                return;
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    },
};
