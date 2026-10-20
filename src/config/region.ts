/**
 * Store region settings that client components need.
 *
 * These read `process.env.NEXT_PUBLIC_*` by literal name on purpose: Next.js
 * only inlines public env vars into the browser bundle when they are accessed
 * statically, so the dynamic lookup in `brand.ts` would silently fall back to
 * the defaults in "use client" code. Server code can use either.
 */

export const region = {
  /** ISO 4217 code. Must match the currency of your Medusa region. */
  currencyCode: (process.env.NEXT_PUBLIC_BRAND_CURRENCY || "USD").toUpperCase(),
  /** BCP 47 locale used for number and date formatting. */
  locale: process.env.NEXT_PUBLIC_BRAND_LOCALE || "en-US",
  /** ISO 3166-1 alpha-2 code of the country you ship to. */
  countryCode: (process.env.NEXT_PUBLIC_BRAND_COUNTRY || "US").toUpperCase(),
  countryName: process.env.NEXT_PUBLIC_BRAND_COUNTRY_NAME || "United States",
  /** Same-day dispatch cutoff shown in copy, e.g. "2pm ET" or "14:00 GMT". */
  dispatchCutoff: process.env.NEXT_PUBLIC_DISPATCH_CUTOFF || "2pm",
  /** Optional map point to rank address suggestions near your store. */
  addressBias: parseBias(
    process.env.NEXT_PUBLIC_ADDRESS_BIAS_LAT,
    process.env.NEXT_PUBLIC_ADDRESS_BIAS_LON,
  ),
} as const;

function parseBias(lat?: string, lon?: string) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!lat || !lon || !Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return { lat: la, lon: lo };
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Format an amount in major units (e.g. 12.5) as a localized price. */
export function formatMoney(amount: number, currencyCode: string = region.currencyCode): string {
  const code = currencyCode.toUpperCase();
  let formatter = formatters.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat(region.locale, { style: "currency", currency: code });
    formatters.set(code, formatter);
  }
  return formatter.format(amount);
}
