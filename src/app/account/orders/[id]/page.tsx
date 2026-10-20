import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/components/account/account-nav";
import { SiteHeader } from "@/components/site-header";
import { getCurrentCustomer, getCustomerOrder } from "@/lib/medusa-customer";
import { formatMoney, region } from "@/config/region";

export const dynamic = "force-dynamic";

function money(n: number, currency?: string) {
  return formatMoney(n, currency);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/login");
  const order = await getCustomerOrder(id);
  const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr] lg:gap-10">
          <AccountNav activeHref="/account/orders" customerName={displayName} customerEmail={customer.email} />

          <div className="rounded-[1.8rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-8">
            <Link href="/account/orders" className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-olive)]">
              ← All orders
            </Link>

            {!order ? (
              <div className="mt-8 rounded-[1.2rem] border border-dashed border-[var(--color-line)] bg-white/70 p-10 text-center">
                <p className="text-sm text-[var(--color-muted)]">Order not found.</p>
              </div>
            ) : (
              <>
                <h1 className="mt-5 font-display text-4xl leading-none text-[var(--color-forest)] sm:text-5xl">
                  Order #{order.display_id}
                </h1>
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Placed{" "}
                  {new Date(order.created_at).toLocaleString(region.locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {order.status}
                  {order.payment_status ? ` · ${order.payment_status}` : ""}
                </p>

                <div className="mt-8 rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 p-6">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-olive)]">Items</p>
                  <div className="mt-4 divide-y divide-[var(--color-line)]">
                    {(order.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-forest)]">{item.title}</p>
                          {item.subtitle ? <p className="text-xs text-[var(--color-muted)]">{item.subtitle}</p> : null}
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {item.quantity} × {money(item.unit_price, order.currency_code)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-forest)]">
                          {money(item.unit_price * item.quantity, order.currency_code)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--color-line)] pt-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Total</p>
                    <p className="text-xl font-bold text-[var(--color-clay)]">
                      {money(order.total, order.currency_code)}
                    </p>
                  </div>
                </div>

                {order.shipping_address ? (
                  <div className="mt-6 rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 p-6">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-olive)]">Ship to</p>
                    <div className="mt-3 text-sm leading-7 text-[var(--color-forest)]">
                      {[order.shipping_address.first_name, order.shipping_address.last_name].filter(Boolean).join(" ")}
                      <br />
                      {order.shipping_address.address_1}
                      {order.shipping_address.address_2 ? `, ${order.shipping_address.address_2}` : ""}
                      <br />
                      {[order.shipping_address.city, order.shipping_address.province, order.shipping_address.postal_code].filter(Boolean).join(", ")}
                      {order.shipping_address.phone ? (
                        <>
                          <br />
                          {order.shipping_address.phone}
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {order.metadata?.payment_reference ? (
                  <div className="mt-6 rounded-[1.2rem] border-2 border-[var(--color-clay)] bg-white p-6">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-clay)]">Payment reference</p>
                    <p className="mt-3 inline-block rounded-md bg-[var(--color-forest)] px-4 py-2 font-mono text-lg font-bold tracking-[0.18em] text-white">
                      {String(order.metadata.payment_reference)}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
