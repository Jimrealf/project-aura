import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import pool from "../utils/db";
import { initializeDatabase } from "../utils/initDb";
import * as orderUtil from "../utils/order";
import stripe from "../utils/stripe";

const JWT_SECRET = process.env.JWT_SECRET!;

const customerId = "d1e04cc6-70e9-4d08-988f-c0f17eab8c3b";
const otherCustomerId = "a2b05dd7-81fa-5e19-0990-d1028fab9d4c";
const adminId = "c3f06ee8-92ab-6f2a-1aab-e2a39abc0e5d";
const orderId = "f1a23bc4-56de-7890-abcd-ef1234567890";

const customerToken = jwt.sign({ userId: customerId, role: "customer" }, JWT_SECRET);
const otherCustomerToken = jwt.sign({ userId: otherCustomerId, role: "customer" }, JWT_SECRET);
const adminToken = jwt.sign({ userId: adminId, role: "admin" }, JWT_SECRET);
const vendorToken = jwt.sign({ userId: "vendor_id", role: "vendor" }, JWT_SECRET);

jest.mock("../utils/order");
jest.mock("../utils/stripe", () => ({
    __esModule: true,
    default: {
        paymentIntents: {
            create: jest.fn(),
        },
        webhooks: {
            constructEvent: jest.fn(),
        },
    },
}));

const mockedOrder = orderUtil as jest.Mocked<typeof orderUtil>;
const mockedStripe = stripe as jest.Mocked<typeof stripe>;

const mockOrder = {
    id: orderId,
    user_id: customerId,
    status: "confirmed",
    subtotal: "75.00",
    shipping: "5.99",
    total: "80.99",
    items: [],
};

describe("Payment Service", () => {
    beforeAll(async () => {
        await initializeDatabase();
    });

    beforeEach(async () => {
        await pool.query("DELETE FROM payments");
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await pool.query("DELETE FROM payments");
        await pool.end();
    });

    describe("POST /api/payments/intent", () => {
        it("returns 401 without token", async () => {
            const res = await request(app)
                .post("/api/payments/intent")
                .send({ order_id: orderId });
            expect(res.status).toBe(401);
        });

        it("returns 403 for admin role", async () => {
            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ order_id: orderId });
            expect(res.status).toBe(403);
        });

        it("returns 403 for vendor role", async () => {
            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${vendorToken}`)
                .send({ order_id: orderId });
            expect(res.status).toBe(403);
        });

        it("returns 400 when order_id is missing", async () => {
            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 404 when order is not found", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });
            expect(res.status).toBe(404);
            expect(res.body.code).toBe("NOT_FOUND");
        });

        it("returns 403 when order belongs to another user", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);

            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${otherCustomerToken}`)
                .send({ order_id: orderId });
            expect(res.status).toBe(403);
            expect(res.body.code).toBe("FORBIDDEN");
        });

        it("returns 409 when order is already paid (processing)", async () => {
            mockedOrder.fetchOrder.mockResolvedValue({ ...mockOrder, status: "processing" });

            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });
            expect(res.status).toBe(409);
            expect(res.body.code).toBe("ALREADY_PAID");
        });

        it("creates a PaymentIntent successfully (happy path)", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_test_123",
                client_secret: "pi_test_123_secret_abc",
            });

            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.client_secret).toBe("pi_test_123_secret_abc");

            expect(mockedStripe.paymentIntents.create).toHaveBeenCalledWith({
                amount: 8099,
                currency: "usd",
                metadata: { order_id: orderId, user_id: customerId },
            });
        });

        it("returns existing pending intent for same order (idempotency)", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_test_456",
                client_secret: "pi_test_456_secret_def",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            const res = await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            expect(res.status).toBe(201);
            expect(mockedStripe.paymentIntents.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("POST /api/payments/webhook", () => {
        it("returns 400 when stripe-signature is missing", async () => {
            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .send(JSON.stringify({ type: "payment_intent.succeeded" }));
            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INVALID_SIGNATURE");
        });

        it("returns 400 when signature is invalid", async () => {
            (mockedStripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
                throw new Error("Invalid signature");
            });

            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "invalid_sig")
                .send(JSON.stringify({ type: "test" }));
            expect(res.status).toBe(400);
            expect(res.body.code).toBe("INVALID_SIGNATURE");
        });

        it("handles payment_intent.succeeded event", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_success_test",
                client_secret: "pi_success_test_secret",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            (mockedStripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
                type: "payment_intent.succeeded",
                data: { object: { id: "pi_success_test", last_payment_error: null } },
            });
            mockedOrder.updateOrderStatus.mockResolvedValue();

            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "valid_sig")
                .send(JSON.stringify({}));

            expect(res.status).toBe(200);
            expect(mockedOrder.updateOrderStatus).toHaveBeenCalledWith(orderId, "processing");
        });

        it("handles payment_intent.payment_failed event", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_fail_test",
                client_secret: "pi_fail_test_secret",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            (mockedStripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
                type: "payment_intent.payment_failed",
                data: { object: { id: "pi_fail_test", last_payment_error: { message: "Card declined" } } },
            });

            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "valid_sig")
                .send(JSON.stringify({}));

            expect(res.status).toBe(200);
        });

        it("ignores unknown event types", async () => {
            (mockedStripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
                type: "customer.created",
                data: { object: {} },
            });

            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "valid_sig")
                .send(JSON.stringify({}));

            expect(res.status).toBe(200);
        });

        it("handles duplicate webhook events idempotently", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_dup_test",
                client_secret: "pi_dup_test_secret",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            (mockedStripe.webhooks.constructEvent as jest.Mock).mockReturnValue({
                type: "payment_intent.succeeded",
                data: { object: { id: "pi_dup_test", last_payment_error: null } },
            });
            mockedOrder.updateOrderStatus.mockResolvedValue();

            await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "valid_sig")
                .send(JSON.stringify({}));

            const res = await request(app)
                .post("/api/payments/webhook")
                .set("Content-Type", "application/json")
                .set("stripe-signature", "valid_sig")
                .send(JSON.stringify({}));

            expect(res.status).toBe(200);
            expect(mockedOrder.updateOrderStatus).toHaveBeenCalledTimes(1);
        });
    });

    describe("GET /api/payments/order/:orderId", () => {
        beforeEach(async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_view_test",
                client_secret: "pi_view_test_secret",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });
        });

        it("returns 401 without token", async () => {
            const res = await request(app).get(`/api/payments/order/${orderId}`);
            expect(res.status).toBe(401);
        });

        it("returns payment for the owning customer", async () => {
            const res = await request(app)
                .get(`/api/payments/order/${orderId}`)
                .set("Authorization", `Bearer ${customerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.order_id).toBe(orderId);
            expect(res.body.data.status).toBe("pending");
        });

        it("returns 403 for another user", async () => {
            const res = await request(app)
                .get(`/api/payments/order/${orderId}`)
                .set("Authorization", `Bearer ${otherCustomerToken}`);
            expect(res.status).toBe(403);
        });

        it("allows admin to view any payment", async () => {
            const res = await request(app)
                .get(`/api/payments/order/${orderId}`)
                .set("Authorization", `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        it("returns 404 when no payment exists", async () => {
            const res = await request(app)
                .get("/api/payments/order/00000000-0000-0000-0000-000000000000")
                .set("Authorization", `Bearer ${customerToken}`);
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/payments (Admin)", () => {
        it("returns 401 without token", async () => {
            const res = await request(app).get("/api/payments");
            expect(res.status).toBe(401);
        });

        it("returns 403 for customer role", async () => {
            const res = await request(app)
                .get("/api/payments")
                .set("Authorization", `Bearer ${customerToken}`);
            expect(res.status).toBe(403);
        });

        it("returns paginated payments for admin", async () => {
            mockedOrder.fetchOrder.mockResolvedValue(mockOrder);
            (mockedStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
                id: "pi_admin_test",
                client_secret: "pi_admin_test_secret",
            });

            await request(app)
                .post("/api/payments/intent")
                .set("Authorization", `Bearer ${customerToken}`)
                .send({ order_id: orderId });

            const res = await request(app)
                .get("/api/payments")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
            expect(res.body.data.total).toBeGreaterThanOrEqual(1);
        });

        it("filters by status", async () => {
            const res = await request(app)
                .get("/api/payments?status=succeeded")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.payments).toHaveLength(0);
        });
    });
});
