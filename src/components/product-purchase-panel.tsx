"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderButton } from "@/components/order-button";
import type { Product, ProductVariant } from "@/data/products";
import { formatMoney } from "@/config/region";
import { defaultVariant, findVariant, selectValue, selectionOf, valueState, type Selection } from "@/lib/variants";

const LOW_STOCK = 5;

function stockLabel(variant: ProductVariant | undefined) {
  if (!variant) return "Choose an option";
  if (!variant.available) return "Sold out";
  if (variant.inventory === null) return "In stock";
  if (variant.inventory <= LOW_STOCK) return `Only ${variant.inventory} left`;
  return `${variant.inventory} in stock`;
}

/** Keep `?variant=` in the address bar so a chosen option can be shared or bookmarked. */
function rememberVariant(variantId: string | undefined) {
  if (typeof window === "undefined" || !variantId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", variantId);
  window.history.replaceState(window.history.state, "", url);
}

export function ProductPurchasePanel({
  product,
  initialVariantId,
}: {
  product: Product;
  /** From `?variant=` on the product URL. */
  initialVariantId?: string;
}) {
  const initial =
    product.variants.find((variant) => variant.id === initialVariantId) ?? defaultVariant(product.variants);
  const [selection, setSelection] = useState<Selection>(selectionOf(initial));
  const selected = product.options.length > 0 ? findVariant(product.variants, selection) : initial;
  const price = selected?.price ?? product.price;
  const canBuy = Boolean(selected?.available);

  function choose(optionId: string, value: string) {
    const next = selectValue(product.variants, selection, optionId, value);
    setSelection(next);
    rememberVariant(findVariant(product.variants, next)?.id);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-[2rem] border border-[rgba(24,32,23,0.1)] bg-[rgba(255,251,246,0.92)] p-5 shadow-[0_20px_80px_rgba(20,33,25,0.06)] sm:rounded-[2.6rem] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)] sm:tracking-[0.3em]">Price</p>
            <p className="mt-3 text-5xl font-semibold tabular-nums text-[var(--color-clay)] sm:mt-4 sm:text-6xl">{formatMoney(price)}</p>
            {selected && product.options.length > 0 ? (
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{selected.title}</p>
            ) : null}
          </div>
          <div
            className="self-start rounded-full border border-[rgba(24,32,23,0.08)] bg-[var(--color-panel)] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:tracking-[0.22em]"
            aria-live="polite"
          >
            {stockLabel(selected)}
          </div>
        </div>

        {product.options.map((option) => (
          <fieldset key={option.id} className="mt-7 sm:mt-9">
            <legend className="flex w-full items-baseline justify-between gap-4">
              <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-forest)] sm:tracking-[0.32em]">
                {option.title}
              </span>
              <span className="text-sm text-[var(--color-muted)]">{selection[option.id] ?? "Choose"}</span>
            </legend>
            <div className="mt-4 flex flex-wrap gap-2.5 sm:gap-3">
              {option.values.map((value) => {
                const state = valueState(product.variants, selection, option.id, value);
                const active = selection[option.id] === value;
                const soldOut = state === "sold-out";
                const needsOtherChoice = state === "unavailable-with-selection";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(option.id, value)}
                    disabled={soldOut}
                    aria-pressed={active}
                    aria-label={`${option.title}: ${value}${soldOut ? " (sold out)" : needsOtherChoice ? " (not available with your other choices)" : ""}`}
                    title={soldOut ? "Sold out" : needsOtherChoice ? "Available with other options" : undefined}
                    className={[
                      "min-h-11 min-w-12 rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "border-2 border-[var(--color-clay)] bg-[rgba(168,93,59,0.14)] text-[var(--color-forest)]"
                        : "border border-[var(--color-line)] bg-white/78 text-[var(--color-forest)] hover:border-[var(--color-clay)] hover:bg-white",
                      soldOut ? "cursor-not-allowed text-[var(--color-muted)] line-through opacity-50 hover:border-[var(--color-line)]" : "",
                      needsOtherChoice && !active ? "border-dashed text-[var(--color-muted)]" : "",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-[1.3rem] bg-[var(--color-panel)] p-4 sm:rounded-[1.5rem] sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:tracking-[0.24em]">Highlight</p>
            <p className="mt-3 text-base text-[var(--color-forest)] sm:text-lg">{product.badge}</p>
          </div>
          <div className="rounded-[1.3rem] bg-[rgba(255,255,255,0.72)] p-4 ring-1 ring-[rgba(24,32,23,0.08)] sm:rounded-[1.5rem] sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:tracking-[0.24em]">Category</p>
            <p className="mt-3 text-base text-[var(--color-forest)] sm:text-lg">{product.category}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-[rgba(24,32,23,0.08)] bg-white/80 p-5 sm:mt-8 sm:rounded-[1.7rem] sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:tracking-[0.24em]">How it ships</p>
          <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
            Carefully packed and dispatched the same or next business day. Pay securely at checkout.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
          <OrderButton
            product={product}
            variantId={selected?.id}
            disabled={!canBuy}
            label={canBuy ? "Add to cart" : selected ? "Sold out" : "Choose an option"}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] !text-white transition hover:bg-[var(--color-forest-deep)] disabled:cursor-not-allowed disabled:opacity-50 sm:tracking-[0.22em]"
          />
          <Link
            href="/cart"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-forest)] sm:tracking-[0.22em]"
          >
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}
