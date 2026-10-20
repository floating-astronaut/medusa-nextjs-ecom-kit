<div align="center">

# Medusa + Next.js E-commerce Kit

### An open-source, production-shaped headless commerce starter — a **Next.js 16** storefront on a **Medusa 2.x** backend.

Cart, checkout, customer accounts, order history, product catalog, transactional
email, and analytics — already wired together, so you start from a working store
instead of a blank page.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Medusa](https://img.shields.io/badge/Medusa-2.13-6C5CE7?logo=medusa&logoColor=white)](https://medusajs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

**[Use this template](https://github.com/floating-astronaut/medusa-nextjs-ecom-kit/generate)** to start your own store from a clean copy.

</div>

---

## Table of contents

- [Screenshots](#screenshots)
- [Why this kit](#why-this-kit)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Checkout & payments](#checkout--payments)
- [Project structure](#project-structure)
- [Make it yours](#make-it-yours)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Screenshots

The storefront running against the bundled seed data (`npm run seed`), with the default brand settings.

| Desktop | Mobile |
|---|---|
| <img src="docs/screenshots/home-desktop.png" alt="Home page on desktop" width="560"> | <img src="docs/screenshots/home-mobile.png" alt="Home page on mobile" width="200"> |
| <img src="docs/screenshots/shop-desktop.png" alt="Product grid on desktop" width="560"> | <img src="docs/screenshots/shop-mobile.png" alt="Product grid on mobile" width="200"> |
| <img src="docs/screenshots/product-desktop.png" alt="Product page on desktop" width="560"> | <img src="docs/screenshots/product-mobile.png" alt="Product page on mobile" width="200"> |
| <img src="docs/screenshots/checkout-desktop.png" alt="Checkout on desktop" width="560"> | <img src="docs/screenshots/checkout-mobile.png" alt="Checkout on mobile" width="200"> |

---

## Why this kit

Most headless-commerce tutorials stop at "hello products". This one ships the
parts that are actually annoying to build: a real multi-step **checkout**, a
**customer account** area with order history, **transactional email** for every
order stage, an **analytics** layer, and env-driven **branding** so one codebase
can become any store. It is intentionally provider-agnostic — swap in Stripe,
PayPal, or any gateway when you're ready to take money.

> This template ships neutral placeholder branding and products for you to
> replace with your own.

---

## Features

| | |
|---|---|
| 🛍️ **Storefront** | Home, catalog (`/shop`, `/shop/[slug]`), cart, and a multi-step checkout |
| 👤 **Customer accounts** | Register, login, profile, and order history (`/account/*`) |
| 💳 **Checkout & payments** | Generic **bank-transfer** flow + a **placeholder (demo)** payment route — provider-agnostic |
| 📧 **Transactional email** | Order-received, payment, shipped, delivered & canceled emails via any SMTP provider |
| 🎨 **Env-driven branding** | Name, colours, currency, socials & policy copy in one `brand.ts` — no code edits |
| 🔎 **SEO out of the box** | Metadata, JSON-LD, `sitemap.xml`, `robots.txt`, and `llms.txt` |
| 📈 **Analytics** | Optional Google Analytics + Meta Pixel / Conversions API |
| 🧱 **Headless backend** | Medusa 2.x: products, variants, pricing, inventory, regions, admin dashboard |
| 🧑‍💻 **Typed end-to-end** | TypeScript everywhere, `tsc --noEmit` clean |

---

## Architecture

```mermaid
flowchart LR
    subgraph Client["🌐 Browser"]
        U["Shopper"]
    end

    subgraph Storefront["▲ Next.js 16 storefront"]
        direction TB
        Pages["App Router pages<br/>shop · cart · checkout · account"]
        API["Route handlers<br/>/api/orders · /api/payments · /api/webhooks"]
    end

    subgraph Backend["🟣 Medusa 2.x backend"]
        direction TB
        Store["Store & Admin API"]
        Admin["Admin dashboard"]
    end

    DB[("🐘 PostgreSQL")]
    Mail["✉️ SMTP / email"]
    Analytics["📈 GA · Meta Pixel"]

    U --> Pages
    Pages --> API
    Pages -->|products, cart| Store
    API -->|draft orders, payments| Store
    Store --> DB
    Admin --> DB
    API --> Mail
    Pages --> Analytics
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Storefront | Next.js 16 (App Router) · React 19 · TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Backend | Medusa 2.13 (headless commerce) |
| Database | PostgreSQL |
| Email | Nodemailer (any SMTP / transactional provider) |
| Tooling | ESLint 9 · npm (pnpm also works for the backend) |

---

## Quick start

**Prerequisites:** Node 20+ and a PostgreSQL database. Redis is optional.

**1. Backend (Medusa)** — in the `medusa/` folder:

```bash
cd medusa
cp .env.template .env          # set DATABASE_URL to your Postgres database
npm install
npx medusa db:migrate
npm run seed                   # sample US store: USD region + 8 products
npx medusa user -e admin@example.com -p change_me   # admin login for /app
npm run dev                    # Medusa on http://localhost:9000 (admin at /app)
```

The seed finishes by printing the IDs the storefront needs:

```
MEDUSA_PUBLISHABLE_KEY=pk_...
MEDUSA_REGION_ID=reg_...
NEXT_PUBLIC_MEDUSA_REGION_ID=reg_...
MEDUSA_SALES_CHANNEL_ID=sc_...
```

**2. Storefront (Next.js)** — in a second terminal, from the repo root:

```bash
cp .env.example .env.local     # paste the four values above, plus the admin email/password
npm install
npm run dev                    # storefront on http://localhost:3000
```

The admin email and password go in `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`;
checkout uses them server-side to create orders. You can also find the key and
region later in the Medusa admin (**Settings → Publishable API Keys** and
**Settings → Regions**).

**Selling somewhere other than the US?** Change `CURRENCY`, `COUNTRY` and
`REGION_NAME` at the top of [`medusa/src/scripts/seed.ts`](medusa/src/scripts/seed.ts)
before seeding, and set the matching `NEXT_PUBLIC_BRAND_CURRENCY`,
`NEXT_PUBLIC_BRAND_COUNTRY` and `NEXT_PUBLIC_BRAND_LOCALE` in `.env.local`.
Prices are in whole currency units (`28` = $28.00), as Medusa 2 expects.

> 💡 `build-all.sh` builds both the backend and the storefront in one shot.

---

## Checkout & payments

The kit ships two provider-agnostic payment paths so checkout is complete and
runnable **without signing up for anything**:

- **Bank Transfer** — a manual-payment flow. The order is created, a payment
  reference is generated, and the customer is emailed account details to
  complete the transfer.
- **Placeholder (Demo)** — creates the order and marks it paid via
  `/api/payments/placeholder`, then lands on `/checkout/success`.
  **No real charge — do not use it to take real money.**

```mermaid
sequenceDiagram
    actor C as Shopper
    participant SF as Next.js checkout
    participant O as /api/orders
    participant P as /api/payments/placeholder
    participant M as Medusa backend
    participant E as Email

    Note over C,E: Bank Transfer flow
    C->>SF: Choose "Bank Transfer"
    SF->>O: POST order (bank_transfer)
    O->>M: Create draft order
    O->>E: Email payment reference + details
    O-->>SF: paymentReference, payToEmail
    SF-->>C: Show bank-transfer instructions

    Note over C,E: Placeholder (Demo) flow
    C->>SF: Choose "Placeholder (Demo)"
    SF->>O: POST order (placeholder)
    O->>M: Create draft order
    SF->>P: POST { storefrontOrderId }
    P->>M: Convert draft → order, mark paid
    P-->>SF: ok
    SF-->>C: Redirect to /checkout/success
```

### Going live

Replace the placeholder in [`src/app/api/payments/`](src/app/api/payments/) with
your provider of choice. Medusa has first-party support for Stripe and others;
wire the provider **server-side** and point the checkout's payment step at it.
Search the code for `PAYMENT_PROVIDER` and the `placeholder` payment route for
the seams.

---

## Project structure

```
.
├── src/                       # Next.js storefront (App Router)
│   ├── app/                   # routes: shop, cart, checkout, account, content, api/
│   ├── components/            # UI components
│   ├── config/brand.ts        # env-driven brand config (single source of truth)
│   ├── data/                  # product fetch/shape helpers
│   └── lib/                   # medusa client, mailer, shipping, payment helpers
├── medusa/                    # Medusa 2.x backend
│   └── src/
│       ├── api/               # custom API routes
│       ├── modules/           # custom modules
│       ├── subscribers/       # event subscribers (order lifecycle → email)
│       ├── workflows/         # custom workflows
│       └── scripts/seed.ts    # sample store: region, shipping, 8 products
├── public/                    # logo and placeholder product images
├── docs/screenshots/          # README screenshots
├── scripts/                   # ops helpers (deploy, stale-draft cleanup)
├── build-all.sh               # build backend + storefront
└── .env.example               # storefront env template
```

---

## Make it yours

| To change… | Edit |
|---|---|
| Store name, tagline, colours, currency, socials | `.env.local` / `.env` (see [`src/config/brand.ts`](src/config/brand.ts)) |
| Shipping country, currency, locale, dispatch cutoff, free-shipping threshold | `NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_*SHIPPING*` in `.env.local` (see [`src/config/region.ts`](src/config/region.ts)). Keep the currency the same as your Medusa region's. |
| Home page reviews | [`src/data/testimonials.ts`](src/data/testimonials.ts) — ships with labelled samples; replace them or empty the array |
| Products | Medusa admin, or [`medusa/src/scripts/seed.ts`](medusa/src/scripts/seed.ts) |
| Home / about / FAQ / policies copy | `src/app/*/page.tsx` |
| Logo & imagery | `public/brand/logo-mark.svg`, `public/images/` |
| Payment provider | [`src/app/api/payments/`](src/app/api/payments/) |

Branding is intentionally env-driven — for most cosmetic changes you only touch
`.env`, no code.

### Known limitations

- **One variant per product.** The storefront sells each product's first
  variant and has no size or colour picker yet, so the sample catalog uses
  single-variant products.
- **No card payments out of the box.** Checkout offers bank transfer and a demo
  payment; wire a real provider before taking money (see
  [Going live](#going-live)).

---

## Deployment

- **Storefront** — deploys to any Node host or Vercel. Set the same env vars
  from `.env.example` in your host's dashboard.
- **Backend** — deploy Medusa to any Node host with a managed PostgreSQL (and
  optional Redis). See the [Medusa deployment docs](https://docs.medusajs.com/deployments).
- Point the storefront's `MEDUSA_BACKEND_URL` at your deployed backend.

---

## Contributing

Issues and PRs are welcome. Please keep changes typed (`npx tsc --noEmit` must
stay clean) and run `npm run lint` before opening a PR. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

---

## License

[MIT](./LICENSE) © Tejas Karan Agrawal. Use it, fork it, ship your store.

---

<div align="center">

*Built from a real, live storefront and opened up as a starting point.*
**If it saved you time, a ⭐ is appreciated.**

</div>
