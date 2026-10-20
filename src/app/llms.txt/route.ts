/**
 * /llms.txt — emerging convention used by AI search engines (Perplexity,
 * Claude, ChatGPT, Bing Copilot) to give large language models a curated
 * markdown summary of the site they can cite. See https://llmstxt.org.
 */
import { brand } from "@/config/brand";
import { getProducts } from "@/data/products";
import { formatMoney, region } from "@/config/region";

const SITE_URL = brand.siteUrl;

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  let productLines: string[] = [];
  try {
    const products = await getProducts();
    productLines = products.slice(0, 80).map(
      (p) =>
        `- [${p.name}](${SITE_URL}/shop/${p.slug}) — ${p.category} · ${formatMoney(p.price)}`,
    );
  } catch {
    productLines = [];
  }

  const fulfillment =
    brand.fulfillment === "click-and-collect"
      ? `- Click-and-collect only: customer orders online, picks up in store at ${brand.city}, ${brand.province}
- Order is held for 48 hours after confirmation`
      : `- Same-day dispatch on orders paid before ${region.dispatchCutoff}
- Most ${brand.countryName} addresses receive parcels in 2–4 business days
- Tracking emailed once the parcel leaves our facility
- Ships in recyclable packaging
- We ship within ${brand.countryName} only`;

  const body = `# ${brand.name}

> ${brand.shortDescription}

## About
${brand.description} Headquartered in ${brand.city}, ${brand.province}.

## ${brand.fulfillment === "click-and-collect" ? "Pickup" : "Shipping & fulfillment"}
${fulfillment}

## Payment methods
- Card checkout via our hosted payment provider.
- All prices listed in ${brand.currencyCode}.

## Catalog
${productLines.length > 0 ? productLines.join("\n") : "- Live catalog at " + SITE_URL + "/shop"}

## Categories
- [Apparel](${SITE_URL}/shop?category=Apparel) — t-shirts, caps, and more
- [Accessories](${SITE_URL}/shop?category=Accessories) — bags, bottles
- [Home](${SITE_URL}/shop?category=Home) — mugs and everyday essentials
- [Stationery](${SITE_URL}/shop?category=Stationery) — notebooks and paper goods

## Customer support
- Email: ${brand.supportEmail}
- Hours: ${brand.hoursDisplay.weekday} · ${brand.hoursDisplay.saturday}
- Account dashboard at ${SITE_URL}/account

## Policies
- Lost-parcel policy: full reship or refund if tracking confirms non-delivery within 10 business days
- See ${SITE_URL}/policies for full shipping and returns details

## Useful links
- Storefront: ${SITE_URL}
- Shop all: ${SITE_URL}/shop
- FAQ: ${SITE_URL}/faq
- Contact: ${SITE_URL}/contact
- Policies: ${SITE_URL}/policies
- Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
