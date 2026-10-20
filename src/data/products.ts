import { MEDUSA_REGION_ID, medusaStoreFetch } from "@/lib/medusa";

export type Product = {
  id: string;
  variantId: string;
  slug: string;
  name: string;
  category: string;
  /** Live price (in major currency units, USD). For on-sale items, this is the sale price. */
  price: number;
  /** Original/MSRP price when on sale; null otherwise. Used for strike-through display. */
  compareAtPrice: number | null;
  /** Computed: percent off (rounded). Set when compareAtPrice > price. */
  salePercent: number | null;
  stock: number;
  description: string;
  badge: string;
  /** Optional: "Set of 6", "Pack of 3" — shown as a stat chip on the card. */
  packCount: string | null;
};

type MedusaProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  variants?: Array<{
    id: string;
    title?: string | null;
    calculated_price?: {
      calculated_amount?: number | null;
    } | null;
  }>;
};

type MedusaProductsResponse = {
  products: MedusaProduct[];
};

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "description",
  "+metadata",
  "variants.id",
  "variants.title",
  "*variants.calculated_price",
].join(",");

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function mapProduct(product: MedusaProduct): Product {
  const metadata = product.metadata ?? {};
  const variant = product.variants?.[0];

  // Medusa 2 stores prices in major units (15 = $15.00), so no cents conversion.
  const livePrice = (variant?.calculated_price?.calculated_amount ?? 0) as number;

  // Sale support: shop owner sets either compare_at_price (dollars) or
  // sale_percent (number 1-99) in the product's metadata. Either field
  // produces the same UI: strikethrough MSRP + sale price + Save X%.
  const compareAtRaw = asNumber(metadata.compare_at_price ?? metadata.compareAtPrice, 0);
  const salePercentRaw = asNumber(metadata.sale_percent ?? metadata.salePercent, 0);

  let compareAtPrice: number | null = null;
  let salePercent: number | null = null;

  if (compareAtRaw > livePrice) {
    compareAtPrice = compareAtRaw;
    salePercent = Math.round(((compareAtRaw - livePrice) / compareAtRaw) * 100);
  } else if (salePercentRaw >= 1 && salePercentRaw < 100) {
    // Derive an MSRP from a percent-off so the strikethrough has a number.
    compareAtPrice = Math.round((livePrice / (1 - salePercentRaw / 100)) * 100) / 100;
    salePercent = Math.round(salePercentRaw);
  }

  return {
    id: product.id,
    variantId: variant?.id ?? product.id,
    slug: product.handle,
    name: product.title,
    category: asString(metadata.category, "Catalog"),
    price: livePrice,
    compareAtPrice,
    salePercent,
    stock: asNumber(metadata.stock, 0),
    description: asString(product.description, "Product details available on request."),
    badge: asString(metadata.badge, "Curated selection"),
    packCount: asNullableString(metadata.pack_count ?? metadata.packCount),
  };
}

export async function getProducts() {
  // Returns an empty list when Medusa isn't reachable or the publishable key
  // is missing. Lets a fresh per-shop deploy build successfully *before* the
  // shop owner has signed into Medusa admin and minted their PK; the live
  // page will repopulate as soon as products + key are configured.
  try {
    const query = new URLSearchParams({
      limit: "100",
      region_id: MEDUSA_REGION_ID,
      fields: PRODUCT_FIELDS,
    });
    const response = await medusaStoreFetch<MedusaProductsResponse>(`/store/products?${query.toString()}`);
    return response.products.map(mapProduct);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[products] Medusa fetch failed, returning empty list:", error);
    }
    return [];
  }
}

export async function getCategories() {
  const products = await getProducts();
  return ["All", ...new Set(products.map((product) => product.category))];
}

export async function getFeaturedProducts() {
  const products = await getProducts();
  return products.slice(0, 4);
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}
