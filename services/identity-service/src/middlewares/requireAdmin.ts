import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.role !== "admin") {
        res.status(403).json({
            success: false,
            error: "Access denied. Admin privileges required.",
            code: "FORBIDDEN",
        });
        return;
    }
    next();
}
