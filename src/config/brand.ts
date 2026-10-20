/**
 * Single source of truth for everything that varies between shops on the
 * platform. Every brand-specific string, URL, contact, color, and policy
 * lives here. Driven by env vars at build/startup time so a new shop can
 * be spun up by swapping a single .env.local file.
 *
 * Env vars are intentionally split:
 *   - NEXT_PUBLIC_BRAND_*   = exposed to the client bundle (name, colours,
 *                             logo, hours, etc.)
 *   - SHOP_*                = server-only (full address, internal contacts,
 *                             policy details that belong in emails / SEO
 *                             but don't need to be in the JS bundle)
 *
 * Keep the defaults pointed at the generic "Storefront" reference build so
 * an un-templated dev environment behaves identically to today.
 */

const env = (key: string, fallback = ""): string => {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
};

const numEnv = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export type BrandFulfillment = "ship" | "click-and-collect";

export const brand = {
  // ── Identity ──────────────────────────────────────────────────────────
  name: env("NEXT_PUBLIC_BRAND_NAME", "Storefront"),
  shortName: env("NEXT_PUBLIC_BRAND_SHORT_NAME", "Storefront"),
  tagline: env(
    "NEXT_PUBLIC_BRAND_TAGLINE",
    "Everyday essentials, thoughtfully made.",
  ),
  description: env(
    "NEXT_PUBLIC_BRAND_DESCRIPTION",
    "A modern e-commerce starter built with Next.js and Medusa.",
  ),
  shortDescription: env(
    "NEXT_PUBLIC_BRAND_SHORT_DESCRIPTION",
    "A modern e-commerce starter built with Next.js and Medusa.",
  ),
  category: env("NEXT_PUBLIC_BRAND_CATEGORY", "General Retail"),

  // ── URLs ──────────────────────────────────────────────────────────────
  siteUrl: env("SITE_URL", env("NEXT_PUBLIC_SITE_URL", "https://example.com")),
  adminUrl: env("ADMIN_URL", env("NEXT_PUBLIC_ADMIN_URL", "https://admin.example.com")),

  // ── Contact ───────────────────────────────────────────────────────────
  supportEmail: env("NEXT_PUBLIC_SUPPORT_EMAIL", "help@example.com"),
  paymentEmail: env("PAYMENT_EMAIL", "help@example.com"),
  phone: env("NEXT_PUBLIC_BRAND_PHONE", ""),

  // ── Hours (display copy) ──────────────────────────────────────────────
  hoursDisplay: {
    weekday: env("NEXT_PUBLIC_HOURS_WEEKDAY", "Mon–Fri 10am – 8pm"),
    saturday: env("NEXT_PUBLIC_HOURS_SATURDAY", "Sat 12pm – 6pm"),
    sunday: env("NEXT_PUBLIC_HOURS_SUNDAY", "Sun · Closed"),
  },

  // ── LocalBusiness schema details ──────────────────────────────────────
  city: env("NEXT_PUBLIC_BRAND_CITY", "New York"),
  province: env("NEXT_PUBLIC_BRAND_PROVINCE", "NY"),
  country: env("NEXT_PUBLIC_BRAND_COUNTRY", "US"),
  countryName: env("NEXT_PUBLIC_BRAND_COUNTRY_NAME", "United States"),
  // Free-form address line — only set if shop wants exact address surfaced
  streetAddress: env("NEXT_PUBLIC_BRAND_STREET", ""),
  postalCode: env("NEXT_PUBLIC_BRAND_POSTAL", ""),

  // "ship" = full delivery (default reference behaviour)
  // "click-and-collect" = order online, pick up in store
  fulfillment: env("NEXT_PUBLIC_BRAND_FULFILLMENT", "ship") as BrandFulfillment,

  // ── Assets ────────────────────────────────────────────────────────────
  logoSvg: env("NEXT_PUBLIC_BRAND_LOGO", "/brand/logo-mark.svg"),
  ogImage: env("NEXT_PUBLIC_BRAND_OG_IMAGE", ""),

  // ── Theme — written into CSS custom properties at <html> level ────────
  // Defaults are the generic Storefront palette. Override per shop with env.
  colors: {
    paper: env("NEXT_PUBLIC_BRAND_COLOR_PAPER", "#fbf7f0"),
    panel: env("NEXT_PUBLIC_BRAND_COLOR_PANEL", "#efe5d6"),
    forest: env("NEXT_PUBLIC_BRAND_COLOR_FOREST", "#21352a"),
    forestDeep: env("NEXT_PUBLIC_BRAND_COLOR_FOREST_DEEP", "#142119"),
    clay: env("NEXT_PUBLIC_BRAND_COLOR_CLAY", "#a85d3b"),
    olive: env("NEXT_PUBLIC_BRAND_COLOR_OLIVE", "#667553"),
    muted: env("NEXT_PUBLIC_BRAND_COLOR_MUTED", "#6f685d"),
    line: env("NEXT_PUBLIC_BRAND_COLOR_LINE", "#e6dcc9"),
  },

  // ── Social (rendered into Organization JSON-LD if present) ────────────
  socials: {
    instagram: env("NEXT_PUBLIC_BRAND_INSTAGRAM", ""),
    twitter: env("NEXT_PUBLIC_BRAND_TWITTER", ""),
    telegram: env("NEXT_PUBLIC_BRAND_TELEGRAM", ""),
    facebook: env("NEXT_PUBLIC_BRAND_FACEBOOK", ""),
  },

  // ── Commerce defaults ─────────────────────────────────────────────────
  currencyCode: env("NEXT_PUBLIC_BRAND_CURRENCY", "USD"),
  locale: env("NEXT_PUBLIC_BRAND_LOCALE", "en-US"),

  // ── Policy / fulfillment copy used in emails + LocalBusiness ──────────
  shippingPolicy: env(
    "NEXT_PUBLIC_BRAND_SHIPPING_POLICY",
    "Most orders arrive in 2–4 business days.",
  ),
  packagingPolicy: env(
    "NEXT_PUBLIC_BRAND_PACKAGING_POLICY",
    "Ships in recyclable packaging.",
  ),
} as const;

export type Brand = typeof brand;

/** Brand colours rendered as a CSS custom-property block string for <style>. */
export function brandCssVars(): string {
  return `:root{
  --color-paper:${brand.colors.paper};
  --color-panel:${brand.colors.panel};
  --color-forest:${brand.colors.forest};
  --color-forest-deep:${brand.colors.forestDeep};
  --color-clay:${brand.colors.clay};
  --color-olive:${brand.colors.olive};
  --color-muted:${brand.colors.muted};
  --color-line:${brand.colors.line};
}`;
}
