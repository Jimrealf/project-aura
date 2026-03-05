import { Document, Types } from "mongoose";

export interface VariantOption {
    label: string;
    price_modifier: number;
    stock: number;
}

export interface ProductVariant {
    name: string;
    options: VariantOption[];
}

export interface Product extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    price: number;
    compare_at_price?: number;
    category: string;
    tags: string[];
    images: string[];
    variants: ProductVariant[];
    stock: number;
    vendor_id: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProductInput {
    name: string;
    description: string;
    price: number;
    compare_at_price?: number;
    category: string;
    tags?: string[];
    variants?: ProductVariant[];
    stock?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
    images?: string[];
    is_active?: boolean;
}

export interface ProductQuery {
    page?: number;
    limit?: number;
    category?: string;
    q?: string;
    min_price?: number;
    max_price?: number;
    sort?: string;
}
