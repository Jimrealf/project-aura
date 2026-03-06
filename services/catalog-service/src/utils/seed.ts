import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { Pool } from "pg";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ProductModel } from "../models/product.model";
import { uploadImage } from "./cloudinary";

const MONGO_URI = process.env.MONGO_URI!;

const SEED_IMAGES_DIR = path.resolve(__dirname, "../../assets/seed-images");

const identityPool = new Pool({
    host: process.env.IDENTITY_DB_HOST ?? process.env.DB_HOST,
    port: parseInt(process.env.IDENTITY_DB_PORT ?? process.env.DB_PORT ?? "5432", 10),
    user: process.env.IDENTITY_DB_USER ?? process.env.DB_USER,
    password: process.env.IDENTITY_DB_PASSWORD ?? process.env.DB_PASSWORD,
    database: process.env.IDENTITY_DB_NAME ?? process.env.DB_NAME,
});

async function fetchVendorIds(): Promise<string[]> {
    const result = await identityPool.query(
        "SELECT id FROM users WHERE role = $1 AND is_active = true ORDER BY created_at ASC",
        ["vendor"]
    );
    return result.rows.map((row: { id: string }) => row.id);
}

const uploadLocalImage = async (filename: string) => {
    try {
        const filePath = path.join(SEED_IMAGES_DIR, filename);
        const buffer = await fs.readFile(filePath);
        console.log(`[Catalog Seed] Uploading ${filename} to Cloudinary...`);
        const url = await uploadImage(buffer, filename);
        return url;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`[Catalog Seed] Failed to upload ${filename}:`, message);
        return "";
    }
};

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`[Catalog Seed] Connected to MongoDB at ${MONGO_URI}`);

        console.log("[Catalog Seed] Fetching real vendor IDs from Identity Service DB...");
        const vendorIds = await fetchVendorIds();

        if (vendorIds.length < 2) {
            console.error("[Catalog Seed] Need at least 2 vendors in the Identity DB. Run seed:identity first.");
            return;
        }

        console.log(`[Catalog Seed] Found ${vendorIds.length} vendors. Using first 2.`);
        const [vendor1, vendor2] = vendorIds;

        await ProductModel.deleteMany({});
        console.log("[Catalog Seed] Cleared existing products.");

        const laptopUrl = await uploadLocalImage("aura_laptop.png");
        const headphonesUrl = await uploadLocalImage("aura_headphones.png");
        const tshirtUrl = await uploadLocalImage("aura_tshirt.png");
        const watchUrl = await uploadLocalImage("aura_watch.png");
        const coffeeUrl = await uploadLocalImage("aura_coffee.png");

        const sampleProducts = [
            {
                name: "AuraBook Pro 16",
                description: "The ultimate laptop for creators and developers.",
                price: 2499.99,
                compare_at_price: 2699.99,
                category: "Electronics",
                tags: ["laptop", "tech", "computer"],
                stock: 50,
                vendor_id: vendor1,
                images: laptopUrl ? [laptopUrl] : []
            },
            {
                name: "Noise-Cancelling Headphones 700",
                description: "Premium over-ear headphones with active noise cancellation.",
                price: 349.99,
                category: "Electronics",
                tags: ["audio", "headphones", "tech"],
                stock: 120,
                vendor_id: vendor1,
                images: headphonesUrl ? [headphonesUrl] : []
            },
            {
                name: "Classic Cotton T-Shirt",
                description: "100% organic cotton, comfortable everyday tee.",
                price: 24.99,
                category: "Fashion",
                tags: ["clothing", "shirt", "apparel"],
                vendor_id: vendor2,
                images: tshirtUrl ? [tshirtUrl] : [],
                variants: [
                    {
                        name: "Size",
                        options: [
                            { label: "Small", price_modifier: 0, stock: 100 },
                            { label: "Medium", price_modifier: 0, stock: 150 },
                            { label: "Large", price_modifier: 0, stock: 200 },
                            { label: "XL", price_modifier: 5.00, stock: 50 },
                        ]
                    }
                ]
            },
            {
                name: "Minimalist Watch",
                description: "Sleek and elegant timepiece for any occasion.",
                price: 149.99,
                compare_at_price: 199.99,
                category: "Fashion",
                tags: ["accessories", "watch", "jewelry"],
                stock: 30,
                vendor_id: vendor2,
                images: watchUrl ? [watchUrl] : []
            },
            {
                name: "Smart Coffee Maker",
                description: "App-controlled coffee maker with built-in grinder.",
                price: 199.99,
                category: "Home",
                tags: ["kitchen", "coffee", "smart home"],
                stock: 75,
                vendor_id: vendor1,
                images: coffeeUrl ? [coffeeUrl] : []
            }
        ];

        for (const pd of sampleProducts) {
            const product = new ProductModel(pd);
            await product.save();
        }
        
        console.log(`[Catalog Seed] Created ${sampleProducts.length} sample products with real Cloudinary CDN images.`);
    } catch (error) {
        console.error("[Catalog Seed] Error during seeding:", error);
    } finally {
        await mongoose.disconnect();
        await identityPool.end();
        console.log("[Catalog Seed] Disconnected from all databases.");
    }
}

seed();
