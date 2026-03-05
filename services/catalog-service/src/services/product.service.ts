import { productRepository } from "../repositories/product.repository";
import { Product, CreateProductInput, UpdateProductInput, ProductQuery } from "../types/product.types";
import { uploadImage, deleteImage } from "../utils/cloudinary";

export class ProductService {
    async listProducts(query: ProductQuery) {
        const { page = 1, limit = 20 } = query;
        const { products, total } = await productRepository.findAll(query);
        
        return {
            products,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        };
    }

    async getProduct(slug: string): Promise<Product | null> {
        return productRepository.findBySlug(slug);
    }

    async createProduct(
        input: CreateProductInput, 
        files: Express.Multer.File[], 
        vendorId: string
    ): Promise<Product> {
        let imageUrls: string[] = [];

        if (files && files.length > 0) {
            const uploadPromises = files.map(file => uploadImage(file.buffer, file.originalname));
            imageUrls = await Promise.all(uploadPromises);
        }

        const productData = {
            ...input,
            vendor_id: vendorId,
            images: imageUrls,
        };

        return productRepository.create(productData);
    }

    async updateProduct(
        id: string,
        input: UpdateProductInput,
        files: Express.Multer.File[] | undefined,
        userId: string,
        role: string
    ): Promise<Product | null> {
        const product = await productRepository.findById(id);
        if (!product) return null;

        if (role !== "admin" && product.vendor_id !== userId) {
            throw new Error("FORBIDDEN");
        }

        let imageUrls = product.images;

        if (files && files.length > 0) {
            const uploadPromises = files.map(file => uploadImage(file.buffer, file.originalname));
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        const updateData: UpdateProductInput = {
            ...input,
            images: imageUrls,
        };

        return productRepository.update(id, updateData);
    }

    async deleteProduct(id: string, userId: string, role: string): Promise<boolean> {
        const product = await productRepository.findById(id);
        if (!product) return false;

        if (role !== "admin" && product.vendor_id !== userId) {
            throw new Error("FORBIDDEN");
        }

        await productRepository.softDelete(id);
        
        return true;
    }
}

export const productService = new ProductService();
