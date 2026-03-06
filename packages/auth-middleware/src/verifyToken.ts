import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

interface JwtPayload {
    userId: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            role?: string;
        }
    }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            error: "Access denied. No token provided.",
            code: "UNAUTHORIZED",
        });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: "Invalid or expired token",
            code: "UNAUTHORIZED",
        });
    }
}
