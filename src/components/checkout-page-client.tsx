"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AddressAutocomplete, type AddressParts } from "@/components/checkout/address-autocomplete";
import { FreeShippingBar } from "@/components/free-shipping-bar";
import { useOrder } from "@/components/order-provider";
import { computeShippingFee, isFreeShipping } from "@/lib/shipping";
import { formatMoney, region } from "@/config/region";

const inputClass =
  "mt-2 w-full rounded-[1.1rem] border border-[var(--color-line)] bg-white px-4 py-3.5 text-[var(--color-forest)] outline-none transition focus:border-[var(--color-clay)] focus:ring-2 focus:ring-[rgba(168,93,59,0.15)]";
const labelClass =
  "text-[10px] uppercase tracking-[0.24em] text-[var(--color-muted)]";

function SectionHeader({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-forest)] text-[12px] font-bold !text-white">
        {step}
      </span>
      <div>
        <p className="font-display text-2xl leading-none text-[var(--color-forest)]">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function TrustBadgeRow() {
  const items = [
    { icon: "🔒", label: "Secure checkout" },
    { icon: "📦", label: "Tracked shipping" },
    { icon: "✦", label: `Shipping to ${region.countryName}` },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)]"
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

type SubmissionState = {
  ok: boolean;
  storefrontOrderId: string;
  createdAt: string;
  paymentMethod?: "bank_transfer" | "placeholder" | "review" | null;
  paymentReference?: string | null;
  payToEmail?: string | null;
  shippingFee?: number;
  orderTotal?: number;
} | null;

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  message: "",
};

function composeAddress(form: typeof emptyForm) {
  return [
    form.addressLine1,
    form.addressLine2,
    [form.city, form.province, form.postalCode].filter(Boolean).join(", "),
    region.countryName,
  ]
    .filter(Boolean)
    .join("\n");
}

export function CheckoutPageClient() {
  const { items, itemCount, total, removeItem, updateQuantity, clearItems } = useOrder();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartingPlaceholder, setIsStartingPlaceholder] = useState(false);
  const [isStartingBankTransfer, setIsStartingBankTransfer] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.customer) return;
        setForm((prev) => ({
          ...prev,
          fullName:
            prev.fullName ||
            [data.customer.first_name, data.customer.last_name].filter(Boolean).join(" ").trim(),
          email: prev.email || data.customer.email || "",
          phone: prev.phone || data.customer.phone || "",
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const buildPayload = (paymentMethod: "bank_transfer" | "placeholder" | "review" = "review", storefrontOrderId?: string) => {
    const shippingFee = computeShippingFee(total);
    return {
      ...(storefrontOrderId ? { storefrontOrderId } : {}),
      paymentMethod,
      customerName: form.fullName,
      customerEmail: form.email,
      customerPhone: form.phone,
      customerAddress: composeAddress(form),
      shippingAddress: {
        address_1: form.addressLine1,
        address_2: form.addressLine2,
        city: form.city,
        province: form.province,
        postal_code: form.postalCode,
        country_code: region.countryCode.toLowerCase(),
      },
      customerMessage: form.message,
      products: items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        variantLabel: item.variantLabel,
      })),
      subtotal: total,
      shippingFee,
      orderTotal: total + shippingFee,
    };
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (items.length === 0) nextErrors.items = "Add at least one product before submitting.";
    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!form.addressLine1.trim()) nextErrors.addressLine1 = "Street address is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.postalCode.trim()) nextErrors.postalCode = "Postal code is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createOrder = async (paymentMethod: "bank_transfer" | "placeholder" | "review" = "review", storefrontOrderId?: string) => {
    const orderPayload = buildPayload(paymentMethod, storefrontOrderId);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to submit order.");
    }

    return (await response.json()) as SubmissionState;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmission(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = await createOrder("review");
      setSubmission(payload);
      setForm(emptyForm);
      setErrors({});
      await clearItems();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Unable to submit order.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startBankTransferCheckout = async () => {
    setSubmission(null);
    if (!validate()) return;

    setIsStartingBankTransfer(true);
    try {
      const payload = await createOrder("bank_transfer");
      setSubmission(payload);
      setForm(emptyForm);
      setErrors({});
      await clearItems();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Unable to start bank transfer checkout.",
      });
    } finally {
      setIsStartingBankTransfer(false);
    }
  };

  const startPlaceholderCheckout = async () => {
    setSubmission(null);

    if (!validate()) {
      return;
    }

    setIsStartingPlaceholder(true);
    try {
      const order = await createOrder("placeholder");
      if (!order?.storefrontOrderId) {
        throw new Error("Order was not created.");
      }

      const response = await fetch("/api/payments/placeholder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefrontOrderId: order.storefrontOrderId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to complete placeholder checkout.");
      }

      await clearItems();
      window.location.assign("/checkout/success");
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Unable to complete placeholder checkout.",
      });
    } finally {
      setIsStartingPlaceholder(false);
    }
  };

  if (submission) {
    const isBankTransfer = submission.paymentMethod === "bank_transfer" && submission.paymentReference;
    return (
      <section className="mx-auto max-w-4xl px-6 py-14 lg:px-10 lg:py-20">
        <div className="rounded-[2.4rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-8 lg:p-12">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--color-olive)]">
              {isBankTransfer ? "Action required" : "Order received"}
            </p>
            <h1 className="mt-6 font-display text-5xl leading-none text-[var(--color-forest)] sm:text-6xl">
              {isBankTransfer ? "Send your bank transfer." : "We received your order."}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
              Order <span className="text-[var(--color-clay)]">{submission.storefrontOrderId}</span>{" "}
              {isBankTransfer
                ? "is waiting on your bank transfer. Once it lands, we approve the order and dispatch the parcel the same business day when timing allows."
                : "was logged at " +
                  new Date(submission.createdAt).toLocaleString() +
                  ". We’ll review stock, confirm the payment path, and email next steps shortly."}
            </p>
          </div>

          {isBankTransfer ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-[1.5rem] border-2 border-[var(--color-clay)] bg-white p-6 sm:p-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-clay)]">Bank transfer details</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Amount</p>
                  <p className="mt-1 text-3xl font-bold text-[var(--color-clay)]">
                    {formatMoney(submission.orderTotal ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Send to</p>
                  <a
                    href={`mailto:${submission.payToEmail ?? ""}`}
                    className="mt-1 block text-lg font-semibold text-[var(--color-forest)] underline decoration-[var(--color-clay)]"
                  >
                    {submission.payToEmail}
                  </a>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    Reference (put in the message)
                  </p>
                  <p className="mt-2 inline-block rounded-md bg-[var(--color-forest)] px-4 py-2 font-mono text-xl font-bold tracking-[0.18em] text-white">
                    {submission.paymentReference}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Security answer</p>
                  <p className="mt-1 text-base text-[var(--color-forest)]">
                    Use the reference{" "}
                    <code className="rounded bg-[var(--color-panel)] px-2 py-0.5">{submission.paymentReference}</code>
                  </p>
                </div>
              </div>
              <p className="mt-6 text-xs leading-6 text-[var(--color-muted)]">
                We&apos;ve also emailed these details to {submission.ok ? "you" : "your inbox"}. The payment
                address is auto-deposit only — replies there are not read.
              </p>
            </div>
          ) : null}

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/shop"
              className="rounded-full bg-[var(--color-forest)] px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] !text-white"
            >
              Keep shopping
            </Link>
            <button
              type="button"
              onClick={() => setSubmission(null)}
              className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-forest)]"
            >
              Place another order
            </button>
          </div>
        </div>
      </section>
    );
  }

  const shipping = computeShippingFee(total);
  const grandTotal = total + shipping;
  const free = isFreeShipping(total);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-20">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
        <div className="rounded-[1.6rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-5 sm:rounded-[2.2rem] sm:p-7 lg:p-10">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-olive)] sm:tracking-[0.35em]">Checkout</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-[var(--color-forest)] sm:mt-5 sm:text-5xl sm:leading-none lg:text-6xl">
            Review the order.
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:mt-5 sm:text-base sm:leading-8">
            Confirm your items, address, and preferred payment method. Bank transfer works best for most buyers; the placeholder checkout is a demo you can wire to any provider.
          </p>

          {items.length > 0 ? (
            <div className="mt-6">
              <FreeShippingBar subtotal={total} variant="page" />
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {items.length > 0 ? items.map((item) => (
              <div key={item.lineItemId} className="rounded-[1.1rem] border border-[var(--color-line)] bg-white/80 p-4 sm:rounded-[1.4rem] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-olive)]">{item.category}</p>
                    <h2 className="mt-1.5 font-display text-xl leading-tight text-[var(--color-forest)] sm:text-2xl">{item.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {item.variantLabel ? (
                        <span className="whitespace-nowrap">{item.variantLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeItem(item.lineItemId)}
                    className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted)] transition hover:text-[var(--color-clay)]"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => void updateQuantity(item.lineItemId, item.quantity - 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-base text-[var(--color-forest)] transition hover:bg-white"
                    >
                      −
                    </button>
                    <span className="min-w-7 text-center text-sm font-semibold text-[var(--color-forest)]">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => void updateQuantity(item.lineItemId, item.quantity + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-base text-[var(--color-forest)] transition hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-base font-semibold text-[var(--color-clay)] sm:text-lg">{formatMoney(item.price * item.quantity)}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-[1.4rem] border border-[var(--color-line)] bg-white/70 p-6 text-center sm:p-8">
                <p className="text-sm leading-7 text-[var(--color-muted)]">Nothing in your cart yet. Head to the shop and pick something out.</p>
                <Link href="/shop" className="mt-5 inline-flex rounded-full bg-[var(--color-forest)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] !text-white">
                  Browse the shop
                </Link>
              </div>
            )}
          </div>

          {items.length > 0 ? (
            <div className="mt-6 rounded-[1.2rem] border border-[var(--color-line)] bg-white/80 p-4 sm:rounded-[1.4rem] sm:p-5">
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    Subtotal · {itemCount} {itemCount === 1 ? "item" : "items"}
                  </dt>
                  <dd className="text-base font-semibold text-[var(--color-forest)]">{formatMoney(total)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Shipping</dt>
                  <dd
                    className={
                      free
                        ? "text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]"
                        : "text-base font-semibold text-[var(--color-forest)]"
                    }
                  >
                    {free ? "Free" : formatMoney(shipping)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Order total</dt>
                  <dd className="text-2xl font-bold text-[var(--color-clay)]">{formatMoney(grandTotal)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-[1.6rem] border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:space-y-6 sm:rounded-[2.2rem] sm:p-7 lg:p-10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-forest)]">
              <span aria-hidden>🔒</span>
              Secure checkout
            </div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
              We never store cards
            </p>
          </div>

          {/* Section 1 — contact */}
          <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/70 p-4 sm:rounded-[1.6rem] sm:p-6">
            <SectionHeader step="1" title="Contact details" subtitle="So we can confirm and send tracking." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Full name</span>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  autoComplete="name"
                  className={inputClass}
                />
                {errors.fullName ? <p className="mt-2 text-xs text-red-700">{errors.fullName}</p> : null}
              </label>
              <label className="block">
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  className={inputClass}
                />
                {errors.email ? <p className="mt-2 text-xs text-red-700">{errors.email}</p> : null}
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Phone</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  autoComplete="tel"
                  inputMode="tel"
                  className={inputClass}
                />
                {errors.phone ? <p className="mt-2 text-xs text-red-700">{errors.phone}</p> : null}
              </label>
            </div>
          </section>

          {/* Section 2 — shipping address */}
          <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/70 p-4 sm:rounded-[1.6rem] sm:p-6">
            <SectionHeader
              step="2"
              title="Shipping address"
              subtitle={`Start typing to autocomplete. Shipping to ${region.countryName}.`}
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-6">
              <label className="block sm:col-span-6">
                <span className={labelClass}>Street address</span>
                <AddressAutocomplete
                  value={form.addressLine1}
                  onChange={(value) => setForm((prev) => ({ ...prev, addressLine1: value }))}
                  onSelect={(parts: AddressParts) => {
                    setForm((prev) => ({
                      ...prev,
                      addressLine1: parts.address_1 || prev.addressLine1,
                      city: parts.city || prev.city,
                      province: parts.province || prev.province,
                      postalCode: parts.postal_code || prev.postalCode,
                    }));
                  }}
                  placeholder="123 Main St"
                  inputClassName={inputClass}
                />
                {errors.addressLine1 ? <p className="mt-2 text-xs text-red-700">{errors.addressLine1}</p> : null}
              </label>
              <label className="block sm:col-span-6">
                <span className={labelClass}>Apartment, suite, unit (optional)</span>
                <input
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  autoComplete="address-line2"
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  autoComplete="address-level2"
                  className={inputClass}
                />
                {errors.city ? <p className="mt-2 text-xs text-red-700">{errors.city}</p> : null}
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>State / province / region</span>
                <input
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  autoComplete="address-level1"
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Postal code</span>
                <input
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  autoComplete="postal-code"
                  inputMode="text"
                  maxLength={20}
                  className={inputClass}
                />
                {errors.postalCode ? <p className="mt-2 text-xs text-red-700">{errors.postalCode}</p> : null}
              </label>
            </div>
          </section>

          {/* Section 3 — order notes */}
          <section className="rounded-[1.2rem] border border-[var(--color-line)] bg-white/70 p-4 sm:rounded-[1.6rem] sm:p-6">
            <SectionHeader step="3" title="Order notes" subtitle="Optional — delivery instructions, timing, anything else." />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              placeholder="Leave with the front desk if no one is home."
              className={`${inputClass} mt-4`}
            />
          </section>

          {/* Section 4 — payment */}
          <section className="rounded-[1.4rem] border border-[var(--color-line)] bg-[var(--color-forest)] p-4 !text-white sm:rounded-[1.6rem] sm:p-6 lg:p-7">
            <SectionHeader step="4" title="Choose payment" subtitle="Bank transfer is the fastest path. The placeholder checkout is a demo — wire a real provider before taking money." />
            <div className="mt-5 space-y-3 sm:space-y-4">
              {/* Bank transfer */}
              <button
                type="button"
                onClick={() => void startBankTransferCheckout()}
                disabled={isSubmitting || isStartingPlaceholder || isStartingBankTransfer}
                className="group block w-full rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-4 text-left transition hover:bg-white/14 disabled:opacity-60 sm:px-5"
              >
                <div className="flex items-start gap-3 sm:items-center">
                  <span aria-hidden className="mt-0.5 text-xl shrink-0 sm:mt-0 sm:text-2xl">🏦</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold uppercase tracking-[0.18em] !text-white sm:tracking-[0.2em]">
                        Bank Transfer
                      </span>
                      <span className="rounded-full bg-[var(--color-clay)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] !text-white">
                        Recommended
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-white/72">
                      Manual bank transfer. We email the reference + account details to complete your order.
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)] sm:inline-flex">
                    {isStartingBankTransfer ? "Working…" : "Select"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end text-[11px] uppercase tracking-[0.22em] text-white/80 sm:hidden">
                  {isStartingBankTransfer ? "Working…" : (
                    <>
                      Select <span aria-hidden className="ml-1.5">→</span>
                    </>
                  )}
                </div>
              </button>

              {/* Placeholder (Demo) */}
              <button
                type="button"
                onClick={() => void startPlaceholderCheckout()}
                disabled={isSubmitting || isStartingPlaceholder || isStartingBankTransfer}
                className="group block w-full rounded-[1.2rem] border border-white/14 bg-white/8 px-4 py-4 text-left transition hover:bg-white/14 disabled:opacity-60 sm:px-5"
              >
                <div className="flex items-start gap-3 sm:items-center">
                  <span aria-hidden className="mt-0.5 text-xl shrink-0 sm:mt-0 sm:text-2xl">🧪</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold uppercase tracking-[0.18em] !text-white sm:tracking-[0.2em]">
                        Placeholder checkout (Demo)
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-white/72">
                      No real charge — marks the order as paid so you can test the flow. Wire a real payment provider before taking money.
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-forest)] sm:inline-flex">
                    {isStartingPlaceholder ? "Working…" : "Select"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end text-[11px] uppercase tracking-[0.22em] text-white/80 sm:hidden">
                  {isStartingPlaceholder ? "Working…" : (
                    <>
                      Select <span aria-hidden className="ml-1.5">→</span>
                    </>
                  )}
                </div>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isStartingPlaceholder || isStartingBankTransfer}
                className="w-full rounded-[1.2rem] border border-white/14 bg-transparent px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/8 disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Or contact us — we'll reach out"}
              </button>
            </div>

            <div className="mt-5 border-t border-white/12 pt-4 text-[11px] leading-6 text-white/64 sm:mt-6 sm:pt-5">
              Same-day dispatch on orders paid before {region.dispatchCutoff}. Your
              details are encrypted in transit and never sold.
            </div>
          </section>

          <TrustBadgeRow />

          {errors.items ? <p className="text-sm text-red-700">{errors.items}</p> : null}
          {errors.submit ? <p className="text-sm text-red-700">{errors.submit}</p> : null}
        </form>
      </div>
    </section>
  );
}
