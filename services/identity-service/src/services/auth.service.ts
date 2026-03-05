import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository";
import {
    RegisterInput,
    VendorRegisterInput,
    LoginInput,
    CreateInternalUserInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    AuthResponse,
    SafeUser,
    User,
} from "../types/user.types";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? "aura_dev_secret_key";
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN ?? "86400", 10);

function toSafeUser(user: User): SafeUser {
    const { password_hash, reset_token, reset_token_expires, ...safeUser } = user;
    return safeUser;
}

function generateToken(userId: string, role: string): string {
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
    return jwt.sign({ userId, role }, JWT_SECRET, options);
}

export const AuthService = {
    async register(input: RegisterInput): Promise<AuthResponse> {
        const existing = await UserRepository.findByEmail(input.email);
        if (existing) {
            const error = new Error("Email already registered");
            (error as NodeJS.ErrnoException).code = "CONFLICT";
            throw error;
        }

        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await UserRepository.create({
            email: input.email,
            password_hash: passwordHash,
            first_name: input.first_name,
            last_name: input.last_name,
            role: "customer",
        });

        const token = generateToken(user.id, user.role);
        return { user: toSafeUser(user), token };
    },

    async registerVendor(input: VendorRegisterInput): Promise<AuthResponse> {
        const existing = await UserRepository.findByEmail(input.email);
        if (existing) {
            const error = new Error("Email already registered");
            (error as NodeJS.ErrnoException).code = "CONFLICT";
            throw error;
        }

        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await UserRepository.create({
            email: input.email,
            password_hash: passwordHash,
            first_name: input.first_name ?? input.business_name,
            last_name: input.last_name,
            role: "vendor",
        });

        const token = generateToken(user.id, user.role);
        return { user: toSafeUser(user), token };
    },

    async login(input: LoginInput): Promise<AuthResponse> {
        const user = await UserRepository.findByEmail(input.email);
        if (!user) {
            const error = new Error("Invalid email or password");
            (error as NodeJS.ErrnoException).code = "UNAUTHORIZED";
            throw error;
        }

        const isValidPassword = await bcrypt.compare(input.password, user.password_hash);
        if (!isValidPassword) {
            const error = new Error("Invalid email or password");
            (error as NodeJS.ErrnoException).code = "UNAUTHORIZED";
            throw error;
        }

        const token = generateToken(user.id, user.role);
        return { user: toSafeUser(user), token };
    },

    async createInternalUser(input: CreateInternalUserInput): Promise<SafeUser> {
        const existing = await UserRepository.findByEmail(input.email);
        if (existing) {
            const error = new Error("Email already registered");
            (error as NodeJS.ErrnoException).code = "CONFLICT";
            throw error;
        }

        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await UserRepository.create({
            email: input.email,
            password_hash: passwordHash,
            first_name: input.first_name,
            last_name: input.last_name,
            role: input.role,
        });

        return toSafeUser(user);
    },

    async forgotPassword(input: ForgotPasswordInput): Promise<string | null> {
        const user = await UserRepository.findByEmail(input.email);
        if (!user) {
            return null;
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        await UserRepository.updateResetToken(input.email, hashedToken, expires);

        return resetToken;
    },

    async resetPassword(input: ResetPasswordInput): Promise<void> {
        const hashedToken = crypto.createHash("sha256").update(input.token).digest("hex");

        const user = await UserRepository.findByResetToken(hashedToken);
        if (!user) {
            const error = new Error("Invalid or expired reset token");
            (error as NodeJS.ErrnoException).code = "BAD_REQUEST";
            throw error;
        }

        const passwordHash = await bcrypt.hash(input.new_password, SALT_ROUNDS);
        await UserRepository.updatePassword(user.id, passwordHash);
    },
};
