"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { FreeShippingBar } from "@/components/free-shipping-bar";
import { useOrder } from "@/components/order-provider";
import { formatMoney } from "@/config/region";

const HIGHLIGHT_WINDOW_MS = 4000;
const CATEGORY_ORDER = ["Apparel", "Accessories", "Home", "Stationery"];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function CartDrawer() {
  const {
    items,
    itemCount,
    total,
    removeItem,
    updateQuantity,
    cartDrawerOpen,
    setCartDrawerOpen,
    lastAdded,
    lastAddSignal,
  } = useOrder();

  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!cartDrawerOpen) {
      return;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCartDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const restore = restoreFocusRef.current;
      if (restore && restore.isConnected) {
        window.requestAnimationFrame(() => restore.focus());
      }
    };
  }, [cartDrawerOpen, setCartDrawerOpen]);

  const groupedItems = useMemo(() => {
    const orderIndex = new Map(CATEGORY_ORDER.map((category, index) => [category, index]));
    const groups = new Map<string, typeof items>();

    for (const item of items) {
      const category = item.category || "Catalog";
      const existing = groups.get(category) ?? [];
      existing.push(item);
      groups.set(category, existing);
    }

    return Array.from(groups.entries()).sort(([left], [right]) => {
      const leftOrder = orderIndex.get(left) ?? CATEGORY_ORDER.length;
      const rightOrder = orderIndex.get(right) ?? CATEGORY_ORDER.length;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return left.localeCompare(right);
    });
  }, [items]);

  const highlightKey = lastAdded
    ? `${lastAdded.name}::${lastAdded.variantLabel ?? ""}::${lastAddSignal}`
    : null;

  if (!cartDrawerOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]" aria-hidden={!cartDrawerOpen}>
      <button
        type="button"
        aria-label="Close cart drawer"
        className="absolute inset-0 bg-[rgba(20,33,25,0.48)] backdrop-blur-[2px]"
        onClick={() => setCartDrawerOpen(false)}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[0_-24px_60px_rgba(20,33,25,0.28)] md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[30rem] md:rounded-none md:rounded-l-[2rem]"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-olive)]">Cart</p>
              <h2 id="cart-drawer-title" className="mt-1 font-display text-3xl leading-none text-[var(--color-forest)]">
                Checkout
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setCartDrawerOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-xl text-[var(--color-forest)] transition hover:bg-[var(--color-panel)]"
              aria-label="Close cart drawer"
            >
              ×
            </button>
          </div>

          {items.length > 0 ? <FreeShippingBar subtotal={total} variant="drawer" /> : null}

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-[var(--color-line)] bg-white/70 px-6 py-10 text-center">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-olive)]">Cart is empty</p>
                <h3 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)]">Start with the shop.</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--color-muted)]">
                  Add something you love to begin checkout.
                </p>
                <Link
                  href="/shop"
                  onClick={() => setCartDrawerOpen(false)}
                  className="mt-6 rounded-full bg-[var(--color-forest)] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] !text-white"
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedItems.map(([category, categoryItems]) => (
                  <section key={category} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">{category}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-olive)]">
                        {categoryItems.reduce((count, item) => count + item.quantity, 0)} item
                        {categoryItems.reduce((count, item) => count + item.quantity, 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {categoryItems.map((item) => {
                        const isHighlighted =
                          lastAdded &&
                          Date.now() - lastAddSignal < HIGHLIGHT_WINDOW_MS &&
                          `${item.name}::${item.variantLabel ?? ""}::${lastAddSignal}` === highlightKey;

                        return (
                          <article
                            key={item.lineItemId}
                            className={`rounded-[1.35rem] border bg-white/90 p-4 transition ${
                              isHighlighted
                                ? "border-[var(--color-clay)] shadow-[0_16px_34px_rgba(168,93,59,0.14)]"
                                : "border-[var(--color-line)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-display text-2xl leading-none text-[var(--color-forest)]">
                                    {item.name}
                                  </h3>
                                  {item.variantLabel ? (
                                    <span className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-clay)]">
                                      {item.variantLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
                                  {item.badge}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void removeItem(item.lineItemId)}
                                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)] transition hover:text-[var(--color-clay)]"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-4">
                              <div className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] p-1">
                                <button
                                  type="button"
                                  onClick={() => void updateQuantity(item.lineItemId, item.quantity - 1)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-[var(--color-forest)] transition hover:bg-white"
                                  aria-label={`Decrease quantity for ${item.name}`}
                                >
                                  −
                                </button>
                                <span className="min-w-10 text-center text-sm font-semibold text-[var(--color-forest)]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void updateQuantity(item.lineItemId, item.quantity + 1)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-lg text-[var(--color-forest)] transition hover:bg-white"
                                  aria-label={`Increase quantity for ${item.name}`}
                                >
                                  +
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Line total</p>
                                <p className="mt-1 text-2xl font-semibold text-[var(--color-clay)]">
                                  {formatMoney(item.price * item.quantity)}
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-line)] bg-white/90 px-5 py-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]">Subtotal</p>
                <p className="mt-1 text-3xl font-semibold text-[var(--color-clay)]">{formatMoney(total)}</p>
              </div>
              <p className="text-right text-[11px] leading-5 text-[var(--color-muted)]">
                {itemCount} item{itemCount === 1 ? "" : "s"} in cart
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-forest)]"
              >
                Keep shopping
              </button>
              <Link
                href="/cart"
                onClick={() => setCartDrawerOpen(false)}
                className="rounded-full bg-[var(--color-forest)] px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] !text-white"
              >
                Checkout · {formatMoney(total)}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
