import { readdir, readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";

const STORAGE_DIR = process.env.ORDER_STORAGE_DIR || "/srv/shared/storefront/orders";
const MAX_AGE_HOURS = 72;
const MAX_ENTRIES = 12;

type OrderRecord = {
  storefrontOrderId?: string;
  createdAt?: string;
  customerName?: string;
  customerAddress?: string;
  shippingAddress?: { city?: string } | null;
  products?: Array<{ name?: string; category?: string }>;
};

function firstName(full: string) {
  return (full.trim().split(/\s+/)[0] || "Someone").replace(/[^\p{L}\p{N}'-]/gu, "");
}

function cityFromAddress(address?: string) {
  if (!address) return null;
  const lines = address.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  // Address line, city, "PROV postal", country — pick the city-ish one
  if (lines.length >= 2) return lines[1];
  return null;
}

export async function GET() {
  try {
    const files = await readdir(STORAGE_DIR);
    const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
    const entries: Array<{ name: string; city: string | null; product: string; createdAt: string }> = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const path = `${STORAGE_DIR}/${file}`;
      try {
        const stats = await stat(path);
        if (stats.mtimeMs < cutoff) continue;
        const raw = await readFile(path, "utf8");
        const record = JSON.parse(raw) as OrderRecord;
        if (!record.createdAt || !record.customerName) continue;
        const created = new Date(record.createdAt).getTime();
        if (!Number.isFinite(created) || created < cutoff) continue;
        const product = record.products?.[0]?.name ?? "an order";
        entries.push({
          name: firstName(record.customerName),
          city: record.shippingAddress?.city || cityFromAddress(record.customerAddress),
          product,
          createdAt: record.createdAt,
        });
      } catch {
        // skip unreadable file
      }
    }

    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ entries: entries.slice(0, MAX_ENTRIES) }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
