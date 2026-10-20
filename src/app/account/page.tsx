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

function statusLabel(order: { status: string; payment_status?: string | null }) {
  if (order.status === "completed") return "Completed";
  if (order.status === "archived") return "Archived";
  if (order.payment_status === "captured") return "Paid";
  if (order.payment_status === "awaiting") return "Awaiting payment";
  return order.status.charAt(0).toUpperCase() + order.status.slice(1);
}

export default async function AccountOverviewPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");
  const orders = await getCustomerOrders();
  const recent = orders.slice(0, 5);

  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-10">
          <AccountNav activeHref="/account" customerName={displayName} customerEmail={customer.email} />

          <div className="space-y-6">
            <div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-olive)]">Account overview</p>
              <h1 className="mt-5 font-display text-4xl leading-none text-[var(--color-forest)] sm:text-5xl">
                Welcome back, {customer.first_name || "friend"}.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                Track your orders, update your details, and pick up where you left off.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="rounded-full bg-[var(--color-forest)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] !text-white"
                >
                  Browse the shop
                </Link>
                <Link
                  href="/account/profile"
                  className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-forest)]"
                >
                  Edit profile
                </Link>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)]">Recent orders</p>
                  <h2 className="mt-3 font-display text-3xl text-[var(--color-forest)]">Your latest activity</h2>
                </div>
                {orders.length > 5 ? (
                  <Link href="/account/orders" className="text-xs uppercase tracking-[0.22em] text-[var(--color-clay)]">
                    View all →
                  </Link>
                ) : null}
              </div>

              {recent.length === 0 ? (
                <div className="mt-6 rounded-[1.2rem] border border-dashed border-[var(--color-line)] bg-white/70 p-8 text-center">
                  <p className="text-sm text-[var(--color-muted)]">No orders yet.</p>
                  <Link
                    href="/shop"
                    className="mt-5 inline-flex rounded-full bg-[var(--color-forest)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] !text-white"
                  >
                    Browse the shop
                  </Link>
                </div>
              ) : (
                <div className="mt-5 divide-y divide-[var(--color-line)]">
                  {recent.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-white/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-forest)]">Order #{order.display_id}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {new Date(order.created_at).toLocaleDateString(region.locale, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {order.items?.length ?? 0} items
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="rounded-full bg-[var(--color-panel)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-forest)]">
                          {statusLabel(order)}
                        </span>
                        <span className="font-semibold text-[var(--color-forest)]">
                          {money(order.total, order.currency_code)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
