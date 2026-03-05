import { cartRepository } from "../repositories/cart.repository";
import { Cart, CartItem, CartResponse, AddToCartInput, UpdateCartInput } from "../types/cart.types";
import { fetchProduct } from "../utils/catalog";

export class CartService {
    async addItem(userId: string, input: AddToCartInput): Promise<CartResponse> {
        const product = await fetchProduct(input.slug);
        if (!product) {
            throw new Error("PRODUCT_NOT_FOUND");
        }

        if (input.quantity > product.stock) {
            throw new Error("INSUFFICIENT_STOCK");
        }

        let cart = await cartRepository.get(userId);
        if (!cart) {
            cart = { items: [], updated_at: new Date().toISOString() };
        }

        const existingIndex = cart.items.findIndex(item => item.product_id === product.id);

        if (existingIndex >= 0) {
            const newQuantity = cart.items[existingIndex].quantity + input.quantity;
            if (newQuantity > product.stock) {
                throw new Error("INSUFFICIENT_STOCK");
            }
            cart.items[existingIndex].quantity = newQuantity;
            cart.items[existingIndex].price = product.price;
            cart.items[existingIndex].name = product.name;
            cart.items[existingIndex].image = product.images[0] ?? "";
        } else {
            const newItem: CartItem = {
                product_id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                quantity: input.quantity,
                image: product.images[0] ?? "",
            };
            cart.items.push(newItem);
        }

        cart.updated_at = new Date().toISOString();
        await cartRepository.set(userId, cart);

        return this.buildResponse(cart);
    }

    async getCart(userId: string): Promise<CartResponse> {
        const cart = await cartRepository.get(userId);
        if (!cart) {
            return { items: [], subtotal: 0, item_count: 0, updated_at: new Date().toISOString() };
        }
        return this.buildResponse(cart);
    }

    async updateItem(userId: string, input: UpdateCartInput): Promise<CartResponse> {
        const cart = await cartRepository.get(userId);
        if (!cart) {
            throw new Error("CART_NOT_FOUND");
        }

        const itemIndex = cart.items.findIndex(item => item.product_id === input.product_id);
        if (itemIndex < 0) {
            throw new Error("ITEM_NOT_FOUND");
        }

        if (input.quantity === 0) {
            cart.items.splice(itemIndex, 1);
            if (cart.items.length === 0) {
                await cartRepository.del(userId);
                return { items: [], subtotal: 0, item_count: 0, updated_at: new Date().toISOString() };
            }
        } else {
            const product = await fetchProduct(cart.items[itemIndex].slug);
            if (product && input.quantity > product.stock) {
                throw new Error("INSUFFICIENT_STOCK");
            }
            cart.items[itemIndex].quantity = input.quantity;
        }

        cart.updated_at = new Date().toISOString();
        await cartRepository.set(userId, cart);

        return this.buildResponse(cart);
    }

    async removeItem(userId: string, productId: string): Promise<CartResponse> {
        const cart = await cartRepository.get(userId);
        if (!cart) {
            throw new Error("CART_NOT_FOUND");
        }

        const itemIndex = cart.items.findIndex(item => item.product_id === productId);
        if (itemIndex < 0) {
            throw new Error("ITEM_NOT_FOUND");
        }

        cart.items.splice(itemIndex, 1);

        if (cart.items.length === 0) {
            await cartRepository.del(userId);
            return { items: [], subtotal: 0, item_count: 0, updated_at: new Date().toISOString() };
        }

        cart.updated_at = new Date().toISOString();
        await cartRepository.set(userId, cart);

        return this.buildResponse(cart);
    }

    async clearCart(userId: string): Promise<void> {
        await cartRepository.del(userId);
    }

    private buildResponse(cart: Cart): CartResponse {
        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

        return {
            items: cart.items,
            subtotal: Math.round(subtotal * 100) / 100,
            item_count: itemCount,
            updated_at: cart.updated_at,
        };
    }
}

export const cartService = new CartService();
