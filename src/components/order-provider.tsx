"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/data/products";
import { getDefaultPackageOption, type PackageSelection } from "@/lib/product-packaging";

type OrderItem = Product & {
  quantity: number;
  lineItemId: string;
  packageLabel: string | null;
  packageUnits: number | null;
  packageMultiplier: number;
};

type OrderContextValue = {
  items: OrderItem[];
  itemCount: number;
  total: number;
  addItem: (product: Product, options?: { packageSelection?: PackageSelection | null }) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  updateQuantity: (lineItemId: string, quantity: number) => Promise<void>;
  clearItems: () => Promise<void>;
  /** Auto-incremented when an item is successfully added — drawer + toast subscribe to this. */
  lastAddSignal: number;
  /** Snapshot of the most recently added item, for toast / drawer highlight. */
  lastAdded: { name: string; packageLabel: string | null; addedAt: number } | null;
  /** Drawer state — opened automatically on add, dismissable. */
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
};

type StoreCartItem = {
  id: string;
  product_id: string;
  product_title: string;
  product_description?: string | null;
  product_handle: string;
  product_subtitle?: string | null;
  variant_id: string;
  quantity: number;
  unit_price: number;
  metadata?: Record<string, unknown> | null;
};

type StoreCart = {
  id: string;
  total: number;
  items: StoreCartItem[];
};

type CartResponse = { cart: StoreCart };

const OrderContext = createContext<OrderContextValue | null>(null);
const STORAGE_KEY = "storefront-cart-id";
const DEFAULT_REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? "";

function buildLineItemMetadata(product: Product, packageSelection?: PackageSelection | null) {
  return {
    category: product.category,
    stock: product.stock,
    badge: product.badge,
    packageLabel: packageSelection?.label ?? null,
    packageUnits: packageSelection?.units ?? null,
    packageMultiplier: packageSelection?.multiplier ?? 1,
  };
}

function mapCartItem(item: StoreCartItem): OrderItem {
  const metadata = item.metadata ?? {};
  const packageMultiplier = typeof metadata.packageMultiplier === "number" && metadata.packageMultiplier > 0
    ? metadata.packageMultiplier
    : 1;
  const quantity = Math.max(1, Math.round(item.quantity / packageMultiplier));

  return {
    id: item.product_id,
    variantId: item.variant_id,
    lineItemId: item.id,
    slug: item.product_handle,
    name: item.product_title,
    category: typeof metadata.category === "string" ? metadata.category : "Catalog",
    price: item.unit_price * packageMultiplier,
    compareAtPrice: null,
    salePercent: null,
    stock: typeof metadata.stock === "number" ? metadata.stock : 0,
    description:
      typeof item.product_description === "string" && item.product_description.length > 0
        ? item.product_description
        : "Product details available on request.",
    badge:
      typeof metadata.badge === "string"
        ? metadata.badge
        : typeof item.product_subtitle === "string" && item.product_subtitle.length > 0
          ? item.product_subtitle
          : "Curated selection",
    packCount: typeof metadata.pack_count === "string" ? metadata.pack_count : null,
    quantity,
    packageLabel: typeof metadata.packageLabel === "string" ? metadata.packageLabel : null,
    packageUnits: typeof metadata.packageUnits === "number" ? metadata.packageUnits : null,
    packageMultiplier,
  };
}

async function storeFetch<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/store/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || `Store request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [lastAddSignal, setLastAddSignal] = useState(0);
  const [lastAdded, setLastAdded] = useState<OrderContextValue["lastAdded"]>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const announceAdd = (product: Product, packageSelection?: PackageSelection | null) => {
    const now = Date.now();
    // Defer to next tick so we never collide with the syncCart setState batch
    // that just ran. Avoids any "setState during render" warnings and any
    // racy ordering between cart-state and drawer-open transitions.
    const fire = () => {
      setLastAdded({
        name: product.name,
        packageLabel: packageSelection?.label ?? null,
        addedAt: now,
      });
      setLastAddSignal(now);
      setCartDrawerOpen(true);
    };
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(fire);
    } else {
      fire();
    }
  };

  const syncCart = (cart: StoreCart) => {
    setCartId(cart.id);
    setItems(cart.items.map(mapCartItem));
    setTotal(cart.total);
    window.localStorage.setItem(STORAGE_KEY, cart.id);
  };

  const createCart = async () => {
    const payload = DEFAULT_REGION_ID ? { region_id: DEFAULT_REGION_ID } : {};
    const response = await storeFetch<CartResponse>("carts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    syncCart(response.cart);
    return response.cart;
  };

  const retrieveCart = async (existingCartId: string) => {
    try {
      const response = await storeFetch<CartResponse>(`carts/${existingCartId}`);
      syncCart(response.cart);
      return response.cart;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return createCart();
    }
  };

  // Mount-only cart bootstrap — createCart/retrieveCart fire once and are
  // closed over the latest setState refs. Adding them to deps would re-run
  // every render and double-create carts.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    const existingCartId = window.localStorage.getItem(STORAGE_KEY);
    void (existingCartId ? retrieveCart(existingCartId) : createCart());
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  const addItem = async (product: Product, options?: { packageSelection?: PackageSelection | null }) => {
    const packageSelection = options?.packageSelection ?? getDefaultPackageOption(product);
    const packageLabel = packageSelection?.label ?? null;
    const existing = items.find(
      (item) => item.variantId === product.variantId && item.packageLabel === packageLabel,
    );

    if (existing) {
      await updateQuantity(existing.lineItemId, existing.quantity + 1);
      announceAdd(product, packageSelection);
      return;
    }

    const tryPost = async (cartIdToUse: string) =>
      storeFetch<CartResponse>(`carts/${cartIdToUse}/line-items`, {
        method: "POST",
        body: JSON.stringify({
          variant_id: product.variantId,
          quantity: packageSelection?.multiplier ?? 1,
          metadata: buildLineItemMetadata(product, packageSelection),
        }),
      });

    let activeCartId = cartId ?? (await createCart()).id;
    let response: CartResponse;
    try {
      response = await tryPost(activeCartId);
    } catch (error) {
      // The stored cart may have been completed/converted; drop it and retry
      // with a fresh one rather than surfacing "unknown error" to the user.
      console.warn("[cart] add-line-items failed, refreshing cart and retrying", error);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
      const fresh = await createCart();
      activeCartId = fresh.id;
      response = await tryPost(activeCartId);
    }

    syncCart(response.cart);
    announceAdd(product, packageSelection);
  };

  const removeItem = async (lineItemId: string) => {
    if (!cartId) {
      return;
    }

    const response = await storeFetch<{ parent: StoreCart }>(`carts/${cartId}/line-items/${lineItemId}`, {
      method: "DELETE",
    });
    syncCart(response.parent);
  };

  const updateQuantity = async (lineItemId: string, quantity: number) => {
    const item = items.find((entry) => entry.lineItemId === lineItemId);
    if (!item || !cartId) {
      return;
    }

    if (quantity <= 0) {
      await removeItem(lineItemId);
      return;
    }

    const packageSelection = item.packageLabel
      ? {
          label: item.packageLabel,
          units: item.packageUnits ?? 0,
          multiplier: item.packageMultiplier,
        }
      : null;

    const response = await storeFetch<CartResponse>(`carts/${cartId}/line-items/${item.lineItemId}`, {
      method: "POST",
      body: JSON.stringify({
        quantity: quantity * item.packageMultiplier,
        metadata: buildLineItemMetadata(item, packageSelection),
      }),
    });
    syncCart(response.cart);
  };

  const clearItems = async () => {
    if (!cartId || items.length === 0) {
      return;
    }

    for (const item of [...items]) {
      await removeItem(item.lineItemId);
    }
  };

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearItems,
      lastAddSignal,
      lastAdded,
      cartDrawerOpen,
      setCartDrawerOpen,
    }),
    // Handlers close over `cartId` and `items`, but `items`/`total` already in
    // deps suffice to refresh consumers when state changes. Adding the
    // function refs would make the memo useless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, total, lastAddSignal, lastAdded, cartDrawerOpen],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const value = useContext(OrderContext);
  if (!value) {
    throw new Error("useOrder must be used within OrderProvider");
  }
  return value;
}
