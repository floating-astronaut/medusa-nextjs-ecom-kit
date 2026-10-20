"use client";

import { getFreeShippingThreshold } from "@/lib/shipping";
import { formatMoney } from "@/config/region";

type Props = {
  subtotal: number;
  /** "drawer" -> compact row optimised for the cart drawer; "page" -> larger version for /cart. */
  variant?: "drawer" | "page";
};

export function FreeShippingBar({ subtotal, variant = "drawer" }: Props) {
  const threshold = getFreeShippingThreshold();
  if (!threshold) return null;

  const remaining = Math.max(0, threshold - subtotal);
  const reached = remaining === 0;
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  if (variant === "page") {
    return (
      <div className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-olive)]">
            {reached ? "Free shipping unlocked" : "Free shipping at " + formatMoney(threshold)}
          </p>
          <p className="text-xs font-semibold text-[var(--color-forest)]">
            {reached ? "🎉 You're all set" : `${formatMoney(remaining)} to go`}
          </p>
        </div>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-panel)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-clay)] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)]">
          {reached ? (
            <>🎉 Free shipping unlocked</>
          ) : (
            <>
              <span className="text-[var(--color-clay)]">{formatMoney(remaining)}</span> away from free shipping
            </>
          )}
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
          {progress}%
        </p>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-clay)] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
