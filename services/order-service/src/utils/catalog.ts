import axios from "axios";
import { CatalogProduct } from "../types/order.types";

const CATALOG_URL = process.env.CATALOG_SERVICE_URL ?? "http://localhost:3002";

export async function fetchProduct(slug: string): Promise<CatalogProduct | null> {
    try {
        const response = await axios.get(`${CATALOG_URL}/api/products/${slug}`);
        if (response.data.success) {
            return response.data.data as CatalogProduct;
        }
        return null;
    } catch {
        return null;
    }
}
