import pool from "../utils/db";
import { User, UserRole } from "../types/user.types";

export const UserRepository = {
    async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND is_active = true",
            [email]
        );
        return result.rows[0] ?? null;
    },

    async findById(id: string): Promise<User | null> {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1 AND is_active = true",
            [id]
        );
        return result.rows[0] ?? null;
    },

    async create(data: {
        email: string;
        password_hash: string;
        first_name?: string;
        last_name?: string;
        role?: UserRole;
    }): Promise<User> {
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                data.email,
                data.password_hash,
                data.first_name ?? null,
                data.last_name ?? null,
                data.role ?? "customer",
            ]
        );
        return result.rows[0];
    },

    async updateResetToken(
        email: string,
        token: string | null,
        expires: Date | null
    ): Promise<void> {
        await pool.query(
            `UPDATE users
             SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
             WHERE email = $3 AND is_active = true`,
            [token, expires, email]
        );
    },

    async findByResetToken(token: string): Promise<User | null> {
        const result = await pool.query(
            `SELECT * FROM users
             WHERE reset_token = $1
             AND reset_token_expires > NOW()
             AND is_active = true`,
            [token]
        );
        return result.rows[0] ?? null;
    },

    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await pool.query(
            `UPDATE users
             SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, id]
        );
    },
};
