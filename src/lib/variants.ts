/**
 * Product options and variants: ordering, matching and availability.
 *
 * Pure functions with no framework imports, so they can be unit-tested with
 * `node --test` (see variants.test.ts).
 */

export type ProductOption = {
  id: string;
  title: string;
  /** Values in display order. */
  values: string[];
};

export type ProductVariant = {
  id: string;
  title: string;
  price: number;
  /** Option id → value. */
  options: Record<string, string>;
  /** Units in stock, or null when the variant isn't inventory-tracked. */
  inventory: number | null;
  available: boolean;
};

/** Option id → selected value. */
export type Selection = Record<string, string>;

const SIZE_SCALE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];

/**
 * Display order for an option's values. An explicit order (from product
 * metadata) wins; otherwise clothing sizes and numbers sort naturally and
 * anything else sorts alphabetically.
 */
export function sortOptionValues(values: string[], explicitOrder?: string[]): string[] {
  const unique = [...new Set(values)];
  if (explicitOrder?.length) {
    const rank = (value: string) => {
      const index = explicitOrder.indexOf(value);
      return index === -1 ? explicitOrder.length : index;
    };
    return unique.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  const upper = unique.map((value) => value.toUpperCase());
  if (upper.every((value) => SIZE_SCALE.includes(value))) {
    return unique.sort(
      (a, b) => SIZE_SCALE.indexOf(a.toUpperCase()) - SIZE_SCALE.indexOf(b.toUpperCase()),
    );
  }
  if (unique.every((value) => value.trim() !== "" && Number.isFinite(Number(value)))) {
    return unique.sort((a, b) => Number(a) - Number(b));
  }
  return unique.sort((a, b) => a.localeCompare(b));
}

/** Options in display order: those named in `explicitOrder` first, in that order. */
export function sortOptions(options: ProductOption[], explicitOrder?: string[]): ProductOption[] {
  if (!explicitOrder?.length) return options;
  const rank = (title: string) => {
    const index = explicitOrder.indexOf(title);
    return index === -1 ? explicitOrder.length : index;
  };
  return [...options].sort((a, b) => rank(a.title) - rank(b.title));
}

/** Variants sorted to follow the options' display order (S/Black, S/Natural, M/Black…). */
export function sortVariants(variants: ProductVariant[], options: ProductOption[]): ProductVariant[] {
  const key = (variant: ProductVariant) =>
    options.map((option) => {
      const index = option.values.indexOf(variant.options[option.id]);
      return index === -1 ? option.values.length : index;
    });
  return [...variants].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i += 1) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
}

/** The variant whose options exactly match the selection, if any. */
export function findVariant(variants: ProductVariant[], selection: Selection): ProductVariant | undefined {
  const entries = Object.entries(selection);
  if (entries.length === 0) return undefined;
  return variants.find(
    (variant) =>
      Object.keys(variant.options).length === entries.length &&
      entries.every(([optionId, value]) => variant.options[optionId] === value),
  );
}

/** First available variant in display order, or the first variant when none are available. */
export function defaultVariant(variants: ProductVariant[]): ProductVariant | undefined {
  return variants.find((variant) => variant.available) ?? variants[0];
}

export function selectionOf(variant: ProductVariant | undefined): Selection {
  return variant ? { ...variant.options } : {};
}

export type ValueState = "available" | "unavailable-with-selection" | "sold-out";

/**
 * How a value should look in the picker given the current selection:
 * - `available`: picking it keeps the other choices and lands on an in-stock variant
 * - `unavailable-with-selection`: in stock, but only with different other choices
 * - `sold-out`: no in-stock variant has this value at all
 */
export function valueState(
  variants: ProductVariant[],
  selection: Selection,
  optionId: string,
  value: string,
): ValueState {
  const withValue = variants.filter((variant) => variant.options[optionId] === value && variant.available);
  if (withValue.length === 0) return "sold-out";
  const exact = findVariant(variants, { ...selection, [optionId]: value });
  return exact?.available ? "available" : "unavailable-with-selection";
}

/**
 * Selection after the shopper picks `value` for `optionId`. Keeps their other
 * choices when that combination is in stock; otherwise moves to the in-stock
 * variant with this value that keeps the most of their other choices.
 */
export function selectValue(
  variants: ProductVariant[],
  selection: Selection,
  optionId: string,
  value: string,
): Selection {
  const next = { ...selection, [optionId]: value };
  const exact = findVariant(variants, next);
  if (exact?.available) return next;

  const candidates = variants.filter((variant) => variant.options[optionId] === value && variant.available);
  if (candidates.length === 0) return next;

  const score = (variant: ProductVariant) =>
    Object.entries(selection).filter(([id, v]) => id !== optionId && variant.options[id] === v).length;
  const best = candidates.reduce((top, variant) => (score(variant) > score(top) ? variant : top));
  return selectionOf(best);
}

/** Lowest and highest price across available variants (all variants when none are available). */
export function priceRange(variants: ProductVariant[]): { min: number; max: number } {
  const pool = variants.some((variant) => variant.available)
    ? variants.filter((variant) => variant.available)
    : variants;
  if (pool.length === 0) return { min: 0, max: 0 };
  const prices = pool.map((variant) => variant.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** "M / Black" for display; null when the product has a single default variant. */
export function variantLabel(variant: ProductVariant, options: ProductOption[]): string | null {
  if (options.length === 0) return null;
  return options.map((option) => variant.options[option.id]).filter(Boolean).join(" / ") || null;
}
