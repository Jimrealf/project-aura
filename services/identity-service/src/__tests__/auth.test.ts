import request from "supertest";
import app from "../index";
import pool from "../utils/db";
import { initializeDatabase } from "../utils/initDb";

const TEST_CUSTOMER = {
    email: `test_customer_${Date.now()}@aura.com`,
    password: "TestPass1234",
    first_name: "Test",
    last_name: "Customer",
};

const TEST_VENDOR = {
    email: `test_vendor_${Date.now()}@aura.com`,
    password: "VendorPass1234",
    business_name: "Test Vendor Shop",
    first_name: "Test",
    last_name: "Vendor",
};

const TEST_INTERNAL = {
    email: `test_support_${Date.now()}@aura.com`,
    password: "SupportPass1234",
    first_name: "Support",
    last_name: "Agent",
    role: "support" as const,
};

let adminToken: string;

beforeAll(async () => {
    await initializeDatabase();

    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@aura.com", password: "Admin1234" });

    if (loginRes.status === 200) {
        adminToken = loginRes.body.data.token;
    }
});

afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE 'test_%'");
    await pool.end();
});

describe("POST /api/auth/register", () => {
    it("should register a new customer and return 201", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send(TEST_CUSTOMER);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.user.role).toBe("customer");
        expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it("should return 400 when email is missing", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ password: "Test1234" });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("should return 409 on duplicate email", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send(TEST_CUSTOMER);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe("CONFLICT");
    });
});

describe("POST /api/auth/register/vendor", () => {
    it("should register a new vendor and return 201", async () => {
        const res = await request(app)
            .post("/api/auth/register/vendor")
            .send(TEST_VENDOR);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe("vendor");
    });

    it("should return 400 when business_name is missing", async () => {
        const res = await request(app)
            .post("/api/auth/register/vendor")
            .send({ email: "no_biz@aura.com", password: "Test1234" });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
    });
});

describe("POST /api/auth/login", () => {
    it("should login and return 200 with a token", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_CUSTOMER.email, password: TEST_CUSTOMER.password });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
    });

    it("should return 401 on wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_CUSTOMER.email, password: "WrongPassword" });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("should return 401 on non-existent email", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "nobody@aura.com", password: "Test1234" });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("UNAUTHORIZED");
    });
});

describe("POST /api/auth/internal-user", () => {
    it("should create an internal user with admin token and return 201", async () => {
        if (!adminToken) {
            console.warn("Skipping: admin seed not available");
            return;
        }

        const res = await request(app)
            .post("/api/auth/internal-user")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(TEST_INTERNAL);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.role).toBe("support");
    });

    it("should return 401 without a token", async () => {
        const res = await request(app)
            .post("/api/auth/internal-user")
            .send(TEST_INTERNAL);

        expect(res.status).toBe(401);
    });

    it("should return 403 with a customer token", async () => {
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_CUSTOMER.email, password: TEST_CUSTOMER.password });

        const customerToken = loginRes.body.data.token;

        const res = await request(app)
            .post("/api/auth/internal-user")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
                email: "another_support@aura.com",
                password: "Pass1234",
                first_name: "Another",
                last_name: "Support",
                role: "support",
            });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("FORBIDDEN");
    });
});

describe("Password Reset Flow", () => {
    let resetToken: string;

    it("POST /api/auth/forgot-password should return 200", async () => {
        const res = await request(app)
            .post("/api/auth/forgot-password")
            .send({ email: TEST_CUSTOMER.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        resetToken = res.body.data.reset_token;
    });

    it("POST /api/auth/reset-password should return 200 with valid token", async () => {
        if (!resetToken) {
            console.warn("Skipping: no reset token");
            return;
        }

        const res = await request(app)
            .post("/api/auth/reset-password")
            .send({ token: resetToken, new_password: "NewPassword1234" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("POST /api/auth/reset-password should return 400 with invalid token", async () => {
        const res = await request(app)
            .post("/api/auth/reset-password")
            .send({ token: "invalid_token_here", new_password: "SomePass1234" });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("BAD_REQUEST");
    });
});
