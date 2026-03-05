import mongoose, { Schema } from "mongoose";
import { Product } from "../types/product.types";
import slugify from "slugify";

const VariantOptionSchema = new Schema({
    label: { type: String, required: true },
    price_modifier: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
});

const ProductVariantSchema = new Schema({
    name: { type: String, required: true },
    options: [VariantOptionSchema],
});

const ProductSchema = new Schema<Product>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, unique: true },
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        compare_at_price: { type: Number, min: 0 },
        category: { type: String, required: true, index: true },
        tags: [{ type: String, index: true }],
        images: [{ type: String }],
        variants: [ProductVariantSchema],
        stock: { type: Number, default: 0, min: 0 },
        vendor_id: { type: String, required: true, index: true },
        is_active: { type: Boolean, default: true },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        toJSON: {
            virtuals: true,
            transform: (_doc: unknown, ret: Record<string, unknown>) => {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

ProductSchema.index({ name: "text", description: "text", tags: "text" });

ProductSchema.pre("save", async function (next) {
    if (this.isModified("name") && !this.slug) {
        let baseSlug = slugify(this.name, { lower: true, strict: true });
        let newSlug = baseSlug;
        let counter = 1;

        while (await mongoose.models.Product.exists({ slug: newSlug, _id: { $ne: this._id } })) {
            newSlug = `${baseSlug}-${counter}`;
            counter++;
        }
        
        this.slug = newSlug;
    }
    next();
});

export const ProductModel = mongoose.model<Product>("Product", ProductSchema);
