import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sendOrderEmails } from "@/lib/mailer";
import { createMedusaDraftOrder, type ShippingAddressParts } from "@/lib/medusa-admin";
import { getCurrentCustomer } from "@/lib/medusa-customer";
import { computeShippingFee } from "@/lib/shipping";

type PaymentMethod = "bank_transfer" | "placeholder" | "review";

function normalizeOrderId(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^ord_[a-z0-9]{8}$/i.test(raw) ? raw.toLowerCase() : null;
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === "bank_transfer" || value === "placeholder" ? value : "review";
}

function generatePaymentReference() {
  const n = randomBytes(4).readUInt32BE(0) % 100_000_000;
  return n.toString().padStart(8, "0");
}

function normalizeShippingAddress(value: unknown): ShippingAddressParts | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const field = (key: string, max = 200) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "";
  const address_1 = field("address_1");
  if (!address_1) return null;
  const countryCode = field("country_code", 2);
  return {
    address_1,
    address_2: field("address_2") || undefined,
    city: field("city", 120),
    province: field("province", 120) || undefined,
    postal_code: field("postal_code", 20) || undefined,
    country_code: /^[a-z]{2}$/i.test(countryCode) ? countryCode.toLowerCase() : undefined,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const requiredFields = [
    "customerName",
    "customerEmail",
    "customerPhone",
    "customerAddress",
    "customerMessage",
  ];

  for (const field of requiredFields) {
    if (!String(body[field] || "").trim()) {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
    }
  }

  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: "At least one product is required." }, { status: 400 });
  }

  const paymentMethod = normalizePaymentMethod(body.paymentMethod);
  const paymentReference = paymentMethod === "bank_transfer" ? generatePaymentReference() : null;
  const storefrontOrderId = normalizeOrderId(body.storefrontOrderId) ?? `ord_${randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  const storageDir = process.env.ORDER_STORAGE_DIR || "/srv/shared/storefront/orders";
  const customer = await getCurrentCustomer();
  const subtotal = Number(body.subtotal ?? body.orderTotal ?? 0) || 0;
  const shippingFee = computeShippingFee(subtotal);
  const orderTotal = subtotal + shippingFee;
  const record = {
    storefrontOrderId,
    createdAt,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    customerPhone: body.customerPhone,
    customerAddress: body.customerAddress,
    shippingAddress: normalizeShippingAddress(body.shippingAddress),
    customerMessage: body.customerMessage,
    subtotal,
    shippingFee,
    freeShipping: shippingFee === 0,
    orderTotal,
    products: body.products,
    paymentMethod,
    paymentReference,
    customerId: customer?.id ?? null,
  };

  await mkdir(storageDir, { recursive: true });
  await writeFile(`${storageDir}/${storefrontOrderId}.json`, JSON.stringify(record, null, 2));

  sendOrderEmails(record)
    .then((result) => {
      if (!result.sent) {
        console.warn(`[orders] email skipped for ${storefrontOrderId}: ${result.reason}`);
      }
    })
    .catch((error) => {
      console.error(`[orders] email error for ${storefrontOrderId}`, error);
    });

  const draftOrderResult = await createMedusaDraftOrder(record).catch((error) => {
    console.error(`[orders] draft-order error for ${storefrontOrderId}`, error);
    return { created: false as const, reason: "draft-order exception" };
  });

  if (!draftOrderResult.created) {
    console.warn(`[orders] draft-order skipped for ${storefrontOrderId}: ${draftOrderResult.reason}`);
  } else {
    console.log(
      `[orders] draft-order ${draftOrderResult.draftOrderId} (display #${draftOrderResult.displayId}) for ${storefrontOrderId}`,
    );
  }

  return NextResponse.json({
    ok: true,
    storefrontOrderId,
    createdAt,
    paymentMethod,
    paymentReference,
    payToEmail: paymentMethod === "bank_transfer" ? process.env.PAYMENT_EMAIL ?? null : null,
    shippingFee,
    orderTotal,
    medusaDraftOrderId: draftOrderResult.created ? draftOrderResult.draftOrderId : null,
  });
}
