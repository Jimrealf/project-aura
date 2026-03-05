import { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.role || !allowedRoles.includes(req.role)) {
            res.status(403).json({
                success: false,
                error: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
                code: "FORBIDDEN",
            });
            return;
        }
        next();
    };
}
