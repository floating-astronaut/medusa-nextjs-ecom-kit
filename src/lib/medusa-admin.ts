import { brand } from "@/config/brand";

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL ?? "http://127.0.0.1:9000";
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
const REGION_ID = process.env.MEDUSA_REGION_ID;
const SALES_CHANNEL_ID = process.env.MEDUSA_SALES_CHANNEL_ID;

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export function isAdminConfigured() {
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD && REGION_ID);
}

async function getAdminToken(): Promise<string | null> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;

  const response = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) return null;
  cachedToken = { token: payload.token, expiresAt: now + 1000 * 60 * 50 };
  return payload.token;
}

type OrderProduct = {
  id?: string;
  variantId?: string;
  variant_id?: string;
  name: string;
  category?: string;
  quantity: number;
  price: number;
  packageLabel?: string;
};

type DraftOrderInput = {
  storefrontOrderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  shippingAddress?: ShippingAddressParts | null;
  customerMessage: string;
  products: OrderProduct[];
  paymentMethod?: "bank_transfer" | "placeholder" | "review" | null;
  paymentReference?: string | null;
  customerId?: string | null;
  subtotal?: number;
  shippingFee?: number;
  freeShipping?: boolean;
};

function splitName(full: string) {
  const trimmed = full.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || "Customer", last: "-" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export type ShippingAddressParts = {
  address_1: string;
  address_2?: string;
  city: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
};

function structuredAddress(parts: ShippingAddressParts, phone: string) {
  return {
    address_1: parts.address_1,
    ...(parts.address_2 ? { address_2: parts.address_2 } : {}),
    city: parts.city || "-",
    ...(parts.province ? { province: parts.province } : {}),
    ...(parts.postal_code ? { postal_code: parts.postal_code } : {}),
    country_code: (parts.country_code || brand.country).toLowerCase(),
    phone,
  };
}

/**
 * Fallback for orders that only carry the free-text address. Expects the
 * shape checkout composes: street, [unit], "city, region, postcode", [country].
 */
function parseAddress(raw: string, phone: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const [address_1 = raw.trim() || "Unknown", ...rest] = lines;
  const localityIndex = rest.findIndex((line) => line.includes(","));
  const locality = localityIndex >= 0 ? rest[localityIndex].split(",").map((p) => p.trim()) : [];
  const address_2 = localityIndex > 0 ? rest.slice(0, localityIndex).join(", ") : undefined;
  const [city, province, postal_code] = locality;
  return structuredAddress(
    { address_1, address_2, city: city || rest[0] || "-", province, postal_code },
    phone,
  );
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAdminToken();
  if (!token) throw new Error("admin auth failed");
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${MEDUSA_BACKEND_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`admin ${response.status}: ${errBody.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

type DraftSummary = {
  id: string;
  display_id: number;
  status: string | null;
  email?: string;
  metadata?: Record<string, unknown> | null;
  customer_id?: string | null;
};

export async function findDraftByStorefrontOrderId(storefrontOrderId: string): Promise<DraftSummary | null> {
  // /admin/draft-orders has no built-in metadata filter, so we paginate the
  // recent ones and match in-process. With our volume this is fine.
  let offset = 0;
  const page = 100;
  while (true) {
    type Resp = { draft_orders: DraftSummary[] };
    const data = await adminFetch<Resp>(
      `/admin/draft-orders?limit=${page}&offset=${offset}&order=-created_at&fields=id,display_id,status,email,metadata,customer_id`,
    );
    const match = data.draft_orders.find((d) => (d.metadata as { storefront_order_id?: string } | null)?.storefront_order_id === storefrontOrderId);
    if (match) return match;
    if (data.draft_orders.length < page) return null;
    offset += page;
    if (offset > 1000) return null;
  }
}

export async function findOrderByStorefrontOrderId(storefrontOrderId: string): Promise<DraftSummary | null> {
  // After conversion the draft becomes a regular order; check that path too.
  let offset = 0;
  const page = 100;
  while (true) {
    type Resp = { orders: DraftSummary[] };
    const data = await adminFetch<Resp>(
      `/admin/orders?limit=${page}&offset=${offset}&order=-created_at&fields=id,display_id,status,email,metadata`,
    );
    const match = data.orders.find((o) => (o.metadata as { storefront_order_id?: string } | null)?.storefront_order_id === storefrontOrderId);
    if (match) return match;
    if (data.orders.length < page) return null;
    offset += page;
    if (offset > 1000) return null;
  }
}

export async function convertDraftToOrder(draftId: string) {
  return adminFetch(`/admin/draft-orders/${draftId}/convert-to-order`, { method: "POST", body: "{}" });
}

type OrderPaymentSnapshot = {
  id: string;
  total: number;
  payment_status: string;
  payment_collections?: Array<{ id: string }>;
};

async function getOrderPaymentSnapshot(orderId: string, attempts = 1): Promise<OrderPaymentSnapshot | null> {
  type Resp = { order: OrderPaymentSnapshot };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const data = await adminFetch<Resp>(
        `/admin/orders/${orderId}?fields=id,total,payment_status,payment_collections.id`,
      );
      if (data.order) {
        return data.order;
      }
    } catch {
      // order conversion can be briefly eventual; retry below
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return null;
}

async function createOrderPaymentCollection(orderId: string, amount: number) {
  type Resp = { payment_collection?: { id: string } };
  const data = await adminFetch<Resp>(`/admin/payment-collections`, {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, amount }),
  });
  return data.payment_collection?.id ?? null;
}

async function markPaymentCollectionPaid(paymentCollectionId: string, orderId: string) {
  await adminFetch(`/admin/payment-collections/${paymentCollectionId}/mark-as-paid`, {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

export async function ensureOrderMarkedPaid(orderId: string) {
  const order = await getOrderPaymentSnapshot(orderId, 6);
  if (!order) return { updated: false, reason: "order not found" } as const;

  if (["captured", "partially_captured", "authorized"].includes(order.payment_status)) {
    return { updated: false, reason: `already ${order.payment_status}` } as const;
  }

  let paymentCollectionId = order.payment_collections?.[0]?.id ?? null;
  if (!paymentCollectionId) {
    paymentCollectionId = await createOrderPaymentCollection(order.id, Number(order.total) || 0);
    if (!paymentCollectionId) {
      return { updated: false, reason: "payment collection not created" } as const;
    }
  }

  await markPaymentCollectionPaid(paymentCollectionId, order.id);
  const refreshed = await getOrderPaymentSnapshot(order.id, 3);
  return {
    updated: true,
    paymentCollectionId,
    paymentStatus: refreshed?.payment_status ?? null,
  } as const;
}

export async function tagOrderMetadata(orderId: string, metadata: Record<string, unknown>) {
  // Both /admin/draft-orders/:id and /admin/orders/:id support metadata updates.
  // We try draft first, fall through to order. This is best-effort and never throws.
  try {
    await adminFetch(`/admin/draft-orders/${orderId}`, { method: "POST", body: JSON.stringify({ metadata }) });
    return true;
  } catch {}
  try {
    await adminFetch(`/admin/orders/${orderId}`, { method: "POST", body: JSON.stringify({ metadata }) });
    return true;
  } catch {}
  return false;
}

export async function createMedusaDraftOrder(input: DraftOrderInput) {
  if (!isAdminConfigured()) return { created: false, reason: "admin creds or region not configured" } as const;
  const token = await getAdminToken();
  if (!token) return { created: false, reason: "admin auth failed" } as const;

  const { first, last } = splitName(input.customerName);
  const address = input.shippingAddress?.address_1
    ? structuredAddress(input.shippingAddress, input.customerPhone)
    : parseAddress(input.customerAddress, input.customerPhone);

  const items: Array<{
    variant_id?: string;
    title?: string;
    quantity: number;
    unit_price: number;
    metadata: Record<string, unknown>;
  }> = input.products
    .map((p) => {
      const variant = p.variantId ?? p.variant_id;
      if (!variant) return null;
      return {
        variant_id: variant,
        quantity: Math.max(1, Number(p.quantity) || 1),
        unit_price: Number(p.price) || 0,
        metadata: {
          ...(p.packageLabel ? { package_label: p.packageLabel } : {}),
          ...(p.category ? { category: p.category } : {}),
          storefront_order_id: input.storefrontOrderId,
        },
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  const shippingFee = Number(input.shippingFee) || 0;
  if (shippingFee > 0) {
    items.push({
      title: input.freeShipping ? 'Free shipping' : 'Shipping',
      quantity: 1,
      unit_price: shippingFee,
      metadata: {
        storefront_order_id: input.storefrontOrderId,
        line_type: 'shipping',
      } as Record<string, unknown>,
    });
  }

  if (items.length === 0) {
    return { created: false, reason: "no items with variant_id" } as const;
  }

  const body = {
    email: input.customerEmail,
    region_id: REGION_ID,
    ...(SALES_CHANNEL_ID ? { sales_channel_id: SALES_CHANNEL_ID } : {}),
    currency_code: brand.currencyCode.toLowerCase(),
    ...(input.customerId ? { customer_id: input.customerId } : {}),
    shipping_address: {
      first_name: first,
      last_name: last,
      ...address,
    },
    billing_address: {
      first_name: first,
      last_name: last,
      ...address,
    },
    items,
    metadata: {
      storefront_order_id: input.storefrontOrderId,
      source: "storefront",
      ...(input.paymentMethod ? { payment_method: input.paymentMethod } : {}),
      ...(input.paymentReference ? { payment_reference: input.paymentReference } : {}),
      ...(input.subtotal != null ? { subtotal: input.subtotal } : {}),
      ...(input.shippingFee != null ? { shipping_fee: input.shippingFee } : {}),
      ...(input.freeShipping ? { free_shipping: true } : {}),
      ...(input.customerMessage ? { customer_notes: input.customerMessage } : {}),
    },
  };

  const response = await fetch(`${MEDUSA_BACKEND_URL}/admin/draft-orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errBody = await response.text();
    return { created: false, reason: `draft-order ${response.status}: ${errBody.slice(0, 200)}` } as const;
  }

  const payload = (await response.json()) as { draft_order?: { id: string; display_id: number } };
  return {
    created: true,
    draftOrderId: payload.draft_order?.id,
    displayId: payload.draft_order?.display_id,
  } as const;
}
