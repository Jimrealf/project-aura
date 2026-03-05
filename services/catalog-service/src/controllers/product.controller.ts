import { Request, Response } from "express";
import { productService } from "../services/product.service";

export class ProductController {
    static async list(req: Request, res: Response) {
        try {
            const result = await productService.listProducts(req.query);
            res.status(200).json({ success: true, data: result });
        } catch (error: unknown) {
            console.error("[Product Controller] list:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async getBySlug(req: Request, res: Response) {
        try {
            const product = await productService.getProduct(req.params.slug);
            if (!product) {
                return res.status(404).json({ success: false, error: "Product not found", code: "NOT_FOUND" });
            }
            res.status(200).json({ success: true, data: product });
        } catch (error: unknown) {
            console.error("[Product Controller] getBySlug:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async create(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const files = req.files as Express.Multer.File[];

            if (!req.body.name || !req.body.description || !req.body.price || !req.body.category) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Missing required fields: name, description, price, category",
                    code: "VALIDATION_ERROR"
                });
            }

            if (Number(req.body.price) < 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Price cannot be negative",
                    code: "VALIDATION_ERROR"
                });
            }

            if (req.body.variants && typeof req.body.variants === "string") {
                try {
                    req.body.variants = JSON.parse(req.body.variants);
                } catch {
                    return res.status(400).json({ success: false, error: "Invalid variants format", code: "VALIDATION_ERROR" });
                }
            }

            const product = await productService.createProduct(req.body, files ?? [], userId);
            res.status(201).json({ success: true, data: product });
        } catch (error: unknown) {
            console.error("[Product Controller] create:", error);
            const mongoError = error as { code?: number };
            if (mongoError.code === 11000) {
                return res.status(409).json({ success: false, error: "Product slug already exists", code: "DUPLICATE_SLUG" });
            }
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const role = req.role!;
            const files = req.files as Express.Multer.File[];

            if (req.body.variants && typeof req.body.variants === "string") {
                try {
                    req.body.variants = JSON.parse(req.body.variants);
                } catch {
                    return res.status(400).json({ success: false, error: "Invalid variants format", code: "VALIDATION_ERROR" });
                }
            }

            const product = await productService.updateProduct(req.params.id, req.body, files, userId, role);
            
            if (!product) {
                return res.status(404).json({ success: false, error: "Product not found", code: "NOT_FOUND" });
            }
            
            res.status(200).json({ success: true, data: product });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "FORBIDDEN") {
                return res.status(403).json({ success: false, error: "You can only update your own products", code: "FORBIDDEN" });
            }
            console.error("[Product Controller] update:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }

    static async remove(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const role = req.role!;
            
            const deleted = await productService.deleteProduct(req.params.id, userId, role);
            
            if (!deleted) {
                return res.status(404).json({ success: false, error: "Product not found", code: "NOT_FOUND" });
            }
            
            res.status(200).json({ success: true, data: { message: "Product deleted successfully" } });
        } catch (error: unknown) {
            if (error instanceof Error && error.message === "FORBIDDEN") {
                return res.status(403).json({ success: false, error: "You can only delete your own products", code: "FORBIDDEN" });
            }
            console.error("[Product Controller] remove:", error);
            res.status(500).json({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
        }
    }
}
