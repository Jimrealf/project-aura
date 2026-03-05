CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default admin user (password: Admin1234)
-- bcrypt hash generated with 10 rounds
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
    'admin@aura.com',
    '$2b$10$14hhQO3Nh35QefcRzu.pQ.X8XV5M6P0sVNfIhBivlzff9zCHBDSIa',
    'System',
    'Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;
