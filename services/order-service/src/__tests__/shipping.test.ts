import { computeShipping } from "../utils/shipping";

describe("Shipping Calculation", () => {
    it("returns $9.99 for minimum order ($0.01)", () => {
        expect(computeShipping(0.01)).toBe(9.99);
    });

    it("returns $9.99 for subtotal just under $50 ($49.99)", () => {
        expect(computeShipping(49.99)).toBe(9.99);
    });

    it("returns $5.99 for exact mid-tier boundary ($50.00)", () => {
        expect(computeShipping(50.00)).toBe(5.99);
    });

    it("returns $5.99 for mid-tier subtotal ($75.00)", () => {
        expect(computeShipping(75.00)).toBe(5.99);
    });

    it("returns $5.99 for subtotal just under free shipping ($99.99)", () => {
        expect(computeShipping(99.99)).toBe(5.99);
    });

    it("returns $0.00 for exact free shipping boundary ($100.00)", () => {
        expect(computeShipping(100.00)).toBe(0);
    });

    it("returns $0.00 for subtotal well above free shipping ($500.00)", () => {
        expect(computeShipping(500.00)).toBe(0);
    });

    it("returns $9.99 for zero subtotal edge case", () => {
        expect(computeShipping(0)).toBe(9.99);
    });
});
