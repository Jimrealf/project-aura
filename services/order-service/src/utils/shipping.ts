export function computeShipping(subtotal: number): number {
    if (subtotal >= 100) return 0;
    if (subtotal >= 50) return 5.99;
    return 9.99;
}
