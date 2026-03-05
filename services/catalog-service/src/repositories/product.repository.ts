import { FilterQuery, SortOrder } from "mongoose";
import { ProductModel } from "../models/product.model";
import { Product, CreateProductInput, UpdateProductInput, ProductQuery } from "../types/product.types";

interface MongoSortOption {
    [key: string]: SortOrder | { $meta: string };
}

export class ProductRepository {
    async findAll(query: ProductQuery): Promise<{ products: Product[]; total: number }> {
        const { page = 1, limit = 20, category, q, min_price, max_price, sort } = query;
        const skip = (page - 1) * limit;

        const filter: FilterQuery<Product> = { is_active: true };

        if (category) {
            filter.category = category;
        }

        if (q) {
            filter.$text = { $search: q };
        }

        if (min_price !== undefined || max_price !== undefined) {
            filter.price = {};
            if (min_price !== undefined) filter.price.$gte = Number(min_price);
            if (max_price !== undefined) filter.price.$lte = Number(max_price);
        }

        let sortOption: MongoSortOption = { created_at: -1 };
        if (sort === "price_asc") sortOption = { price: 1 };
        else if (sort === "price_desc") sortOption = { price: -1 };

        if (q && !sort) {
            sortOption = { score: { $meta: "textScore" } };
        }

        const queryObj = ProductModel.find(filter);
        if (q && !sort) {
            queryObj.select({ score: { $meta: "textScore" } });
        }

        const [products, total] = await Promise.all([
            queryObj.sort(sortOption).skip(skip).limit(Number(limit)).exec(),
            ProductModel.countDocuments(filter),
        ]);

        return { products, total };
    }

    async findBySlug(slug: string): Promise<Product | null> {
        return ProductModel.findOne({ slug, is_active: true }).exec();
    }

    async findById(id: string): Promise<Product | null> {
        return ProductModel.findOne({ _id: id, is_active: true }).exec();
    }

    async create(data: CreateProductInput & { vendor_id: string; images: string[] }): Promise<Product> {
        const product = new ProductModel(data);
        return product.save();
    }

    async update(id: string, data: UpdateProductInput): Promise<Product | null> {
        return ProductModel.findOneAndUpdate({ _id: id, is_active: true }, data, { new: true }).exec();
    }

    async softDelete(id: string): Promise<void> {
        await ProductModel.updateOne({ _id: id }, { is_active: false }).exec();
    }
}

export const productRepository = new ProductRepository();
