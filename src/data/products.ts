import { MEDUSA_REGION_ID, medusaStoreFetch } from "@/lib/medusa";
import {
  defaultVariant,
  priceRange,
  sortOptionValues,
  sortOptions,
  sortVariants,
  type ProductOption,
  type ProductVariant,
} from "@/lib/variants";

export type { ProductOption, ProductVariant } from "@/lib/variants";

export type Product = {
  id: string;
  /** Default variant: the first in-stock one in display order. */
  variantId: string;
  slug: string;
  name: string;
  category: string;
  /** Lowest live price across in-stock variants (major units). For on-sale items, the sale price. */
  price: number;
  /** Highest live price across in-stock variants; equals `price` when all variants cost the same. */
  priceMax: number;
  /** Original/MSRP price when on sale; null otherwise. Used for strike-through display. */
  compareAtPrice: number | null;
  /** Computed: percent off (rounded). Set when compareAtPrice > price. */
  salePercent: number | null;
  /** Units in stock across variants (falls back to metadata.stock when inventory isn't tracked). */
  stock: number;
  description: string;
  badge: string;
  /** Optional: "Set of 6", "Pack of 3" — shown as a stat chip on the card. */
  packCount: string | null;
  /** Options in display order; empty for single-variant products. */
  options: ProductOption[];
  /** Variants in display order. */
  variants: ProductVariant[];
};

type MedusaProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  options?: Array<{
    id: string;
    title: string;
    values?: Array<{ value: string }> | null;
  }> | null;
  variants?: Array<{
    id: string;
    title?: string | null;
    inventory_quantity?: number | null;
    manage_inventory?: boolean | null;
    allow_backorder?: boolean | null;
    options?: Array<{ option_id?: string | null; value: string }> | null;
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
  "*options",
  "*options.values",
  "variants.id",
  "variants.title",
  "variants.inventory_quantity",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "*variants.options",
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

/**
 * `metadata.option_order` (e.g. `{ "Size": ["S", "M", "L"], "Color": ["Black"] }`)
 * sets the display order of options and their values. Medusa doesn't keep either.
 */
function readOptionOrder(metadata: Record<string, unknown>): Record<string, string[]> {
  const raw = metadata.option_order;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const order: Record<string, string[]> = {};
  for (const [title, values] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(values)) order[title] = values.filter((v): v is string => typeof v === "string");
  }
  return order;
}

function mapOptions(product: MedusaProduct, optionOrder: Record<string, string[]>): ProductOption[] {
  const options = (product.options ?? []).map((option) => ({
    id: option.id,
    title: option.title,
    values: sortOptionValues(
      (option.values ?? []).map((value) => value.value),
      optionOrder[option.title],
    ),
  }));
  // A single "Default" option is how Medusa models a product without options.
  const isDefaultOnly =
    options.length === 1 && (product.variants?.length ?? 0) <= 1 && options[0].values.length <= 1;
  return isDefaultOnly ? [] : sortOptions(options, Object.keys(optionOrder));
}

function mapVariants(product: MedusaProduct, options: ProductOption[]): ProductVariant[] {
  const optionIds = new Set(options.map((option) => option.id));
  const variants = (product.variants ?? []).map((variant) => {
    const tracked = Boolean(variant.manage_inventory);
    const inventory = tracked ? Math.max(0, variant.inventory_quantity ?? 0) : null;
    const optionValues: Record<string, string> = {};
    for (const value of variant.options ?? []) {
      if (value.option_id && optionIds.has(value.option_id)) optionValues[value.option_id] = value.value;
    }
    return {
      id: variant.id,
      title: variant.title ?? product.title,
      // Medusa 2 stores prices in major units (15 = $15.00), so no cents conversion.
      price: (variant.calculated_price?.calculated_amount ?? 0) as number,
      options: optionValues,
      inventory,
      available: !tracked || (inventory ?? 0) > 0 || Boolean(variant.allow_backorder),
    };
  });
  return sortVariants(variants, options);
}

function mapProduct(product: MedusaProduct): Product {
  const metadata = product.metadata ?? {};
  const options = mapOptions(product, readOptionOrder(metadata));
  const variants = mapVariants(product, options);
  const fallback = defaultVariant(variants);
  const { min: livePrice, max: livePriceMax } = priceRange(variants);

  const tracked = variants.filter((variant) => variant.inventory !== null);
  const stock = tracked.length
    ? tracked.reduce((sum, variant) => sum + (variant.inventory ?? 0), 0)
    : asNumber(metadata.stock, 0);

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
    variantId: fallback?.id ?? product.id,
    slug: product.handle,
    name: product.title,
    category: asString(metadata.category, "Catalog"),
    price: livePrice,
    priceMax: livePriceMax,
    compareAtPrice,
    salePercent,
    stock,
    description: asString(product.description, "Product details available on request."),
    badge: asString(metadata.badge, "Curated selection"),
    packCount: asNullableString(metadata.pack_count ?? metadata.packCount),
    options,
    variants,
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
