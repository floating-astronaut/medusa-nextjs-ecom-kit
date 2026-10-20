import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { brand } from "@/config/brand";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        {/* Top: brand + nav columns */}
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr]">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-md text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8">
              {brand.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-olive)]">
                            <span className="rounded-full border border-[var(--color-line)] bg-white/70 px-3 py-1.5">
                {brand.fulfillment === "click-and-collect" ? "Click-and-collect" : "Tracked shipping"}
              </span>
              <span className="rounded-full border border-[var(--color-line)] bg-white/70 px-3 py-1.5">Secure checkout</span>
            </div>
            <p className="mt-5 text-sm text-[var(--color-muted)]">
              Questions?{" "}
              <a
                href={`mailto:${brand.supportEmail}`}
                className="text-[var(--color-forest)] underline hover:text-[var(--color-clay)]"
              >
                {brand.supportEmail}
              </a>
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Shop</p>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--color-forest)]">
              <li><Link href="/shop">All products</Link></li>
              <li><Link href="/shop?category=Apparel">Apparel</Link></li>
              <li><Link href="/shop?category=Accessories">Accessories</Link></li>
              <li><Link href="/shop?category=Home">Home</Link></li>
              <li><Link href="/shop?category=Stationery">Stationery</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Help</p>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--color-forest)]">
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/policies">Shipping &amp; returns</Link></li>
              <li><Link href="/policies">Privacy policy</Link></li>
              <li><Link href="/policies">Terms of service</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Account</p>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--color-forest)]">
              <li><Link href="/account/login">Sign in</Link></li>
              <li><Link href="/account/register">Create account</Link></li>
              <li><Link href="/account/orders">Your orders</Link></li>
              <li><Link href="/cart">Your cart</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom: legal strip */}
        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 text-xs leading-6 text-[var(--color-muted)] sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-8">
          <p>
            &copy; {year} {brand.name} · All rights reserved.
          </p>
          <p>Questions about an order? Reach out to our support team any time.</p>
        </div>
      </div>
    </footer>
  );
}
