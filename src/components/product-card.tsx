import Image from "next/image";
import Link from "next/link";
import { OrderButton } from "@/components/order-button";
import type { Product } from "@/data/products";
import { getProductImage } from "@/lib/product-media";
import { formatMoney } from "@/config/region";

/** Pulls "6 pieces" out of a description if metadata wasn't set. */
function inferPackInfo(product: Product): { count: string | null } {
  if (product.packCount) {
    return { count: product.packCount };
  }
  const desc = product.description;
  // Match patterns like "set of 6", "6-pack", "pack of 3"
  const countMatch = desc.match(/(\d+)\s*[- ]?(?:pack|piece|pieces|pcs|set)/i);
  return {
    count: countMatch ? `Set of ${countMatch[1]}` : null,
  };
}

export function ProductCard({ product }: { product: Product }) {
  const imageSrc = getProductImage({ slug: product.slug, category: product.category });

  const onSale = product.salePercent != null && product.compareAtPrice != null;
  const packInfo = inferPackInfo(product);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.9rem] border border-[rgba(24,32,23,0.1)] bg-[rgba(255,251,246,0.92)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_90px_rgba(20,33,25,0.12)] sm:rounded-[2.25rem]">
      <Link href={`/shop/${product.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[1.02/1] overflow-hidden sm:aspect-[1.1/1]">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,15,12,0.08),rgba(9,15,12,0.4))]" />

          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4 sm:gap-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              <p className="rounded-full border border-white/16 bg-black/18 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/92 backdrop-blur sm:tracking-[0.3em]">
                {product.category}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {onSale ? (
                <span className="rounded-full bg-[var(--color-clay)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] !text-white shadow-[0_8px_18px_rgba(168,93,59,0.32)]">
                  Save {product.salePercent}%
                </span>
              ) : null}
              <span className="rounded-full border border-white/16 bg-white/12 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-white/88 backdrop-blur sm:tracking-[0.22em]">
                {product.badge}
              </span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h3 className="max-w-[11ch] font-display text-[2.35rem] leading-[0.92] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)] sm:text-4xl">
              {product.name}
            </h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between px-4 py-4 sm:px-6 sm:py-6">
          <div>
            {/* Pack info chip — shown when there's a pack count */}
            {packInfo.count ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)]">
                  {packInfo.count}
                </span>
              </div>
            ) : null}

            <p className="mt-4 text-sm leading-7 text-[var(--color-muted)] sm:mt-5">{product.description}</p>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-t border-[rgba(24,32,23,0.08)] pt-4 sm:mt-8 sm:pt-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:tracking-[0.24em]">In stock</p>
              <p className="mt-2 text-sm text-[var(--color-forest)]">{product.stock > 0 ? `${product.stock} available` : "Ships soon"}</p>
            </div>
            <div className="text-right">
              {onSale ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:tracking-[0.24em]">Sale</p>
                  <div className="mt-1 flex items-baseline justify-end gap-2">
                    <span className="text-xs text-[var(--color-muted)] line-through">
                      {formatMoney(product.compareAtPrice!)}
                    </span>
                    <span className="text-2xl font-bold text-[var(--color-clay)] sm:text-3xl">
                      {formatMoney(product.price)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] sm:tracking-[0.24em]">From</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--color-clay)] sm:text-3xl">{formatMoney(product.price)}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-auto px-4 pb-4 sm:px-6 sm:pb-6">
        <OrderButton
          product={product}
          className="w-full rounded-full bg-[var(--color-forest)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] !text-white transition hover:bg-[var(--color-forest-deep)] sm:tracking-[0.22em]"
        />
      </div>
    </article>
  );
}
