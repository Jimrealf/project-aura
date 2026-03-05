import { Pool } from "pg";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { computeShipping } from "./shipping";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const orderPool = new Pool({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    user: process.env.DB_USER ?? "aura",
    password: process.env.DB_PASSWORD ?? "aura_dev",
    database: process.env.DB_NAME ?? "aura_db",
});

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/aura_catalog";

interface SeedProduct {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
}

const STATUSES = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

const ADDRESSES = [
    { street: "123 Main St", city: "Austin", state: "TX", zip: "78701", country: "US" },
    { street: "456 Oak Ave", city: "San Francisco", state: "CA", zip: "94102", country: "US" },
    { street: "789 Pine Rd", city: "New York", state: "NY", zip: "10001", country: "US" },
    { street: "321 Elm Blvd", city: "Chicago", state: "IL", zip: "60601", country: "US" },
    { street: "654 Maple Dr", city: "Seattle", state: "WA", zip: "98101", country: "US" },
    { street: "987 Cedar Ln", city: "Denver", state: "CO", zip: "80201", country: "US" },
    { street: "147 Birch Way", city: "Portland", state: "OR", zip: "97201", country: "US" },
    { street: "258 Walnut Ct", city: "Miami", state: "FL", zip: "33101", country: "US" },
    { street: "369 Spruce St", city: "Boston", state: "MA", zip: "02101", country: "US" },
    { street: "741 Ash Pl", city: "Nashville", state: "TN", zip: "37201", country: "US" },
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));
    return d;
}

async function fetchCustomerIds(): Promise<string[]> {
    const result = await orderPool.query(
        "SELECT id FROM users WHERE role = $1 AND is_active = true ORDER BY created_at ASC",
        ["customer"]
    );
    return result.rows.map((row: { id: string }) => row.id);
}

async function fetchProducts(): Promise<SeedProduct[]> {
    await mongoose.connect(MONGO_URI);
    console.log("[Order Seed] Connected to MongoDB");

    const products = await mongoose.connection.db!.collection("products").find(
        { is_active: true },
        { projection: { _id: 1, name: 1, slug: 1, price: 1, images: 1 } }
    ).toArray();

    return products.map(p => ({
        id: p._id.toString(),
        name: p.name as string,
        slug: p.slug as string,
        price: p.price as number,
        images: (p.images as string[]) ?? [],
    }));
}

async function seed() {
    try {
        const sqlInit = `
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
                subtotal NUMERIC(10, 2) NOT NULL,
                shipping NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                total NUMERIC(10, 2) NOT NULL,
                shipping_address JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id VARCHAR(255) NOT NULL,
                product_slug VARCHAR(255) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                unit_price NUMERIC(10, 2) NOT NULL,
                quantity INTEGER NOT NULL,
                line_total NUMERIC(10, 2) NOT NULL,
                image VARCHAR(500) DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        `;
        await orderPool.query(sqlInit);
        console.log("[Order Seed] Tables ensured.");

        console.log("[Order Seed] Fetching customer IDs from Identity DB...");
        const customerIds = await fetchCustomerIds();
        if (customerIds.length === 0) {
            console.error("[Order Seed] No customers found. Run seed:identity first.");
            return;
        }
        console.log(`[Order Seed] Found ${customerIds.length} customers.`);

        console.log("[Order Seed] Fetching products from Catalog DB...");
        const products = await fetchProducts();
        if (products.length === 0) {
            console.error("[Order Seed] No products found. Run seed:catalog first.");
            return;
        }
        console.log(`[Order Seed] Found ${products.length} products.`);

        await orderPool.query("DELETE FROM order_items");
        await orderPool.query("DELETE FROM orders");
        console.log("[Order Seed] Cleared existing orders.");

        let orderCount = 0;
        let itemCount = 0;

        for (const customerId of customerIds) {
            const numOrders = randomInt(1, 4);

            for (let i = 0; i < numOrders; i++) {
                const numItems = randomInt(1, Math.min(4, products.length));
                const shuffled = [...products].sort(() => Math.random() - 0.5);
                const selectedProducts = shuffled.slice(0, numItems);

                const orderItems: {
                    product_id: string;
                    product_slug: string;
                    product_name: string;
                    unit_price: number;
                    quantity: number;
                    line_total: number;
                    image: string;
                }[] = [];

                let subtotal = 0;
                for (const product of selectedProducts) {
                    const qty = randomInt(1, 3);
                    const lineTotal = Math.round(product.price * qty * 100) / 100;
                    subtotal += lineTotal;
                    orderItems.push({
                        product_id: product.id,
                        product_slug: product.slug,
                        product_name: product.name,
                        unit_price: product.price,
                        quantity: qty,
                        line_total: lineTotal,
                        image: product.images[0] ?? "",
                    });
                }

                subtotal = Math.round(subtotal * 100) / 100;
                const shipping = computeShipping(subtotal);
                const total = Math.round((subtotal + shipping) * 100) / 100;
                const address = pick(ADDRESSES);
                const status = pick(STATUSES);
                const createdAt = daysAgo(randomInt(1, 90));
                const updatedAt = new Date(createdAt.getTime() + randomInt(0, 3) * 86400000);

                const orderResult = await orderPool.query(
                    `INSERT INTO orders (user_id, status, subtotal, shipping, total, shipping_address, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     RETURNING id`,
                    [customerId, status, subtotal, shipping, total, JSON.stringify(address), createdAt, updatedAt]
                );
                const orderId = orderResult.rows[0].id;

                for (const item of orderItems) {
                    await orderPool.query(
                        `INSERT INTO order_items (order_id, product_id, product_slug, product_name, unit_price, quantity, line_total, image)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [orderId, item.product_id, item.product_slug, item.product_name, item.unit_price, item.quantity, item.line_total, item.image]
                    );
                    itemCount++;
                }

                orderCount++;
            }
        }

        console.log(`\n[Order Seed] Created ${orderCount} orders with ${itemCount} total line items.`);

        const statusSummary = await orderPool.query(
            "SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY status"
        );
        console.log("\nOrders by status:");
        console.table(statusSummary.rows);

        const topCustomers = await orderPool.query(
            `SELECT u.email, COUNT(o.id) as order_count, SUM(o.total) as total_spent
             FROM orders o JOIN users u ON o.user_id = u.id
             GROUP BY u.email ORDER BY total_spent DESC LIMIT 10`
        );
        console.log("\nTop 10 customers by spend:");
        console.table(topCustomers.rows);

    } catch (error) {
        console.error("[Order Seed] Error during seeding:", error);
    } finally {
        await mongoose.disconnect();
        await orderPool.end();
        console.log("\n[Order Seed] Disconnected from all databases.");
    }
}

seed();
