import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import pool from "../utils/db";
import { initializeDatabase } from "../utils/initDb";
import * as cartUtil from "../utils/cart";
import * as catalogUtil from "../utils/catalog";

const JWT_SECRET = process.env.JWT_SECRET!;

const customerId = "d1e04cc6-70e9-4d08-988f-c0f17eab8c3b";
const otherCustomerId = "a2b05dd7-81fa-5e19-0990-d1028fab9d4c";
const adminId = "c3f06ee8-92gb-6f2a-1aah-e2h39gbc0e5d";

const customerToken = jwt.sign({ userId: customerId, role: "customer" }, JWT_SECRET);
const otherCustomerToken = jwt.sign({ userId: otherCustomerId, role: "customer" }, JWT_SECRET);
const adminToken = jwt.sign({ userId: adminId, role: "admin" }, JWT_SECRET);
const vendorToken = jwt.sign({ userId: "vendor_id", role: "vendor" }, JWT_SECRET);

jest.mock("../utils/cart");
jest.mock("../utils/catalog");

const mockedCart = cartUtil as jest.Mocked<typeof cartUtil>;
const mockedCatalog = catalogUtil as jest.Mocked<typeof catalogUtil>;

const mockCartItems = [
    {
        product_id: "prod_abc123",
        slug: "aurabook-pro-16",
        name: "AuraBook Pro 16",
        price: 2499.99,
        quantity: 1,
        image: "https://res.cloudinary.com/demo/aurabook.jpg",
    },
    {
        product_id: "prod_def456",
        slug: "wireless-mouse",
        name: "Wireless Mouse",
        price: 49.99,
        quantity: 2,
        image: "https://res.cloudinary.com/demo/mouse.jpg",
    },
];

const mockCartResponse = {
    items: mockCartItems,
    subtotal: 2599.97,
    item_count: 3,
    updated_at: new Date().toISOString(),
};

const mockCatalogProduct1 = {
    id: "prod_abc123",
    name: "AuraBook Pro 16",
    slug: "aurabook-pro-16",
    price: 2499.99,
    stock: 10,
    images: ["https://res.cloudinary.com/demo/aurabook.jpg"],
    is_active: true,
};

const mockCatalogProduct2 = {
    id: "prod_def456",
    name: "Wireless Mouse",
    slug: "wireless-mouse",
    price: 49.99,
    stock: 50,
    images: ["https://res.cloudinary.com/demo/mouse.jpg"],
    is_active: true,
};

describe("Order Service", () => {
    beforeAll(async () => {
        await initializeDatabase();
    });

    beforeEach(async () => {
        await pool.query("DELETE FROM order_items");
        await pool.query("DELETE FROM orders");
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await pool.query("DELETE FROM order_items");
        await pool.query("DELETE FROM orders");
        await pool.end();
    });

    describe("POST /api/checkout", () => {
        it("returns 401 without token", async () => {
            const res = await request(app).post("/api/checkout");
            expect(res.status).toBe(401);
        });

        it("returns 403 for vendor role", async () => {
            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${vendorToken}`);
            expect(res.status).toBe(403);
        });

        it("creates an order with correct totals (happy path)", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ shipping_address: { street: "123 Main St", city: "Austin", state: "TX", zip: "78701", country: "US" } });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.items).toHaveLength(2);
            expect(parseFloat(res.body.data.subtotal)).toBe(2599.97);
            expect(parseFloat(res.body.data.shipping)).toBe(0);
            expect(parseFloat(res.body.data.total)).toBe(2599.97);
            expect(res.body.data.status).toBe("confirmed");
            expect(res.body.data.user_id).toBe(customerId);

            expect(mockedCart.clearCart).toHaveBeenCalled();
        });

        it("returns 400 for empty cart", async () => {
            mockedCart.fetchCart.mockResolvedValue({
                items: [],
                subtotal: 0,
                item_count: 0,
                updated_at: new Date().toISOString(),
            });

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("EMPTY_CART");
        });

        it("returns 400 when product is unavailable", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCatalog.fetchProduct.mockResolvedValueOnce(null);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("PRODUCT_UNAVAILABLE");
        });

        it("returns 409 when price has changed", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCatalog.fetchProduct.mockResolvedValueOnce({
                ...mockCatalogProduct1,
                price: 2999.99,
            });

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(409);
            expect(res.body.code).toBe("PRICE_MISMATCH");
            expect(res.body.details.stale_price).toBe(2499.99);
            expect(res.body.details.current_price).toBe(2999.99);
        });

        it("returns 400 when stock is insufficient", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCatalog.fetchProduct.mockResolvedValueOnce({
                ...mockCatalogProduct1,
                stock: 0,
            });

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INSUFFICIENT_STOCK");
            expect(res.body.details.available).toBe(0);
        });

        it("applies free shipping for subtotal >= $100", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(parseFloat(res.body.data.shipping)).toBe(0);
        });

        it("applies $5.99 shipping for subtotal $50-$99.99", async () => {
            const midTierCart = {
                items: [{
                    product_id: "prod_def456",
                    slug: "wireless-mouse",
                    name: "Wireless Mouse",
                    price: 49.99,
                    quantity: 1,
                    image: "https://res.cloudinary.com/demo/mouse.jpg",
                }],
                subtotal: 49.99,
                item_count: 1,
                updated_at: new Date().toISOString(),
            };
            mockedCart.fetchCart.mockResolvedValue(midTierCart);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct.mockResolvedValueOnce({ ...mockCatalogProduct2, price: 75.00 });

            const adjustedCart = {
                ...midTierCart,
                items: [{ ...midTierCart.items[0], price: 75.00 }],
            };
            mockedCart.fetchCart.mockResolvedValue(adjustedCart);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(parseFloat(res.body.data.shipping)).toBe(5.99);
        });

        it("applies $9.99 shipping for subtotal < $50", async () => {
            const lowCart = {
                items: [{
                    product_id: "prod_cheap",
                    slug: "sticker-pack",
                    name: "Sticker Pack",
                    price: 9.99,
                    quantity: 1,
                    image: "",
                }],
                subtotal: 9.99,
                item_count: 1,
                updated_at: new Date().toISOString(),
            };
            mockedCart.fetchCart.mockResolvedValue(lowCart);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct.mockResolvedValueOnce({
                id: "prod_cheap", name: "Sticker Pack", slug: "sticker-pack",
                price: 9.99, stock: 100, images: [], is_active: true,
            });

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(parseFloat(res.body.data.shipping)).toBe(9.99);
            expect(parseFloat(res.body.data.total)).toBe(19.98);
        });

        it("handles single item order correctly", async () => {
            const singleCart = {
                items: [mockCartItems[0]],
                subtotal: 2499.99,
                item_count: 1,
                updated_at: new Date().toISOString(),
            };
            mockedCart.fetchCart.mockResolvedValue(singleCart);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct.mockResolvedValueOnce(mockCatalogProduct1);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(res.body.data.items).toHaveLength(1);
            expect(parseFloat(res.body.data.subtotal)).toBe(2499.99);
        });

        it("snapshots product data at order time", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(res.body.data.items[0].product_name).toBe("AuraBook Pro 16");
            expect(parseFloat(res.body.data.items[0].unit_price)).toBe(2499.99);
            expect(res.body.data.items[0].product_slug).toBe("aurabook-pro-16");
        });

        it("computes line_total correctly per item", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(201);
            expect(parseFloat(res.body.data.items[0].line_total)).toBe(2499.99);
            expect(parseFloat(res.body.data.items[1].line_total)).toBe(99.98);
        });
    });

    describe("GET /api/orders/me", () => {
        it("returns 401 without token", async () => {
            const res = await request(app).get("/api/orders/me");
            expect(res.status).toBe(401);
        });

        it("returns empty array when no orders exist", async () => {
            const res = await request(app)
                .get("/api/orders/me")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orders).toHaveLength(0);
            expect(res.body.data.total).toBe(0);
        });

        it("returns orders with items for the authenticated user", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            const res = await request(app)
                .get("/api/orders/me")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orders).toHaveLength(1);
            expect(res.body.data.orders[0].items).toHaveLength(2);
            expect(res.body.data.page).toBe(1);
        });

        it("does not return other users orders", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            const res = await request(app)
                .get("/api/orders/me")
                .set("Authorization", `Bearer ${otherCustomerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orders).toHaveLength(0);
        });

        it("supports pagination", async () => {
            mockedCart.clearCart.mockResolvedValue();

            for (let i = 0; i < 3; i++) {
                mockedCart.fetchCart.mockResolvedValueOnce(mockCartResponse);
                mockedCatalog.fetchProduct
                    .mockResolvedValueOnce(mockCatalogProduct1)
                    .mockResolvedValueOnce(mockCatalogProduct2);

                await request(app)
                    .post("/api/checkout")
                    .set("Authorization", `Bearer ${customerToken}`);
            }

            const res = await request(app)
                .get("/api/orders/me?page=1&limit=2")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orders).toHaveLength(2);
            expect(res.body.data.total).toBe(3);
            expect(res.body.data.pages).toBe(2);
        });
    });

    describe("GET /api/orders/me/:orderId", () => {
        let orderId: string;

        beforeEach(async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);
            orderId = res.body.data.id;
        });

        it("returns order details for the owning customer", async () => {
            const res = await request(app)
                .get(`/api/orders/me/${orderId}`)
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(orderId);
            expect(res.body.data.items).toHaveLength(2);
        });

        it("returns 403 when viewing another users order", async () => {
            const res = await request(app)
                .get(`/api/orders/me/${orderId}`)
                .set("Authorization", `Bearer ${otherCustomerToken}`);

            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });

        it("returns 404 for non-existent order", async () => {
            const res = await request(app)
                .get("/api/orders/me/00000000-0000-0000-0000-000000000000")
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("allows admin to view any order", async () => {
            const res = await request(app)
                .get(`/api/orders/me/${orderId}`)
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(orderId);
        });
    });

    describe("GET /api/orders (Admin)", () => {
        it("returns 401 without token", async () => {
            const res = await request(app).get("/api/orders");
            expect(res.status).toBe(401);
        });

        it("returns 403 for customer role", async () => {
            const res = await request(app)
                .get("/api/orders")
                .set("Authorization", `Bearer ${customerToken}`);
            expect(res.status).toBe(403);
        });

        it("returns all orders for admin", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            const res = await request(app)
                .get("/api/orders")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
        });

        it("filters by status", async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);

            const confirmed = await request(app)
                .get("/api/orders?status=confirmed")
                .set("Authorization", `Bearer ${adminToken}`);
            expect(confirmed.status).toBe(200);
            expect(confirmed.body.data.orders.length).toBeGreaterThanOrEqual(1);

            const shipped = await request(app)
                .get("/api/orders?status=shipped")
                .set("Authorization", `Bearer ${adminToken}`);
            expect(shipped.status).toBe(200);
            expect(shipped.body.data.orders).toHaveLength(0);
        });
    });

    describe("PATCH /api/orders/:orderId/status (Admin)", () => {
        let orderId: string;

        beforeEach(async () => {
            mockedCart.fetchCart.mockResolvedValue(mockCartResponse);
            mockedCart.clearCart.mockResolvedValue();
            mockedCatalog.fetchProduct
                .mockResolvedValueOnce(mockCatalogProduct1)
                .mockResolvedValueOnce(mockCatalogProduct2);

            const res = await request(app)
                .post("/api/checkout")
                .set("Authorization", `Bearer ${customerToken}`);
            orderId = res.body.data.id;
        });

        it("returns 403 for customer role", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ status: "shipped" });
            expect(res.status).toBe(403);
        });

        it("updates status to shipped", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "shipped" });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("shipped");
        });

        it("updates status to delivered", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "delivered" });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("delivered");
        });

        it("updates status to cancelled", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "cancelled" });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("cancelled");
        });

        it("returns 400 for invalid status", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "invalid_status" });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 when status is missing", async () => {
            const res = await request(app)
                .patch(`/api/orders/${orderId}/status`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 404 for non-existent order", async () => {
            const res = await request(app)
                .patch("/api/orders/00000000-0000-0000-0000-000000000000/status")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ status: "shipped" });

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });
    });
});
