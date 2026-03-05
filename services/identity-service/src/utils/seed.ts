import pool from "../utils/db";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

interface SeedUser {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: "customer" | "admin" | "vendor" | "support";
}

const seedUsers: SeedUser[] = [
    { email: "john.doe@aura.com", password: "Customer123", first_name: "John", last_name: "Doe", role: "customer" },
    { email: "jane.smith@aura.com", password: "Customer123", first_name: "Jane", last_name: "Smith", role: "customer" },
    { email: "mike.wilson@aura.com", password: "Customer123", first_name: "Mike", last_name: "Wilson", role: "customer" },
    { email: "sarah.connor@aura.com", password: "Customer123", first_name: "Sarah", last_name: "Connor", role: "customer" },
    { email: "emma.watson@aura.com", password: "Customer123", first_name: "Emma", last_name: "Watson", role: "customer" },
    { email: "liam.johnson@aura.com", password: "Customer123", first_name: "Liam", last_name: "Johnson", role: "customer" },
    { email: "olivia.brown@aura.com", password: "Customer123", first_name: "Olivia", last_name: "Brown", role: "customer" },
    { email: "noah.davis@aura.com", password: "Customer123", first_name: "Noah", last_name: "Davis", role: "customer" },
    { email: "ava.martinez@aura.com", password: "Customer123", first_name: "Ava", last_name: "Martinez", role: "customer" },
    { email: "elijah.garcia@aura.com", password: "Customer123", first_name: "Elijah", last_name: "Garcia", role: "customer" },
    { email: "sophia.rodriguez@aura.com", password: "Customer123", first_name: "Sophia", last_name: "Rodriguez", role: "customer" },
    { email: "james.hernandez@aura.com", password: "Customer123", first_name: "James", last_name: "Hernandez", role: "customer" },
    { email: "isabella.lopez@aura.com", password: "Customer123", first_name: "Isabella", last_name: "Lopez", role: "customer" },
    { email: "benjamin.lee@aura.com", password: "Customer123", first_name: "Benjamin", last_name: "Lee", role: "customer" },
    { email: "mia.walker@aura.com", password: "Customer123", first_name: "Mia", last_name: "Walker", role: "customer" },
    { email: "lucas.hall@aura.com", password: "Customer123", first_name: "Lucas", last_name: "Hall", role: "customer" },
    { email: "charlotte.allen@aura.com", password: "Customer123", first_name: "Charlotte", last_name: "Allen", role: "customer" },
    { email: "henry.young@aura.com", password: "Customer123", first_name: "Henry", last_name: "Young", role: "customer" },
    { email: "amelia.king@aura.com", password: "Customer123", first_name: "Amelia", last_name: "King", role: "customer" },
    { email: "alexander.wright@aura.com", password: "Customer123", first_name: "Alexander", last_name: "Wright", role: "customer" },
    { email: "harper.scott@aura.com", password: "Customer123", first_name: "Harper", last_name: "Scott", role: "customer" },
    { email: "daniel.torres@aura.com", password: "Customer123", first_name: "Daniel", last_name: "Torres", role: "customer" },
    { email: "evelyn.nguyen@aura.com", password: "Customer123", first_name: "Evelyn", last_name: "Nguyen", role: "customer" },
    { email: "matthew.hill@aura.com", password: "Customer123", first_name: "Matthew", last_name: "Hill", role: "customer" },
    { email: "abigail.flores@aura.com", password: "Customer123", first_name: "Abigail", last_name: "Flores", role: "customer" },
    { email: "techstore@aura.com", password: "Vendor1234", first_name: "Tech", last_name: "Store", role: "vendor" },
    { email: "fashionhub@aura.com", password: "Vendor1234", first_name: "Fashion", last_name: "Hub", role: "vendor" },
    { email: "homecraft@aura.com", password: "Vendor1234", first_name: "Home", last_name: "Craft", role: "vendor" },
    { email: "sportzone@aura.com", password: "Vendor1234", first_name: "Sport", last_name: "Zone", role: "vendor" },
    { email: "bookworm@aura.com", password: "Vendor1234", first_name: "Book", last_name: "Worm", role: "vendor" },
    { email: "gadgetworld@aura.com", password: "Vendor1234", first_name: "Gadget", last_name: "World", role: "vendor" },
    { email: "greengrocer@aura.com", password: "Vendor1234", first_name: "Green", last_name: "Grocer", role: "vendor" },
    { email: "luxurylane@aura.com", password: "Vendor1234", first_name: "Luxury", last_name: "Lane", role: "vendor" },
    { email: "petvilla@aura.com", password: "Vendor1234", first_name: "Pet", last_name: "Villa", role: "vendor" },
    { email: "artisanmarket@aura.com", password: "Vendor1234", first_name: "Artisan", last_name: "Market", role: "vendor" },
    { email: "fitgear@aura.com", password: "Vendor1234", first_name: "Fit", last_name: "Gear", role: "vendor" },
    { email: "urbanstyle@aura.com", password: "Vendor1234", first_name: "Urban", last_name: "Style", role: "vendor" },
    { email: "kitchenking@aura.com", password: "Vendor1234", first_name: "Kitchen", last_name: "King", role: "vendor" },
    { email: "support.alex@aura.com", password: "Support1234", first_name: "Alex", last_name: "Rivera", role: "support" },
    { email: "support.maria@aura.com", password: "Support1234", first_name: "Maria", last_name: "Chen", role: "support" },
];

async function seed(): Promise<void> {
    console.log("Seeding users...\n");

    for (const user of seedUsers) {
        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [user.email]);

        if (existing.rows.length > 0) {
            console.log(`  [SKIP] ${user.email} (already exists)`);
            continue;
        }

        const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
        await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.email, passwordHash, user.first_name, user.last_name, user.role]
        );
        console.log(`  [CREATED] ${user.email} (${user.role})`);
    }

    const result = await pool.query("SELECT email, role, is_active FROM users ORDER BY role, email");
    console.log(`\nTotal users in database: ${result.rows.length}\n`);
    console.table(result.rows);

    await pool.end();
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
