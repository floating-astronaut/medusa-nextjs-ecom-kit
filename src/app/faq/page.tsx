import { PageHero } from "@/components/page-hero";
import { JsonLd, faqSchema } from "@/components/seo/jsonld";
import { SiteHeader } from "@/components/site-header";
import { brand } from "@/config/brand";
import { region } from "@/config/region";

const support = brand.supportEmail;
const isShipping = brand.fulfillment === "ship";

const shippingAnswers = isShipping
  ? [
      {
        question: `How long does shipping take across ${brand.countryName}?`,
        answer: `We dispatch the same business day on orders paid before ${region.dispatchCutoff}. Most ${brand.countryName} addresses receive their parcel in 2–4 business days via standard carriers, with full tracking emailed once the parcel leaves our facility.`,
      },
      {
        question: "How is my order packaged?",
        answer: `${brand.packagingPolicy} We keep packaging simple and protective.`,
      },
      {
        question: `Do you ship outside ${brand.countryName}?`,
        answer: `Currently we only ship within ${brand.countryName}. International shipping may be added in the future.`,
      },
      {
        question: "What happens if my order doesn't arrive?",
        answer:
          "If tracking confirms the parcel did not arrive within 10 business days of dispatch, we either reship at no cost or refund the order in full. No interrogation, no restocking fees.",
      },
      {
        question: "Can I track my order in real time?",
        answer: `Yes — once your order ships you will receive an email with a tracking number. You can also see status updates by signing in at ${brand.siteUrl}/account.`,
      },
    ]
  : [
      {
        question: "How does pickup work?",
        answer: `Order online and we'll have it ready for pickup at our ${brand.city} location within an hour. You'll get an email when it's ready.`,
      },
      {
        question: "How long do you hold pickup orders?",
        answer:
          "48 hours from the ready notification. After that we'll re-shelve the items and refund the order.",
      },
      {
        question: "Can someone else pick up my order?",
        answer:
          "Only the customer who placed the order can pick up — please bring a copy of your order confirmation.",
      },
      {
        question: "Do you offer delivery?",
        answer:
          "Not directly. We're a click-and-collect retailer — order online, pick up in store.",
      },
    ];

const faqs = [
  ...shippingAnswers,
  {
    question: "Which payment methods do you accept?",
    answer:
      "All major credit and debit cards through our hosted checkout.",
  },
  {
    question: "Do you offer returns?",
    answer: `See our policies page for full return eligibility. For anything else, email ${support} with your order number.`,
  },
  {
    question: "What if I have an issue with my order?",
    answer: `Email ${support} with your order number and we'll help right away. We answer within a few hours during business hours (${brand.hoursDisplay.weekday}, ${brand.hoursDisplay.saturday}).`,
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <JsonLd data={faqSchema(faqs)} />
      <SiteHeader />
      <PageHero
        eyebrow="FAQ"
        title="The questions everyone asks, answered up front."
        body={`Shipping, payment, and packaging — the practical stuff. Anything not covered here goes to ${support}.`}
      />
      <section className="mx-auto max-w-5xl px-6 py-14 lg:px-10 lg:py-18">
        <div className="space-y-4">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-7"
            >
              <h2 className="font-display text-3xl leading-tight text-[var(--color-forest)] sm:text-4xl">
                {faq.question}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)] sm:text-base sm:leading-8">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
