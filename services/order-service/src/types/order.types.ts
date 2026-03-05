export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product_slug: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    image: string;
}

export interface Order {
    id: string;
    user_id: string;
    status: OrderStatus;
    subtotal: number;
    shipping: number;
    total: number;
    shipping_address: ShippingAddress | null;
    created_at: string;
    updated_at: string;
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
}

export type OrderStatus = "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export const VALID_STATUSES: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

export interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface CartItem {
    product_id: string;
    slug: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

export interface CartResponse {
    items: CartItem[];
    subtotal: number;
    item_count: number;
    updated_at: string;
}

export interface CatalogProduct {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    images: string[];
    is_active: boolean;
}

export interface OrderQuery {
    page?: number;
    limit?: number;
    status?: string;
}
