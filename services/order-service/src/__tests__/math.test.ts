import { computeShipping } from "../utils/shipping";

function computeLineTotal(unitPrice: number, quantity: number): number {
    return Math.round(unitPrice * quantity * 100) / 100;
}

function computeSubtotal(lineTotals: number[]): number {
    return Math.round(lineTotals.reduce((sum, lt) => sum + lt, 0) * 100) / 100;
}

function computeTotal(subtotal: number, shipping: number): number {
    return Math.round((subtotal + shipping) * 100) / 100;
}

describe("Financial Math", () => {
    describe("Line Total Calculation", () => {
        it("$49.99 x 3 = $149.97", () => {
            expect(computeLineTotal(49.99, 3)).toBe(149.97);
        });

        it("$9.99 x 10 = $99.90", () => {
            expect(computeLineTotal(9.99, 10)).toBe(99.90);
        });

        it("$1.00 x 1 = $1.00", () => {
            expect(computeLineTotal(1.00, 1)).toBe(1.00);
        });

        it("$0.01 x 100 = $1.00", () => {
            expect(computeLineTotal(0.01, 100)).toBe(1.00);
        });

        it("$1999.99 x 2 = $3999.98", () => {
            expect(computeLineTotal(1999.99, 2)).toBe(3999.98);
        });

        it("$19.97 x 3 = $59.91 (no float drift)", () => {
            expect(computeLineTotal(19.97, 3)).toBe(59.91);
        });

        it("$0.10 x 3 = $0.30 (classic float trap)", () => {
            expect(computeLineTotal(0.10, 3)).toBe(0.30);
        });
    });

    describe("Subtotal Calculation", () => {
        it("single item: 1 x $29.99 = $29.99", () => {
            expect(computeSubtotal([computeLineTotal(29.99, 1)])).toBe(29.99);
        });

        it("single item: 3 x $19.97 = $59.91", () => {
            expect(computeSubtotal([computeLineTotal(19.97, 3)])).toBe(59.91);
        });

        it("single item: 1 x $0.01 = $0.01", () => {
            expect(computeSubtotal([computeLineTotal(0.01, 1)])).toBe(0.01);
        });

        it("single item: 5 x $2499.99 = $12499.95", () => {
            expect(computeSubtotal([computeLineTotal(2499.99, 5)])).toBe(12499.95);
        });

        it("two different items: $49.99 x 2 + $24.99 x 1 = $124.97", () => {
            const lt1 = computeLineTotal(49.99, 2);
            const lt2 = computeLineTotal(24.99, 1);
            expect(computeSubtotal([lt1, lt2])).toBe(124.97);
        });

        it("multiple items with fractional prices", () => {
            const lt1 = computeLineTotal(19.97, 3);
            const lt2 = computeLineTotal(9.99, 2);
            const lt3 = computeLineTotal(0.01, 1);
            expect(computeSubtotal([lt1, lt2, lt3])).toBe(79.90);
        });
    });

    describe("Shipping Tiers", () => {
        it("$49.99 subtotal -> $9.99 shipping (just under mid-tier)", () => {
            expect(computeShipping(49.99)).toBe(9.99);
        });

        it("$50.00 subtotal -> $5.99 shipping (exact mid-tier)", () => {
            expect(computeShipping(50.00)).toBe(5.99);
        });

        it("$99.99 subtotal -> $5.99 shipping (just under free)", () => {
            expect(computeShipping(99.99)).toBe(5.99);
        });

        it("$100.00 subtotal -> $0.00 shipping (exact free tier)", () => {
            expect(computeShipping(100.00)).toBe(0);
        });
    });

    describe("Total Calculation (subtotal + shipping)", () => {
        it("$49.99 + $9.99 = $59.98", () => {
            expect(computeTotal(49.99, 9.99)).toBe(59.98);
        });

        it("$75.00 + $5.99 = $80.99", () => {
            expect(computeTotal(75.00, 5.99)).toBe(80.99);
        });

        it("$100.00 + $0.00 = $100.00", () => {
            expect(computeTotal(100.00, 0)).toBe(100.00);
        });

        it("$19.97 + $9.99 = $29.96", () => {
            expect(computeTotal(19.97, 9.99)).toBe(29.96);
        });

        it("fractional: subtotal $59.91 + $5.99 = $65.90", () => {
            const subtotal = computeSubtotal([computeLineTotal(19.97, 3)]);
            const shipping = computeShipping(subtotal);
            expect(computeTotal(subtotal, shipping)).toBe(65.90);
        });
    });

    describe("End-to-End Order Math", () => {
        it("full order: 2 items, mid-tier shipping", () => {
            const lt1 = computeLineTotal(24.99, 1);
            const lt2 = computeLineTotal(29.99, 1);
            const subtotal = computeSubtotal([lt1, lt2]);
            const shipping = computeShipping(subtotal);
            const total = computeTotal(subtotal, shipping);

            expect(lt1).toBe(24.99);
            expect(lt2).toBe(29.99);
            expect(subtotal).toBe(54.98);
            expect(shipping).toBe(5.99);
            expect(total).toBe(60.97);
        });

        it("full order: 3 items, free shipping", () => {
            const lt1 = computeLineTotal(49.99, 1);
            const lt2 = computeLineTotal(24.99, 2);
            const lt3 = computeLineTotal(9.99, 1);
            const subtotal = computeSubtotal([lt1, lt2, lt3]);
            const shipping = computeShipping(subtotal);
            const total = computeTotal(subtotal, shipping);

            expect(subtotal).toBe(109.96);
            expect(shipping).toBe(0);
            expect(total).toBe(109.96);
        });

        it("full order: single cheap item, standard shipping", () => {
            const lt = computeLineTotal(4.99, 1);
            const subtotal = computeSubtotal([lt]);
            const shipping = computeShipping(subtotal);
            const total = computeTotal(subtotal, shipping);

            expect(subtotal).toBe(4.99);
            expect(shipping).toBe(9.99);
            expect(total).toBe(14.98);
        });
    });
});
