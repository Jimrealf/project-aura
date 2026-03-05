export interface CartItem {
    product_id: string;
    slug: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

export interface Cart {
    items: CartItem[];
    updated_at: string;
}

export interface CartResponse {
    items: CartItem[];
    subtotal: number;
    item_count: number;
    updated_at: string;
}

export interface AddToCartInput {
    slug: string;
    quantity: number;
}

export interface UpdateCartInput {
    product_id: string;
    quantity: number;
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
