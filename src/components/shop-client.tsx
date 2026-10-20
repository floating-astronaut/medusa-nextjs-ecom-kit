"use client";

import { startTransition, useDeferredValue, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/data/products";

export function ShopClient({
  products,
  categories,
}: {
  products: Product[];
  categories: string[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery) ||
      product.category.toLowerCase().includes(normalizedQuery) ||
      product.badge.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  const categoryCounts = categories.reduce<Record<string, number>>((accumulator, category) => {
    if (category === "All") {
      accumulator[category] = products.length;
      return accumulator;
    }

    accumulator[category] = products.filter((product) => product.category === category).length;
    return accumulator;
  }, {});

  return (
    <>
      <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">
            All products
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[0.96] text-[var(--color-forest)] sm:mt-5 sm:text-6xl lg:text-7xl">
            Everything on the shelf, right now.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:mt-6 sm:text-base sm:leading-8">
            Filter by category, search for something specific, or scroll the whole catalog.
          </p>

          <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-[1fr_0.38fr] lg:gap-5">
            <label className="rounded-[1.4rem] border border-[var(--color-line)] bg-white/70 px-4 py-4 shadow-[0_12px_30px_rgba(20,33,25,0.04)] sm:rounded-[1.6rem] sm:px-5">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:tracking-[0.24em]">
                Search products
              </span>
              <input
                value={searchQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => setSearchQuery(value));
                }}
                placeholder="T-shirt, tote bag, mug..."
                className="mt-3 w-full bg-transparent text-base text-[var(--color-forest)] outline-none placeholder:text-[color:rgba(111,104,93,0.55)] sm:text-lg"
              />
            </label>
            <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-[var(--color-forest)] px-4 py-4 !text-white sm:rounded-[1.6rem] sm:px-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/52 sm:tracking-[0.24em]">
                On the shelf
              </p>
              <p className="mt-3 text-4xl font-semibold sm:text-5xl">{filteredProducts.length}</p>
            </div>
          </div>

          <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-2 sm:mt-8 sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-3 sm:flex-wrap">
              {categories.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      startTransition(() => setSelectedCategory(category));
                    }}
                    className={
                      active
                        ? "rounded-full bg-[var(--color-clay)] px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] !text-white"
                        : "rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] text-[var(--color-forest)] transition hover:bg-white"
                    }
                  >
                    {category} <span className="ml-2 text-[0.9em] opacity-60">{categoryCounts[category]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        {filteredProducts.length > 0 ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-6 text-center sm:rounded-[2.2rem] sm:p-10">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.28em]">
              Nothing here yet
            </p>
            <h2 className="mt-4 font-display text-3xl text-[var(--color-forest)] sm:mt-5 sm:text-4xl">
              That search came up empty.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--color-muted)]">
              Try a different search term or switch the category. New products are added regularly.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
