import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { JsonLd, breadcrumbSchema, productSchema } from "@/components/seo/jsonld";
import { SiteHeader } from "@/components/site-header";
import { getProductBySlug, getProducts } from "@/data/products";
import { getProductImage } from "@/lib/product-media";

import { brand } from "@/config/brand";

const SITE_URL = brand.siteUrl;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const description = product.description?.slice(0, 200) ?? `${product.name} — ${product.category}`;
  const url = `${SITE_URL}/shop/${product.slug}`;
  const image = `${SITE_URL}${getProductImage({ slug: product.slug, category: product.category })}`;
  return {
    title: `${product.name} · ${product.category}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [image],
    },
  };
}

function profileNotes(product: { category: string; stock: number; badge: string }) {
  return [
    { label: "Category", value: product.category },
    { label: "Availability", value: product.stock > 0 ? `${product.stock} in stock` : "Ships soon" },
    { label: "Highlight", value: product.badge },
  ];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, products] = await Promise.all([getProductBySlug(slug), getProducts()]);

  if (!product) {
    notFound();
  }

  const relatedProducts = products
    .filter((candidate) => candidate.category === product.category && candidate.slug !== product.slug)
    .slice(0, 3);
  const notes = profileNotes(product);
  const imageSrc = getProductImage({ slug: product.slug, category: product.category });

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <JsonLd
        data={[
          productSchema(product, imageSrc),
          breadcrumbSchema([
            { name: "Home", url: SITE_URL },
            { name: "Shop", url: `${SITE_URL}/shop` },
            { name: product.name, url: `${SITE_URL}/shop/${product.slug}` },
          ]),
        ]}
      />
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-20">
        <Link href="/shop" className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.26em]">
          Back to shop
        </Link>

        <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="overflow-hidden rounded-[2rem] border border-[rgba(24,32,23,0.1)] bg-[rgba(255,251,246,0.92)] shadow-[0_32px_110px_rgba(20,33,25,0.16)] sm:rounded-[2.8rem]">
            <div className="relative aspect-[0.95/1] overflow-hidden sm:aspect-[1.08/1]">
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,11,0.1),rgba(8,14,11,0.52))]" />
              <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-7 lg:p-8">
                <div className="flex flex-wrap gap-2">
                  <p className="rounded-full border border-white/16 bg-black/18 px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] text-white/92 backdrop-blur sm:px-4 sm:tracking-[0.34em]">
                    {product.category}
                  </p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/84 backdrop-blur sm:px-4 sm:py-2 sm:tracking-[0.24em]">
                  {product.badge}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 lg:p-8">
                <h1 className="max-w-[11ch] font-display text-[3rem] leading-[0.9] text-white sm:text-6xl lg:text-[5.2rem]">
                  {product.name}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:mt-5 sm:text-base sm:leading-8">{product.description}</p>
              </div>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:gap-4 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              {notes.map((item) => (
                <div key={item.label} className="rounded-[1.2rem] bg-[var(--color-panel)] px-4 py-4 sm:rounded-[1.35rem] sm:px-5 sm:py-5">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[var(--color-muted)] sm:tracking-[0.26em]">{item.label}</p>
                  <p className="mt-3 text-lg text-[var(--color-forest)] sm:text-xl">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <ProductPurchasePanel product={product} />
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="border-t border-[var(--color-line)] bg-[var(--color-paper)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.35em]">You might also like</p>
                <h2 className="mt-4 font-display text-4xl leading-none text-[var(--color-forest)] sm:mt-5 sm:text-5xl lg:text-6xl">
                  More {product.category.toLowerCase()} worth a look.
                </h2>
              </div>
              <Link href="/shop" className="text-sm uppercase tracking-[0.2em] text-[var(--color-clay)] sm:tracking-[0.24em]">
                View all products
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
