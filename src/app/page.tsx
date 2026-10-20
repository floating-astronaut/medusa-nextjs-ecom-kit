// Home page renders the live featured product, category counts, etc., from
// Medusa — defer to request time so a fresh deploy without Medusa configured
// still builds, and so prices / stock stay current per request.
export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { HeroSlideshow, type HeroSlide } from "@/components/hero-slideshow";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { ProductCard } from "@/components/product-card";
import { JsonLd, faqSchema, localBusinessSchema } from "@/components/seo/jsonld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/config/brand";
import { getCategories, getFeaturedProducts, getProducts } from "@/data/products";
import { getProductImage } from "@/lib/product-media";
import { formatMoney, region } from "@/config/region";
import { getFreeShippingThreshold } from "@/lib/shipping";
import { testimonials } from "@/data/testimonials";

/**
 * Build hero slides from a combination of:
 * 1. NEXT_PUBLIC_HERO_SLIDES env override (JSON-encoded HeroSlide[])
 * 2. Featured products + brand promo data as the default
 *
 * Each shop owner can either let the platform auto-generate the rotation
 * from their featured products, or hand-curate slides via the env.
 */
function buildHeroSlides(featured: Awaited<ReturnType<typeof getFeaturedProducts>>): HeroSlide[] {
  const overrideRaw = process.env.NEXT_PUBLIC_HERO_SLIDES;
  if (overrideRaw) {
    try {
      const parsed = JSON.parse(overrideRaw) as HeroSlide[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to defaults
    }
  }

  const slides: HeroSlide[] = [];

  // Slide 1 — drop of the week (top featured product)
  if (featured[0]) {
    slides.push({
      eyebrow: "Drop of the week",
      badge: featured[0].badge,
      category: featured[0].category,
      title: featured[0].name,
      body: featured[0].description,
      ctaLabel: "Shop now",
      ctaHref: `/shop/${featured[0].slug}`,
      imageUrl: getProductImage({ slug: featured[0].slug, category: featured[0].category }),
      price: { amount: featured[0].price, stock: featured[0].stock },
    });
  }

  // Slide 2 — free shipping promo (only if a threshold is configured)
  const threshold = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? "0");
  if (Number.isFinite(threshold) && threshold > 0 && featured[1]) {
    slides.push({
      eyebrow: "Free shipping",
      badge: `Over ${formatMoney(threshold)}`,
      title: `Free delivery on every order over ${formatMoney(threshold)}.`,
      body: `Same-day dispatch on orders paid before ${region.dispatchCutoff}. Tracking emailed the moment it leaves us.`,
      ctaLabel: "Shop the catalog",
      ctaHref: "/shop",
      imageUrl: getProductImage({ slug: featured[1].slug, category: featured[1].category }),
    });
  }

  // Slide 3 — welcome offer (only if a code is configured)
  const welcomeCode = process.env.NEXT_PUBLIC_WELCOME_CODE;
  const welcomeDiscount = process.env.NEXT_PUBLIC_WELCOME_DISCOUNT;
  if (welcomeCode && welcomeDiscount && featured[2]) {
    slides.push({
      eyebrow: "First-time buyer",
      badge: welcomeCode,
      title: `${welcomeDiscount} on your first order.`,
      body: `Enter the code ${welcomeCode} at checkout. Or sign up to the list and we'll email it.`,
      ctaLabel: "Get the code",
      ctaHref: "/#newsletter",
      imageUrl: getProductImage({ slug: featured[2].slug, category: featured[2].category }),
    });
  }

  return slides;
}

const HOMEPAGE_FAQS = [
  {
    question: "How long does shipping take?",
    answer:
      `Same-day dispatch before ${region.dispatchCutoff}, most addresses arrive in 2–4 business days. Tracking is emailed once it leaves us.`,
  },
  {
    question: "Is the packaging protective?",
    answer:
      "Yes. Everything ships in recyclable packaging sized to the order, with no unnecessary filler.",
  },
  {
    question: "Which payment methods do you accept?",
    answer:
      "All major credit and debit cards through our hosted checkout.",
  },
  {
    question: "What if my order gets lost?",
    answer:
      "If tracking confirms the parcel didn't arrive within 10 business days of dispatch, we reship or refund. No questions.",
  },
];

const categorySummaries: Record<string, string> = {
  Apparel: "Everyday tees and caps, cut for comfort and built to last wash after wash.",
  Accessories: "Bags and bottles that pull double duty — durable, simple, and useful daily.",
  Home: "Small pieces for your desk or kitchen that make the everyday a little nicer.",
  Stationery: "Notebooks and paper goods for people who still like writing things down.",
};

export default async function Home() {
  const [products, categories, featuredProducts] = await Promise.all([
    getProducts(),
    getCategories(),
    getFeaturedProducts(),
  ]);
  const heroSlides = buildHeroSlides(featuredProducts);

  return (
    <main className="flex-1 text-[var(--foreground)]">
      <JsonLd data={[localBusinessSchema(), faqSchema(HOMEPAGE_FAQS)]} />
      <SiteHeader />

      <section className="relative overflow-hidden bg-[var(--color-paper)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(194,109,69,0.2),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(63,90,69,0.2),transparent_22%),linear-gradient(135deg,rgba(251,247,240,0.96),rgba(233,223,208,0.84))]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--color-line)]" />
        <div className="relative mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:min-h-[calc(100vh-77px)] lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-14 lg:px-10 lg:py-18">
          <div className="max-w-5xl">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[rgba(20,33,25,0.1)] bg-white/70 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)] sm:gap-3 sm:px-4 sm:text-[11px] sm:tracking-[0.32em]">
              Free shipping over {formatMoney(getFreeShippingThreshold())}
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-clay)]" />
              Everyday essentials, direct to door
            </div>
            <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-[var(--color-olive)] sm:mt-10 sm:text-[11px] sm:tracking-[0.42em]">
              {brand.name}
            </p>
            <h1 className="mt-4 max-w-5xl font-display text-[3.35rem] leading-[0.92] text-[var(--color-forest)] sm:mt-5 sm:text-6xl lg:text-[7.6rem]">
              Everyday essentials — curated, not crowded.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:mt-7 sm:text-lg sm:leading-8 lg:text-xl">
              A tight shelf of the products we actually use. Pick your size and color, then check out securely by card.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link
                href="/shop"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] !text-white transition hover:bg-[var(--color-forest-deep)] sm:px-7 sm:py-4 sm:tracking-[0.22em]"
              >
                Shop the catalog
              </Link>
              <Link
                href="/cart"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/60 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-forest)] transition hover:bg-white sm:px-7 sm:py-4 sm:tracking-[0.22em]"
              >
                View cart
              </Link>
            </div>
          </div>

          {heroSlides.length > 0 ? <HeroSlideshow slides={heroSlides} /> : null}
        </div>
      </section>

      <section className="border-y border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(251,247,240,0.9),rgba(231,219,201,0.65))]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {[
              {
                title: "Quality checked",
                body: "Every batch inspected for quality and consistency",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3h6v4l4 10a3 3 0 0 1-2.8 4H7.8A3 3 0 0 1 5 17L9 7V3z" />
                    <path d="M7 14h10" />
                    <circle cx="10.5" cy="17" r="0.6" fill="currentColor" />
                    <circle cx="13.5" cy="18" r="0.6" fill="currentColor" />
                  </svg>
                ),
              },
              {
                title: "Careful packaging",
                body: "Plain, sealed parcels sized to the order",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
                    <path d="M3 7l9 4 9-4" />
                    <path d="M12 11v10" />
                  </svg>
                ),
              },
              {
                title: "Secure checkout",
                body: "Card payments processed through a trusted, hosted checkout",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9 7v10" />
                    <path d="M9 8h5a2.5 2.5 0 0 1 0 5H9" />
                    <path d="M9 12h5.5a2.5 2.5 0 0 1 0 5H9" />
                  </svg>
                ),
              },
              {
                title: `${brand.countryName}-wide`,
                body: `Same-day dispatch on orders paid before ${region.dispatchCutoff}`,
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 13h11l2-4h5v8h-3" />
                    <path d="M3 17h2" />
                    <path d="M14 17h2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="18" cy="17" r="2" />
                    <path d="M3 8h8" />
                    <path d="M5 11h6" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-[1.4rem] border border-[var(--color-line)] bg-white/75 p-5 shadow-[0_10px_30px_rgba(20,33,25,0.05)] backdrop-blur sm:rounded-[1.6rem] sm:p-6"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-forest)] text-[var(--color-paper)]">
                  <span className="block h-5 w-5">{item.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)] sm:text-[15px]">
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-[var(--color-muted)] sm:text-sm sm:leading-6">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(251,247,240,0.45),rgba(231,219,201,0.55))]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">Shop by category</p>
              <h2 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                Pick your lane.
              </h2>
            </div>
            <Link href="/shop" className="text-sm uppercase tracking-[0.2em] text-[var(--color-clay)] sm:tracking-[0.24em]">
              Shop everything
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.filter((category) => category !== "All").map((category) => {
              const categoryProducts = products.filter((product) => product.category === category);
              const tileProduct = categoryProducts[0];
              const imageSrc = tileProduct
                ? getProductImage({ slug: tileProduct.slug, category })
                : getProductImage({ slug: "", category });
              return (
                <Link
                  key={category}
                  href={`/shop?category=${encodeURIComponent(category)}`}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-forest)] text-white shadow-[0_20px_60px_rgba(20,33,25,0.14)] transition hover:-translate-y-1 sm:rounded-[2rem]"
                >
                  <Image
                    src={imageSrc}
                    alt={category}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,15,12,0.08)_0%,rgba(9,15,12,0.78)_100%)]" />
                  <div className="relative p-5 sm:p-6">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-white/70 sm:tracking-[0.32em]">
                      {categoryProducts.length} products
                    </p>
                    <h3 className="mt-2 font-display text-3xl leading-[0.95] text-white sm:text-4xl lg:text-[2.6rem]">
                      {category}
                    </h3>
                    <p className="mt-3 text-xs leading-6 text-white/75 sm:text-sm sm:leading-7">
                      {categorySummaries[category]}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/90">
                      Shop now <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">This week&apos;s picks</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                What&apos;s moving off the shelf right now.
              </h2>
            </div>
            <Link href="/shop" className="text-sm uppercase tracking-[0.2em] text-[var(--color-clay)] sm:tracking-[0.24em]">
              View full catalog
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)] bg-[var(--color-forest)] !text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/58 sm:text-[11px] sm:tracking-[0.35em]">Shop by use</p>
              <h2 className="mt-4 font-display text-4xl leading-none text-white sm:mt-5 sm:text-5xl lg:text-6xl">
                What are you shopping for?
              </h2>
            </div>
            <Link href="/shop" className="text-sm uppercase tracking-[0.2em] text-white/80 sm:tracking-[0.24em]">
              Shop everything →
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            {[
              { label: "Everyday", query: "everyday", accent: "#7a5fa8", emoji: "☾" },
              { label: "Work", query: "desk", accent: "#5c4682", emoji: "☽" },
              { label: "Gifting", query: "gift", accent: "#d47f3a", emoji: "✦" },
              { label: "Outdoors", query: "travel", accent: "#c97b54", emoji: "✺" },
              { label: "Home", query: "home", accent: "#5b7d63", emoji: "✧" },
            ].map((use) => (
              <Link
                key={use.label}
                href={`/shop?q=${use.query}`}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-[1.4rem] border border-white/14 bg-white/6 p-5 transition hover:-translate-y-1 hover:bg-white/10 sm:rounded-[1.6rem] sm:p-6"
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xl"
                  style={{ background: `${use.accent}33`, color: "#fff" }}
                  aria-hidden
                >
                  {use.emoji}
                </span>
                <p className="font-display text-3xl leading-none text-white sm:text-4xl">{use.label}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Shop products →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">How ordering works</p>
            <h2 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
              Three steps from cart to doorstep.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Pick your items",
                body: "Browse the catalog, choose your size or option, and add to cart. No account required.",
              },
              {
                step: "02",
                title: "Check out securely",
                body: "Pay by card through our hosted checkout — fast, simple, and encrypted end to end.",
              },
              {
                step: "03",
                title: "We ship carefully",
                body: `Orders paid before ${region.dispatchCutoff} dispatch same-day, carefully packed. Tracking sent by email.`,
              },
            ].map((item) => (
              <article key={item.step} className="rounded-[1.6rem] border border-[var(--color-line)] bg-white/70 p-6 sm:rounded-[2rem] sm:p-7">
                <p className="font-display text-5xl leading-none text-[var(--color-clay)] sm:text-6xl">{item.step}</p>
                <p className="mt-4 text-xl font-semibold text-[var(--color-forest)] sm:mt-5 sm:text-2xl">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)] sm:leading-8">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)] bg-[var(--color-panel)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">Common questions</p>
              <h2 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                The usual stuff, up front.
              </h2>
              <p className="mt-5 text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8">
                More on the <Link href="/faq" className="underline">FAQ page</Link>, or reach us directly if something isn&apos;t covered.
              </p>
            </div>
            <div className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {[
                {
                  q: "How long does shipping take?",
                  a: `Same-day dispatch before ${region.dispatchCutoff}, most addresses arrive in 2–4 business days. Tracking is emailed once it leaves us.`,
                },
                {
                  q: "Is the packaging protective?",
                  a: "Yes. Everything ships in recyclable packaging sized to the order, with no unnecessary filler.",
                },
                {
                  q: "Which payment methods do you accept?",
                  a: "All major credit and debit cards through our hosted checkout.",
                },
                {
                  q: "What if my order gets lost?",
                  a: "If tracking confirms the parcel didn't arrive within 10 business days of dispatch, we reship or refund. No questions.",
                },
              ].map((item) => (
                <details key={item.q} className="group py-5 sm:py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[var(--color-forest)] sm:text-lg">
                    {item.q}
                    <span className="text-xl text-[var(--color-clay)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 ? (
      <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">What customers say</p>
              <h2 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                Loved by the people who shop here.
              </h2>
            </div>
            {testimonials.some((review) => review.sample) ? (
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                Sample reviews · edit src/data/testimonials.ts
              </span>
            ) : null}
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">
            {testimonials.map((review, index) => (
              <article key={`${review.name}-${index}`} className="rounded-[1.6rem] border border-[var(--color-line)] bg-white/70 p-6 sm:rounded-[2rem] sm:p-7">
                <div className="flex items-center gap-2 text-[var(--color-clay)]">
                  {Array.from({ length: review.rating }).map((_, star) => (
                    <span key={star} aria-hidden>★</span>
                  ))}
                </div>
                <p className="mt-4 text-base leading-7 text-[var(--color-forest)] sm:text-lg sm:leading-8">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-[var(--color-line)] pt-4">
                  <p className="text-sm font-semibold text-[var(--color-forest)]">{review.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{review.location}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      <NewsletterSignup />

      <section className="bg-[var(--color-paper)]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-10 lg:py-24">
          <div className="rounded-[2rem] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(231,219,201,0.76),rgba(251,247,240,0.92))] px-5 py-6 sm:rounded-[2.5rem] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end lg:gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">Ready to order</p>
                <h2 className="mt-4 max-w-3xl font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                  Build the cart. Check out securely. Get it shipped fast.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:mt-6 sm:text-base sm:leading-8">
                  Build the cart, confirm the address, and check out securely by card.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end lg:gap-4">
                <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-forest)] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] !text-white sm:px-7 sm:py-4 sm:tracking-[0.22em]">
                  Browse catalog
                </Link>
                <Link href="/cart" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/70 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-forest)] sm:px-7 sm:py-4 sm:tracking-[0.22em]">
                  View cart
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
