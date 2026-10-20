"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderButton } from "@/components/order-button";
import type { Product } from "@/data/products";
import { getDefaultPackageOption, getPackageOptions, getPackagePrice } from "@/lib/product-packaging";
import { formatMoney } from "@/config/region";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const packageOptions = getPackageOptions(product);
  const [selectedPackage, setSelectedPackage] = useState(getDefaultPackageOption(product));
  const selectedPrice = getPackagePrice(product, selectedPackage);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="rounded-[2rem] border border-[rgba(24,32,23,0.1)] bg-[rgba(255,251,246,0.92)] p-5 shadow-[0_20px_80px_rgba(20,33,25,0.06)] sm:rounded-[2.6rem] sm:p-8 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)] sm:tracking-[0.3em]">Price</p>
            <p className="mt-3 text-5xl font-semibold text-[var(--color-clay)] sm:mt-4 sm:text-6xl">{formatMoney(selectedPrice)}</p>
            {selectedPackage ? (
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">for {selectedPackage.label}</p>
            ) : null}
          </div>
          <div className="self-start rounded-full border border-[rgba(24,32,23,0.08)] bg-[var(--color-panel)] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:tracking-[0.22em]">
            {product.stock > 0 ? `${product.stock} in stock` : "Restock soon"}
          </div>
        </div>

        {packageOptions.length > 0 ? (
          <div className="mt-7 sm:mt-9">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-forest)] sm:tracking-[0.32em]">Choose an option</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {packageOptions.map((option) => {
                const active = selectedPackage?.label === option.label;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedPackage(option)}
                    aria-pressed={active}
                    className={active
                      ? "rounded-[1.2rem] border-2 border-[var(--color-clay)] bg-[rgba(168,93,59,0.14)] px-3 py-4 text-left shadow-[0_8px_24px_rgba(168,93,59,0.18)]"
                      : "rounded-[1.2rem] border border-[var(--color-line)] bg-white/78 px-3 py-4 text-left transition hover:border-[var(--color-clay)] hover:bg-white"
                    }
                  >
                    <p className="text-base font-semibold text-[var(--color-forest)]">{option.label}</p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">{formatMoney(getPackagePrice(product, option))}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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
            Carefully packed and dispatched the same or next business day. Pay by card or through the hosted checkout option.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
          <OrderButton
            product={product}
            packageSelection={selectedPackage}
            label="Add to cart"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] !text-white transition hover:bg-[var(--color-forest-deep)] sm:tracking-[0.22em]"
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
