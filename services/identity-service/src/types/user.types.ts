export type UserRole = "customer" | "admin" | "vendor" | "support";

export interface User {
    id: string;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    role: UserRole;
    is_active: boolean;
    reset_token: string | null;
    reset_token_expires: Date | null;
    created_at: Date;
    updated_at: Date;
}

export type SafeUser = Omit<User, "password_hash" | "reset_token" | "reset_token_expires">;

export interface RegisterInput {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
}

export interface VendorRegisterInput extends RegisterInput {
    business_name: string;
    business_address?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface CreateInternalUserInput {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: "support" | "admin";
}

export interface AuthResponse {
    user: SafeUser;
    token: string;
}

export interface ForgotPasswordInput {
    email: string;
}

export interface ResetPasswordInput {
    token: string;
    new_password: string;
}
