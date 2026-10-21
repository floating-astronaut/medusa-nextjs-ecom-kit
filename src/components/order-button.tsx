"use client";

import { useEffect, useState } from "react";
import { useOrder } from "@/components/order-provider";
import type { Product } from "@/data/products";

export function OrderButton({
  product,
  variantId,
  label = "Add to cart",
  disabled = false,
  className,
}: {
  product: Product;
  /** Variant to add; defaults to the product's default variant. */
  variantId?: string;
  label?: string;
  disabled?: boolean;
  className: string;
}) {
  const { addItem } = useOrder();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-clear the inline error after 6 s
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(id);
  }, [error]);

  async function onClick() {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      await addItem(product, { variantId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[add-to-cart] failed", err);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={busy || disabled}
        className={className}
        aria-busy={busy}
      >
        {busy ? "Adding…" : label}
      </button>
      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-700" role="alert">
          Couldn&apos;t add to cart: {error}
        </p>
      ) : null}
    </>
  );
}
