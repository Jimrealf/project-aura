import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../index";
import { ProductModel } from "../models/product.model";

const JWT_SECRET = process.env.JWT_SECRET ?? "aura_dev_secret_key";

const vendorId = "vendor_uuid_techstore_123";
const otherVendorId = "vendor_uuid_other_123";

const vendorToken = jwt.sign({ userId: vendorId, role: "vendor" }, JWT_SECRET);
const otherVendorToken = jwt.sign({ userId: otherVendorId, role: "vendor" }, JWT_SECRET);
const adminToken = jwt.sign({ userId: "admin_id", role: "admin" }, JWT_SECRET);
const customerToken = jwt.sign({ userId: "customer_id", role: "customer" }, JWT_SECRET);

describe("Catalog Service - Product API", () => {
    let createdProductId: string;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI_TEST ?? "mongodb://localhost:27017/aura_catalog_test");
        }
        await ProductModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    describe("POST /api/products (Create API)", () => {
        it("returns 401 without token", async () => {
            const res = await request(app).post("/api/products").send({ name: "A", price: 10, category: "C" });
            expect(res.status).toBe(401);
        });

        it("returns 403 with customer token", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ name: "A", price: 10, category: "C" });
            expect(res.status).toBe(403);
        });

        it("returns 400 when name is missing", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({ price: 10, category: "C", description: "test" });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Missing required fields");
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when price is negative", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({ name: "Negative Price", description: "Bad price test", price: -5, category: "Electronics" });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Price cannot be negative");
        });

        it("creates a new product successfully with vendor token", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({
                    name: "Sony WH-1000XM4",
                    description: "Top noise cancelling headphones",
                    price: 348.00,
                    category: "Electronics",
                    stock: 50,
                    tags: ["audio", "sony", "headphones"]
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe("Sony WH-1000XM4");
            expect(res.body.data.slug).toBe("sony-wh-1000xm4");
            expect(res.body.data.vendor_id).toBe(vendorId);

            createdProductId = res.body.data.id;
        });

        it("creates a product with a unique slug if duplicate name exists", async () => {
            const res = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({
                    name: "Sony WH-1000XM4",
                    description: "Another copy",
                    price: 299.99,
                    category: "Electronics",
                    stock: 10
                });

            expect(res.status).toBe(201);
            expect(res.body.data.slug).toMatch(/^sony-wh-1000xm4-\d+$/);
        });
    });

    describe("GET /api/products (List API)", () => {
        beforeAll(async () => {
            await request(app).post("/api/products").set("Authorization", `Bearer ${vendorToken}`).send({
                name: "MacBook Air", description: "M1 chip", price: 999.00, category: "Electronics"
            });
            await request(app).post("/api/products").set("Authorization", `Bearer ${vendorToken}`).send({
                name: "Nike T-Shirt", description: "Cotton shirt", price: 25.00, category: "Fashion"
            });
        });

        it("lists products with pagination", async () => {
            const res = await request(app).get("/api/products?page=1&limit=2");
            expect(res.status).toBe(200);
            expect(res.body.data.products.length).toBe(2);
            expect(res.body.data.total).toBe(4);
            expect(res.body.data.pages).toBe(2);
        });

        it("filters by category", async () => {
            const res = await request(app).get("/api/products?category=Fashion");
            expect(res.status).toBe(200);
            expect(res.body.data.products.length).toBe(1);
            expect(res.body.data.products[0].name).toBe("Nike T-Shirt");
        });

        it("searches via text index (q param)", async () => {
            const res = await request(app).get("/api/products?q=sony");
            expect(res.status).toBe(200);
            expect(res.body.data.products.length).toBe(2);
        });

        it("filters by price range (min_price, max_price)", async () => {
            const res = await request(app).get("/api/products?min_price=10&max_price=50");
            expect(res.status).toBe(200);
            expect(res.body.data.products.length).toBe(1);
            expect(res.body.data.products[0].price).toBe(25.00);
        });

        it("sorts by price asc", async () => {
            const res = await request(app).get("/api/products?sort=price_asc");
            expect(res.status).toBe(200);
            expect(res.body.data.products[0].price).toBe(25.00);
        });
    });

    describe("GET /api/products/:slug (Details API)", () => {
        it("returns product details by slug", async () => {
            const res = await request(app).get("/api/products/sony-wh-1000xm4");
            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe("Sony WH-1000XM4");
        });

        it("returns 404 for non-existent slug", async () => {
            const res = await request(app).get("/api/products/does-not-exist");
            expect(res.status).toBe(404);
        });
    });

    describe("PUT /api/products/:id (Update API)", () => {
        it("updates product successfully by owning vendor", async () => {
            const res = await request(app)
                .put(`/api/products/${createdProductId}`)
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({ price: 300.00 });

            expect(res.status).toBe(200);
            expect(res.body.data.price).toBe(300.00);
        });

        it("updates product successfully by admin", async () => {
            const res = await request(app)
                .put(`/api/products/${createdProductId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ stock: 99 });

            expect(res.status).toBe(200);
            expect(res.body.data.stock).toBe(99);
        });

        it("returns 403 when updating another vendor's product", async () => {
            const res = await request(app)
                .put(`/api/products/${createdProductId}`)
                .set("Authorization", `Bearer ${otherVendorToken}`)
                .send({ price: 10 });

            expect(res.status).toBe(403);
        });
    });

    describe("DELETE /api/products/:id (Delete API)", () => {
        it("returns 403 when deleting another vendor's product", async () => {
            const res = await request(app)
                .delete(`/api/products/${createdProductId}`)
                .set("Authorization", `Bearer ${otherVendorToken}`);

            expect(res.status).toBe(403);
        });

        it("soft-deletes product successfully by owning vendor", async () => {
            const res = await request(app)
                .delete(`/api/products/${createdProductId}`)
                .set("Authorization", `Bearer ${vendorToken}`);

            expect(res.status).toBe(200);
        });

        it("soft-deleted product does not appear in list", async () => {
            const res = await request(app).get("/api/products");
            const ids = res.body.data.products.map((p: { id: string }) => p.id);
            expect(ids).not.toContain(createdProductId);
        });

        it("soft-deleted product returns 404 by slug", async () => {
            const res = await request(app).get("/api/products/sony-wh-1000xm4");
            expect(res.status).toBe(404);
        });
    });
});
