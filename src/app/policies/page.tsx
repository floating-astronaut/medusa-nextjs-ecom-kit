import { PageHero } from "@/components/page-hero";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/config/brand";

const policyBlocks = [
  {
    title: "Payments",
    body: "We accept the payment options shown at checkout. Orders are only approved after payment is confirmed.",
  },
  {
    title: "Shipping and delivery",
    body: `${brand.shippingPolicy} ${brand.packagingPolicy}`,
  },
  {
    title: "Returns and replacements",
    body: "Unopened items in their original condition can be returned within 30 days. If a parcel is lost, damaged in transit, or the order arrives materially wrong, contact support and we'll make it right.",
  },
  {
    title: "Privacy",
    body: "Customer details are used only for order review, payment coordination, shipping updates, and support. We do not sell customer information or use it outside the storefront and fulfillment process.",
  },
  {
    title: "Support",
    body: `For order help, payment issues, or delivery questions, contact ${brand.supportEmail}. Reaching out quickly gives us the best chance to resolve the issue before dispatch.`,
  },
];

export default function PoliciesPage() {
  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <SiteHeader />
      <PageHero
        eyebrow="Policies"
        title="Clear store rules, written like a real business."
        body="Everything here is meant to answer the practical questions buyers care about before they order: payment, delivery, privacy, and what happens when something goes wrong."
      />
      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-18">
        <div className="grid gap-5 md:grid-cols-2">
          {policyBlocks.map((block) => (
            <article key={block.title} className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-7">
              <h2 className="font-display text-4xl leading-none text-[var(--color-forest)]">{block.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{block.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
