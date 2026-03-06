import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { redis } from "../utils/redis";
import * as catalog from "../utils/catalog";

const JWT_SECRET = process.env.JWT_SECRET!;

const customerId = "customer_uuid_test_123";
const otherCustomerId = "customer_uuid_other_456";

const customerToken = jwt.sign({ userId: customerId, role: "customer" }, JWT_SECRET);
const otherCustomerToken = jwt.sign({ userId: otherCustomerId, role: "customer" }, JWT_SECRET);

const mockProduct = {
    id: "product_id_abc123",
    name: "AuraBook Pro 16",
    slug: "aurabook-pro-16",
    price: 2499.99,
    stock: 10,
    images: ["https://res.cloudinary.com/demo/image/aurabook.jpg"],
    is_active: true,
};

const mockProduct2 = {
    id: "product_id_def456",
    name: "Wireless Mouse",
    slug: "wireless-mouse",
    price: 49.99,
    stock: 50,
    images: ["https://res.cloudinary.com/demo/image/mouse.jpg"],
    is_active: true,
};

const lowStockProduct = {
    id: "product_id_low_stock",
    name: "Limited Edition Watch",
    slug: "limited-edition-watch",
    price: 999.99,
    stock: 2,
    images: ["https://res.cloudinary.com/demo/image/watch.jpg"],
    is_active: true,
};

jest.mock("../utils/catalog");
const mockedCatalog = catalog as jest.Mocked<typeof catalog>;

function cartKey(userId: string): string {
    return `cart:${userId}`;
}

describe("Cart Service - Cart API", () => {
    beforeEach(async () => {
        await redis.del(cartKey(customerId));
        await redis.del(cartKey(otherCustomerId));
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await redis.del(cartKey(customerId));
        await redis.del(cartKey(otherCustomerId));
        await redis.quit();
    });

    describe("Authentication", () => {
        it("POST /api/cart returns 401 without token", async () => {
            const res = await request(app)
                .post("/api/cart")
                .send({ slug: "aurabook-pro-16", quantity: 1 });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe("UNAUTHORIZED");
        });

        it("GET /api/cart returns 401 without token", async () => {
            const res = await request(app).get("/api/cart");
            expect(res.status).toBe(401);
        });

        it("PUT /api/cart returns 401 without token", async () => {
            const res = await request(app)
                .put("/api/cart")
                .send({ product_id: "abc", quantity: 2 });
            expect(res.status).toBe(401);
        });

        it("DELETE /api/cart/someId returns 401 without token", async () => {
            const res = await request(app).delete("/api/cart/someId");
            expect(res.status).toBe(401);
        });

        it("DELETE /api/cart returns 401 without token", async () => {
            const res = await request(app).delete("/api/cart");
            expect(res.status).toBe(401);
        });

        it("returns 401 with an invalid token", async () => {
            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", "Bearer invalid.token.here");
            expect(res.status).toBe(401);
        });

        it("returns 401 with expired token", async () => {
            const expiredToken = jwt.sign(
                { userId: customerId, role: "customer" },
                JWT_SECRET,
                { expiresIn: "0s" }
            );
            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", `Bearer ${expiredToken}`);
            expect(res.status).toBe(401);
        });
    });

    describe("POST /api/cart (Add Item)", () => {
        it("adds an item to an empty cart", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].product_id).toBe(mockProduct.id);
            expect(res.body.data.items[0].name).toBe(mockProduct.name);
            expect(res.body.data.items[0].price).toBe(mockProduct.price);
            expect(res.body.data.items[0].quantity).toBe(1);
            expect(res.body.data.items[0].image).toBe(mockProduct.images[0]);
            expect(res.body.data.subtotal).toBe(2499.99);
            expect(res.body.data.item_count).toBe(1);
        });

        it("uses server-side price from Catalog, not client-submitted data", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1, price: 0.01 });

            expect(res.status).toBe(200);
            expect(res.body.data.items[0].price).toBe(2499.99);
            expect(res.body.data.subtotal).toBe(2499.99);
        });

        it("increments quantity when adding the same item twice", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 2 });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].quantity).toBe(3);
            expect(res.body.data.subtotal).toBe(7499.97);
            expect(res.body.data.item_count).toBe(3);
        });

        it("adds multiple different products to the cart", async () => {
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValueOnce(mockProduct2);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "wireless-mouse", quantity: 2 });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(2);
            expect(res.body.data.subtotal).toBe(2599.97);
            expect(res.body.data.item_count).toBe(3);
        });

        it("returns 404 when product does not exist", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "nonexistent-product", quantity: 1 });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("returns 400 when quantity exceeds stock", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(lowStockProduct);

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "limited-edition-watch", quantity: 5 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INSUFFICIENT_STOCK");
        });

        it("returns 400 when cumulative quantity exceeds stock", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(lowStockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "limited-edition-watch", quantity: 1 });

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "limited-edition-watch", quantity: 2 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INSUFFICIENT_STOCK");
        });

        it("returns 400 when slug is missing", async () => {
            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ quantity: 1 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
            expect(res.body.error).toContain("slug");
        });

        it("returns 400 when quantity is missing", async () => {
            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16" });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when quantity is zero", async () => {
            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 0 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when quantity is negative", async () => {
            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: -1 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when quantity is a decimal", async () => {
            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1.5 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("carts are isolated between users", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 2 });

            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", `Bearer ${otherCustomerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);
        });
    });

    describe("GET /api/cart (View Cart)", () => {
        it("returns empty cart when no items exist", async () => {
            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);
            expect(res.body.data.item_count).toBe(0);
        });

        it("returns cart with correct subtotal for multiple items", async () => {
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValueOnce(mockProduct2);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "wireless-mouse", quantity: 3 });

            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(2);
            expect(res.body.data.subtotal).toBe(2649.96);
            expect(res.body.data.item_count).toBe(4);
        });
    });

    describe("PUT /api/cart (Update Quantity)", () => {
        beforeEach(async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);
            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 2 });
        });

        it("updates quantity of an existing item", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ product_id: mockProduct.id, quantity: 5 });

            expect(res.status).toBe(200);
            expect(res.body.data.items[0].quantity).toBe(5);
            expect(res.body.data.subtotal).toBe(12499.95);
        });

        it("removes item when quantity set to 0", async () => {
            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ product_id: mockProduct.id, quantity: 0 });

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);
            expect(res.body.data.item_count).toBe(0);
        });

        it("returns 400 when updated quantity exceeds stock", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ product_id: mockProduct.id, quantity: 999 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INSUFFICIENT_STOCK");
        });

        it("returns 404 when cart does not exist", async () => {
            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${otherCustomerToken}`)
                .send({ product_id: mockProduct.id, quantity: 1 });

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("returns 404 when item is not in cart", async () => {
            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ product_id: "nonexistent_product_id", quantity: 1 });

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("returns 400 when product_id is missing", async () => {
            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ quantity: 1 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when quantity is negative", async () => {
            const res = await request(app)
                .put("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ product_id: mockProduct.id, quantity: -1 });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });
    });

    describe("DELETE /api/cart/:productId (Remove Item)", () => {
        beforeEach(async () => {
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockProduct)
                .mockResolvedValueOnce(mockProduct2);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "wireless-mouse", quantity: 2 });
        });

        it("removes a specific item from the cart", async () => {
            const res = await request(app)
                .delete(`/api/cart/${mockProduct.id}`)
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(1);
            expect(res.body.data.items[0].product_id).toBe(mockProduct2.id);
            expect(res.body.data.subtotal).toBe(99.98);
        });

        it("deletes cart key when last item is removed", async () => {
            await request(app)
                .delete(`/api/cart/${mockProduct.id}`)
                .set("Authorization", `Bearer ${customerToken}`);

            const res = await request(app)
                .delete(`/api/cart/${mockProduct2.id}`)
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);

            const cartData = await redis.get(cartKey(customerId));
            expect(cartData).toBeNull();
        });

        it("returns 404 when item is not in cart", async () => {
            const res = await request(app)
                .delete("/api/cart/nonexistent_product_id")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("returns 404 when cart does not exist", async () => {
            const res = await request(app)
                .delete(`/api/cart/${mockProduct.id}`)
                .set("Authorization", `Bearer ${otherCustomerToken}`);

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });
    });

    describe("DELETE /api/cart (Clear Cart)", () => {
        it("clears entire cart successfully", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 2 });

            const res = await request(app)
                .delete("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.message).toBe("Cart cleared successfully");

            const cartData = await redis.get(cartKey(customerId));
            expect(cartData).toBeNull();
        });

        it("clearing an already empty cart returns 200", async () => {
            const res = await request(app)
                .delete("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it("cart is empty after clearing", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            await request(app)
                .delete("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            const res = await request(app)
                .get("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.items).toHaveLength(0);
            expect(res.body.data.subtotal).toBe(0);
        });
    });

    describe("TTL Behavior", () => {
        it("cart is stored with a TTL in Redis", async () => {
            mockedCatalog.fetchProduct.mockResolvedValue(mockProduct);

            await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "aurabook-pro-16", quantity: 1 });

            const ttl = await redis.ttl(cartKey(customerId));
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(900);
        });
    });

    describe("Subtotal Calculation", () => {
        it("computes subtotal correctly with fractional prices", async () => {
            const fractionalProduct = { ...mockProduct2, price: 19.97, id: "frac_product_id" };
            mockedCatalog.fetchProduct.mockResolvedValue(fractionalProduct);

            const res = await request(app)
                .post("/api/cart")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ slug: "wireless-mouse", quantity: 3 });

            expect(res.status).toBe(200);
            expect(res.body.data.subtotal).toBe(59.91);
        });
    });
});
