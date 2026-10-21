# Backend (Medusa 2)

The commerce backend for this kit: products, prices, regions, carts, orders,
customers and the admin dashboard. The Next.js storefront in the repo root
talks to it through the Store API (with a publishable key) and the Admin API
(for draft orders at checkout).

## Run it locally

You need Node 20+ and a PostgreSQL database. Redis is optional; without it
Medusa uses its in-memory event bus and cache, which is fine for development.

```bash
cp .env.template .env          # set DATABASE_URL
npm install
npx medusa db:migrate
npm run seed
npx medusa user -e admin@example.com -p change_me
npm run dev
```

- API: http://localhost:9000
- Admin dashboard: http://localhost:9000/app (sign in with the user you created)

## What the seed creates

[`src/scripts/seed.ts`](src/scripts/seed.ts) sets up a complete sample store:

| Piece | Value |
|---|---|
| Currency | USD (store default) |
| Region | United States, system payment provider, tax region |
| Stock location | Main Warehouse, New York, linked to manual fulfillment |
| Shipping | Standard ($15) and Express ($30) for the US |
| Sales channel | Default Sales Channel, linked to a publishable key |
| Categories | Apparel, Accessories, Home, Stationery |
| Products | 8 products; the tee (size × colour), crewneck (size) and beanie (colour) have variants. Stock is real Medusa inventory, and XL / Natural tee starts sold out |

Each product's `metadata` carries `category`, `badge`, optionally `pack_count`,
and `option_order` (display order of options and their values, which Medusa
doesn't keep). The storefront reads these for product cards and the variant
picker.

When it finishes, the seed prints `MEDUSA_PUBLISHABLE_KEY`, `MEDUSA_REGION_ID`,
`NEXT_PUBLIC_MEDUSA_REGION_ID` and `MEDUSA_SALES_CHANNEL_ID` for the
storefront's `.env.local`.

To seed a different country or currency, edit `CURRENCY`, `COUNTRY`,
`REGION_NAME` and `WAREHOUSE` at the top of the file. Prices are in whole
currency units (`28` = $28.00). The seed is meant for an empty database; run
it once.

## Customizations in this folder

| Path | What it does |
|---|---|
| `src/subscribers/` | Order lifecycle events → webhook to the storefront, which sends the customer emails |
| `src/api/` | Example custom routes (`/store/custom`, `/admin/custom`) to build on |
| `src/workflows/`, `src/modules/`, `src/links/`, `src/jobs/` | Empty extension points, each with Medusa's README |
| `src/admin/` | Admin dashboard extensions (i18n scaffold) |
| `integration-tests/http/` | HTTP integration tests, starting with a health check |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Medusa with reload |
| `npm run build` | Build the server and admin into `.medusa/` (also generates the types the seed imports) |
| `npm run start` | Start the built server |
| `npm run seed` | Load the sample store |
| `npm run test:integration:http` | Run the HTTP integration tests |

## Deploying

Run Medusa on any Node host with a managed PostgreSQL and, ideally, Redis.
Set strong `JWT_SECRET` and `COOKIE_SECRET` values and point `STORE_CORS`,
`ADMIN_CORS` and `AUTH_CORS` at your real domains. See the
[Medusa deployment docs](https://docs.medusajs.com/learn/deployment).
