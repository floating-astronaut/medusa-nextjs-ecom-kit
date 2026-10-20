import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/account-nav";
import { SiteHeader } from "@/components/site-header";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/medusa-customer";
import { formatMoney, region } from "@/config/region";

export const dynamic = "force-dynamic";

function money(n: number, currency?: string) {
  return formatMoney(n, currency);
}

export default async function OrdersPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");
  const orders = await getCustomerOrders();
  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-10">
          <AccountNav activeHref="/account/orders" customerName={displayName} customerEmail={customer.email} />

          <div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-olive)]">Orders</p>
            <h1 className="mt-5 font-display text-4xl leading-none text-[var(--color-forest)] sm:text-5xl">
              {orders.length === 0 ? "Nothing yet." : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
            </h1>

            {orders.length === 0 ? (
              <div className="mt-8 rounded-[1.2rem] border border-dashed border-[var(--color-line)] bg-white/70 p-8 text-center">
                <p className="text-sm text-[var(--color-muted)]">When you place an order, it&rsquo;ll show here.</p>
                <Link
                  href="/shop"
                  className="mt-5 inline-flex rounded-full bg-[var(--color-forest)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] !text-white"
                >
                  Browse the shop
                </Link>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-[var(--color-line)]">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-white/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-forest)]">Order #{order.display_id}</p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {new Date(order.created_at).toLocaleDateString(region.locale, { year: "numeric", month: "short", day: "numeric" })} · {order.items?.length ?? 0} items
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-[var(--color-panel)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-forest)]">
                        {order.status}
                      </span>
                      <span className="font-semibold text-[var(--color-forest)]">{money(order.total, order.currency_code)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
