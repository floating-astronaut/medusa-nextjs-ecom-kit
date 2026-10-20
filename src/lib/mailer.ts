import nodemailer, { type Transporter } from "nodemailer";
import { brand } from "@/config/brand";
import { formatMoney, region } from "@/config/region";

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  orderInbox: string;
  siteUrl: string;
};

let cachedConfig: MailerConfig | null | undefined;
let cachedTransport: Transporter | null = null;

function loadConfig(): MailerConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    cachedConfig = null;
    return null;
  }

  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  const from = process.env.SMTP_FROM ?? `${brand.name} <${user}>`;
  const orderInbox = process.env.ORDER_INBOX ?? user;
  const siteUrl = brand.siteUrl;

  cachedConfig = { host, port, user, pass, from, orderInbox, siteUrl };
  return cachedConfig;
}

function getTransport(config: MailerConfig): Transporter {
  if (cachedTransport) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  return cachedTransport;
}

export function isMailerConfigured() {
  return loadConfig() !== null;
}

type OrderPayload = {
  storefrontOrderId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerMessage: string;
  subtotal?: number;
  shippingFee?: number;
  freeShipping?: boolean;
  orderTotal: number;
  products: Array<{
    name: string;
    category?: string;
    quantity: number;
    price: number;
    packageLabel?: string;
  }>;
  paymentMethod?: "bank_transfer" | "placeholder" | "review" | null;
  paymentReference?: string | null;
};

// Email colours mirror the storefront palette so transactional mail matches
// the brand. Always pulled from the live brand config so a per-shop deploy
// emails in that shop's palette automatically.
const COLORS = {
  paper: brand.colors.paper,
  panel: brand.colors.panel,
  forest: brand.colors.forest,
  forestDeep: brand.colors.forestDeep,
  clay: brand.colors.clay,
  olive: brand.colors.olive,
  muted: brand.colors.muted,
  line: brand.colors.line,
  soft: "#ffffff",
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(name: string) {
  return (name.trim().split(/\s+/)[0] || "friend").replace(/[^\p{L}\p{N}\-']/gu, "");
}

function money(value: number) {
  return formatMoney(value);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  try {
    return d.toLocaleString(region.locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d.toISOString();
  }
}

function renderOrderLines(order: OrderPayload) {
  return order.products
    .map((item) => {
      const size = item.packageLabel ? ` · ${item.packageLabel}` : "";
      return `• ${item.quantity}× ${item.name}${size} — ${money(item.price * item.quantity)}`;
    })
    .join("\n");
}

function renderItemRows(order: OrderPayload) {
  return order.products
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      const size = item.packageLabel ? ` · ${escapeHtml(item.packageLabel)}` : "";
      const category = item.category ? escapeHtml(item.category) : "";
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid ${COLORS.line};">
            ${category ? `<div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.olive};margin-bottom:4px;">${category}</div>` : ""}
            <div style="font-size:15px;font-weight:600;color:${COLORS.forest};line-height:1.35;">
              ${escapeHtml(item.name)}${size}
            </div>
            <div style="font-size:12px;color:${COLORS.muted};margin-top:4px;">Qty ${item.quantity} · ${money(item.price)} each</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid ${COLORS.line};text-align:right;vertical-align:top;white-space:nowrap;font-size:15px;font-weight:600;color:${COLORS.forest};">
            ${money(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");
}

function wrapEmail(body: string, preheader: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${brand.name}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.panel};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${COLORS.forest};">
  <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.panel};padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.paper};border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(20,33,25,0.08);">
          ${body}
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:${COLORS.muted};letter-spacing:0.12em;text-transform:uppercase;">
          ${brand.name} · Shipping ${brand.countryName}-wide
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function bankTransferBlockHtml(order: OrderPayload) {
  if (order.paymentMethod !== "bank_transfer" || !order.paymentReference) return "";
  const email = brand.paymentEmail;
  const securityQuestion = process.env.PAYMENT_SECURITY_QUESTION ?? "What is your order reference?";
  return `
    <tr>
      <td style="padding:4px 32px 0;">
        <div style="border:2px solid ${COLORS.clay};border-radius:14px;overflow:hidden;">
          <div style="background:${COLORS.clay};color:#fff;padding:16px 20px;">
            <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.78);">Action required</div>
            <div style="margin-top:4px;font-size:18px;font-weight:700;">Send your bank transfer to complete the order</div>
          </div>
          <div style="padding:20px;background:#fff7ee;font-size:14px;line-height:1.7;color:${COLORS.forest};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;width:140px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.muted};">Amount</td>
                <td style="padding:4px 0;font-size:22px;font-weight:700;color:${COLORS.clay};">${money(order.orderTotal)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.muted};">Send to</td>
                <td style="padding:4px 0;font-size:16px;font-weight:600;">
                  <a href="mailto:${escapeHtml(email)}" style="color:${COLORS.forest};text-decoration:none;">${escapeHtml(email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.muted};">Reference</td>
                <td style="padding:4px 0;">
                  <span style="display:inline-block;padding:6px 12px;background:${COLORS.forest};color:#fff;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:0.18em;border-radius:6px;">${escapeHtml(order.paymentReference!)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COLORS.muted};vertical-align:top;">Security<br/>question</td>
                <td style="padding:4px 0;font-size:14px;line-height:1.55;">
                  <div>${escapeHtml(securityQuestion)}</div>
                  <div style="margin-top:4px;"><strong>Answer:</strong> <code style="background:${COLORS.panel};padding:2px 6px;border-radius:4px;">${escapeHtml(order.paymentReference!)}</code></div>
                </td>
              </tr>
            </table>
            <div style="margin-top:14px;padding-top:14px;border-top:1px dashed ${COLORS.line};font-size:12px;line-height:1.6;color:${COLORS.muted};">
              <strong style="color:${COLORS.forest};">Important:</strong> include the reference number in the transfer details so we can match your payment to this order. Once the transfer confirms, we'll ship same-day (before ${region.dispatchCutoff}).
              <br /><br />
              Do not reply to the payment address — it's a receive-only auto-deposit inbox. Questions go to <a href="mailto:${brand.supportEmail}" style="color:${COLORS.forest};">${brand.supportEmail}</a>.
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function customerEmailHtml(order: OrderPayload, siteUrl: string) {
  const first = firstName(order.customerName);
  const itemRows = renderItemRows(order);
  const itemCount = order.products.reduce((n, item) => n + item.quantity, 0);

  const body = `
    <tr>
      <td style="background:${COLORS.forest};padding:28px 32px;color:#fff;">
        <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.6);">${brand.name}</div>
        <div style="margin-top:8px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.05;color:#fff;">Order received</div>
        <div style="margin-top:10px;font-size:13px;color:rgba(255,255,255,0.78);line-height:1.55;">
          Thanks, ${escapeHtml(first)} — we've logged your order and our team is on it.
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.soft};border:1px solid ${COLORS.line};border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;border-bottom:1px solid ${COLORS.line};">
              <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.muted};">Order number</div>
              <div style="margin-top:4px;font-size:18px;font-weight:600;color:${COLORS.clay};">${escapeHtml(order.storefrontOrderId)}</div>
            </td>
            <td style="padding:18px 20px;border-bottom:1px solid ${COLORS.line};border-left:1px solid ${COLORS.line};text-align:right;">
              <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.muted};">Placed</div>
              <div style="margin-top:4px;font-size:14px;color:${COLORS.forest};">${escapeHtml(formatDate(order.createdAt))}</div>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:18px 20px;">
              <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Your order (${itemCount} ${itemCount === 1 ? "item" : "items"})</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                ${itemRows}
                ${order.subtotal != null ? `
                <tr>
                  <td style="padding:14px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};">Subtotal</td>
                  <td style="padding:14px 0 0;text-align:right;font-size:14px;color:${COLORS.forest};">${money(order.subtotal)}</td>
                </tr>` : ""}
                ${order.shippingFee != null ? `
                <tr>
                  <td style="padding:6px 0 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.muted};">Shipping</td>
                  <td style="padding:6px 0 0;text-align:right;font-size:14px;color:${order.freeShipping ? COLORS.olive : COLORS.forest};font-weight:${order.freeShipping ? 700 : 400};">
                    ${order.freeShipping ? "FREE" : money(order.shippingFee)}
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:14px 0 0;border-top:1px solid ${COLORS.line};font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.muted};">Order total</td>
                  <td style="padding:14px 0 0;border-top:1px solid ${COLORS.line};text-align:right;font-size:22px;font-weight:700;color:${COLORS.clay};">${money(order.orderTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${bankTransferBlockHtml(order)}
    <tr>
      <td style="padding:20px 32px 0;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">What happens next</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
          ${[
            { n: "01", t: "We confirm payment", b: "For bank transfer we watch for your payment to land. Otherwise we'll send payment details shortly." },
            { n: "02", t: "We pack your order", b: brand.packagingPolicy },
            { n: "03", t: "You get tracking", b: "Tracking is emailed the moment your order leaves us." },
          ]
            .map(
              (step) => `
            <tr>
              <td width="42" valign="top" style="padding:4px 12px 4px 0;">
                <div style="width:32px;height:32px;border-radius:999px;background:${COLORS.panel};color:${COLORS.clay};font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;line-height:32px;text-align:center;">${step.n}</div>
              </td>
              <td valign="top" style="padding:4px 0 14px;">
                <div style="font-size:15px;font-weight:600;color:${COLORS.forest};">${step.t}</div>
                <div style="margin-top:3px;font-size:13px;line-height:1.55;color:${COLORS.muted};">${step.b}</div>
              </td>
            </tr>`,
            )
            .join("")}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:4px 32px 0;">
        <div style="padding:18px 20px;background:${COLORS.panel};border-radius:12px;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Delivering to</div>
          <div style="margin-top:8px;font-size:14px;color:${COLORS.forest};line-height:1.6;">
            <strong>${escapeHtml(order.customerName)}</strong><br />
            ${escapeHtml(order.customerAddress).replace(/\n/g, "<br />")}<br />
            ${escapeHtml(order.customerPhone)}
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 28px;">
        <div style="padding:18px 20px;background:${COLORS.forest};border-radius:12px;color:#fff;">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.6);">Need anything?</div>
          <div style="margin-top:6px;font-size:15px;line-height:1.55;color:#fff;">
            Reply to this email or reach us at
            <a href="mailto:${brand.supportEmail}" style="color:#fff;text-decoration:underline;">${brand.supportEmail}</a>.
            We answer within a few hours during business hours.
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;">
            <tr>
              <td style="background:#fff;border-radius:999px;">
                <a href="${escapeHtml(siteUrl)}/shop" style="display:inline-block;padding:11px 22px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.forest};text-decoration:none;font-weight:700;">Back to the menu</a>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <div style="font-size:11px;line-height:1.6;color:${COLORS.muted};">
          <br />
          Keep out of reach of children and pets.
        </div>
      </td>
    </tr>
  `;
  return wrapEmail(body, `Order ${order.storefrontOrderId} received — ${money(order.orderTotal)}`);
}

function ownerEmailHtml(order: OrderPayload) {
  const itemRows = renderItemRows(order);
  const itemCount = order.products.reduce((n, item) => n + item.quantity, 0);
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(order.customerAddress.replace(/\n/g, ", "))}`;
  const telHref = `tel:${order.customerPhone.replace(/[^\d+]/g, "")}`;

  const body = `
    <tr>
      <td style="background:${COLORS.clay};padding:24px 32px;color:#fff;">
        <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.76);">New order</div>
        <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.05;color:#fff;">
          ${escapeHtml(order.customerName)} · ${money(order.orderTotal)}
        </div>
        <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.86);">
          ${escapeHtml(order.storefrontOrderId)} · ${escapeHtml(formatDate(order.createdAt))}
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px 0;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Customer</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;background:${COLORS.soft};border:1px solid ${COLORS.line};border-radius:12px;">
          <tr>
            <td style="padding:16px 20px;font-size:14px;line-height:1.7;color:${COLORS.forest};">
              <strong>${escapeHtml(order.customerName)}</strong><br />
              <a href="mailto:${escapeHtml(order.customerEmail)}" style="color:${COLORS.clay};text-decoration:none;">${escapeHtml(order.customerEmail)}</a><br />
              <a href="${escapeHtml(telHref)}" style="color:${COLORS.forest};text-decoration:none;">${escapeHtml(order.customerPhone)}</a>
            </td>
            <td style="padding:16px 20px;border-left:1px solid ${COLORS.line};font-size:14px;line-height:1.6;color:${COLORS.forest};">
              <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.muted};margin-bottom:4px;">Ship to</div>
              ${escapeHtml(order.customerAddress).replace(/\n/g, "<br />")}<br />
              <a href="${escapeHtml(mapsHref)}" style="color:${COLORS.clay};font-size:11px;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">Open in maps →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px 0;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Items (${itemCount})</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;background:${COLORS.soft};border:1px solid ${COLORS.line};border-radius:12px;">
          <tr><td colspan="2" style="padding:4px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}
              <tr>
                <td style="padding:16px 0 6px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.muted};">Total</td>
                <td style="padding:16px 0 6px;text-align:right;font-size:20px;font-weight:700;color:${COLORS.clay};">${money(order.orderTotal)}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    ${
      order.paymentMethod === "bank_transfer" && order.paymentReference
        ? `<tr>
      <td style="padding:20px 32px 0;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Payment</div>
        <div style="margin-top:10px;padding:14px 18px;background:${COLORS.panel};border-left:3px solid ${COLORS.clay};border-radius:6px;font-size:14px;line-height:1.6;color:${COLORS.forest};">
          Customer chose <strong>Bank Transfer</strong>. Awaiting deposit of <strong>${money(order.orderTotal)}</strong> with reference <code style="background:#fff;padding:2px 6px;border-radius:4px;">${escapeHtml(order.paymentReference)}</code>.
        </div>
      </td>
    </tr>`
        : ""
    }
    ${
      order.customerMessage?.trim()
        ? `<tr>
      <td style="padding:20px 32px 0;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Notes from customer</div>
        <div style="margin-top:10px;padding:14px 18px;background:${COLORS.panel};border-left:3px solid ${COLORS.clay};border-radius:6px;font-size:14px;line-height:1.6;color:${COLORS.forest};">
          ${escapeHtml(order.customerMessage).replace(/\n/g, "<br />")}
        </div>
      </td>
    </tr>`
        : ""
    }
    <tr>
      <td style="padding:20px 32px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:${COLORS.forest};border-radius:999px;">
              <a href="mailto:${escapeHtml(order.customerEmail)}?subject=Re:%20${encodeURIComponent(order.storefrontOrderId)}" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#fff;text-decoration:none;font-weight:700;">Reply to customer</a>
            </td>
            <td width="10"></td>
            <td style="background:${COLORS.panel};border-radius:999px;">
              <a href="${brand.adminUrl}/app" style="display:inline-block;padding:12px 22px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.forest};text-decoration:none;font-weight:700;">Open admin</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  return wrapEmail(body, `${order.storefrontOrderId} · ${order.customerName} · ${money(order.orderTotal)}`);
}

type StageEmailInput = {
  to: string;
  subject: string;
  heading: string;
  preheader: string;
  intro: string;
  cta?: { label: string; href: string };
  extraHtml?: string;
  textBody: string;
};

function stageEmailHtml(input: StageEmailInput) {
  const body = `
    <tr>
      <td style="background:${COLORS.forest};padding:28px 32px;color:#fff;">
        <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.6);">${brand.name}</div>
        <div style="margin-top:8px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.1;color:#fff;">${escapeHtml(input.heading)}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px 0;font-size:15px;line-height:1.7;color:${COLORS.forest};">
        ${escapeHtml(input.intro).replace(/\n/g, "<br />")}
      </td>
    </tr>
    ${input.extraHtml ?? ""}
    ${
      input.cta
        ? `<tr><td style="padding:20px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:${COLORS.forest};border-radius:999px;">
              <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;padding:12px 24px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#fff;text-decoration:none;font-weight:700;">${escapeHtml(input.cta.label)}</a>
            </td></tr>
          </table>
        </td></tr>`
        : ""
    }
    <tr>
      <td style="padding:24px 32px 28px;">
        <div style="border-top:1px solid ${COLORS.line};padding-top:16px;font-size:12px;line-height:1.7;color:${COLORS.muted};">
          Questions? Reply to this email or reach us at
          <a href="mailto:${brand.supportEmail}" style="color:${COLORS.forest};">${brand.supportEmail}</a>.
        </div>
      </td>
    </tr>
  `;
  return wrapEmail(body, input.preheader);
}

async function sendStageEmail(input: StageEmailInput) {
  const config = loadConfig();
  if (!config) return { sent: false, reason: "SMTP not configured" } as const;
  const transporter = getTransport(config);
  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      replyTo: brand.supportEmail,
      subject: input.subject,
      text: input.textBody,
      html: stageEmailHtml(input),
    });
    return { sent: true } as const;
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) } as const;
  }
}

// Stage helpers ---------------------------------------------------------------
type StageBase = {
  customerEmail: string;
  customerName: string;
  orderDisplayId?: number | string;
  orderId?: string;
  orderTotal?: number;
  currencyCode?: string;
};

function displayIdLabel(input: StageBase) {
  if (input.orderDisplayId != null) return `#${input.orderDisplayId}`;
  if (input.orderId) return input.orderId;
  return "your order";
}

export function sendPaymentReceivedEmail(input: StageBase) {
  const first = firstName(input.customerName);
  const label = displayIdLabel(input);
  return sendStageEmail({
    to: input.customerEmail,
    subject: `[${label}] Payment confirmed — packing now`,
    heading: "Payment received.",
    preheader: `Payment confirmed for ${label}`,
    intro: `Hey ${first}, we got your payment for order ${label}. Your parcel is on the packing bench — we'll ping you the moment it leaves us with tracking details.`,
    textBody: `Hey ${first},\n\nWe got your payment for order ${label}. Packing now — tracking coming once it's out the door.\n\n${brand.name}`,
    cta: { label: "View your order", href: `${brand.siteUrl}/account/orders${input.orderId ? `/${input.orderId}` : ""}` },
  });
}

type ShippedInput = StageBase & {
  trackingCompany?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};

export function sendShippedEmail(input: ShippedInput) {
  const first = firstName(input.customerName);
  const label = displayIdLabel(input);
  const tracking = input.trackingNumber ?? null;
  const trackingHtml = tracking
    ? `<tr><td style="padding:18px 32px 0;">
      <div style="padding:18px 20px;background:${COLORS.panel};border-radius:12px;">
        <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COLORS.olive};">Tracking</div>
        <div style="margin-top:8px;font-size:18px;font-weight:700;color:${COLORS.forest};">${escapeHtml(tracking)}</div>
        ${input.trackingCompany ? `<div style="margin-top:4px;font-size:13px;color:${COLORS.muted};">via ${escapeHtml(input.trackingCompany)}</div>` : ""}
      </div>
    </td></tr>`
    : "";
  return sendStageEmail({
    to: input.customerEmail,
    subject: `[${label}] Shipped${tracking ? ` · ${tracking}` : ""}`,
    heading: "Your order is on the way.",
    preheader: `${label} shipped${tracking ? ` · ${tracking}` : ""}`,
    intro: `Good news, ${first} — ${label} just left us. ${brand.shippingPolicy}`,
    extraHtml: trackingHtml,
    cta: input.trackingUrl
      ? { label: "Track parcel", href: input.trackingUrl }
      : { label: "View your order", href: `${brand.siteUrl}/account/orders${input.orderId ? `/${input.orderId}` : ""}` },
    textBody: [
      `Hey ${first},`,
      "",
      `${label} just shipped. ${brand.shippingPolicy}`,
      tracking ? `Tracking: ${tracking}${input.trackingCompany ? ` (${input.trackingCompany})` : ""}` : "",
      input.trackingUrl ? `Track: ${input.trackingUrl}` : "",
      "",
      brand.name,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

export function sendDeliveredEmail(input: StageBase) {
  const first = firstName(input.customerName);
  const label = displayIdLabel(input);
  return sendStageEmail({
    to: input.customerEmail,
    subject: `[${label}] Delivered — enjoy responsibly`,
    heading: "It's at your door.",
    preheader: `${label} delivered`,
    intro: `${first}, your order ${label} has been marked delivered. Thanks for choosing us — enjoy responsibly, and let us know if anything's off.`,
    textBody: `${first}, your order ${label} has been delivered. Thanks for choosing us — enjoy responsibly.\n\n${brand.name}`,
    cta: { label: "Shop again", href: `${brand.siteUrl}/shop` },
  });
}

export function sendWelcomeEmail(input: { email: string }) {
  const code = process.env.NEXT_PUBLIC_WELCOME_CODE ?? "WELCOME15";
  const discount = process.env.NEXT_PUBLIC_WELCOME_DISCOUNT ?? "$15 off";
  const minSubtotal = process.env.NEXT_PUBLIC_WELCOME_MIN_SUBTOTAL ?? "$80";

  const extraHtml = `
    <tr>
      <td style="padding:4px 32px 0;">
        <div style="border:2px solid ${COLORS.clay};border-radius:14px;padding:20px;background:#fff7ee;text-align:center;">
          <div style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${COLORS.muted};">Your code</div>
          <div style="margin-top:10px;display:inline-block;padding:10px 20px;background:${COLORS.forest};color:#fff;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.24em;border-radius:8px;">${escapeHtml(code)}</div>
          <div style="margin-top:14px;font-size:14px;color:${COLORS.forest};">
            ${escapeHtml(discount)} on orders over ${escapeHtml(minSubtotal)}.
          </div>
        </div>
      </td>
    </tr>
  `;

  return sendStageEmail({
    to: input.email,
    subject: `[${brand.name}] Your ${discount} welcome code is inside`,
    heading: "Welcome to the inside list.",
    preheader: `Your ${discount} welcome code: ${code}`,
    intro: `Thanks for joining — here's your code for ${discount} on your first order. We'll only email you when there's something good (drops, restocks, members-only deals). No daily noise.`,
    extraHtml,
    cta: { label: "Browse the shop", href: `${brand.siteUrl}/shop` },
    textBody: [
      "Welcome to the ${brand.name} inside list.",
      "",
      `Your code: ${code}`,
      `${discount} on orders over ${minSubtotal}.`,
      "",
      "We'll only email when there's something good — drops, restocks, members-only deals.",
      "",
      `Shop: ${brand.siteUrl}/shop`,
      "Reply STOP to unsubscribe.",
    ].join("\n"),
  });
}

type CanceledInput = StageBase & { reason?: string };

export function sendOrderCanceledEmail(input: CanceledInput) {
  const first = firstName(input.customerName);
  const label = displayIdLabel(input);
  const reason = input.reason || "Your order was canceled because we didn't receive payment within 24 hours.";
  return sendStageEmail({
    to: input.customerEmail,
    subject: `[${label}] Order canceled`,
    heading: "Your order was canceled.",
    preheader: `${label} canceled`,
    intro: `${first}, we've canceled order ${label}. ${reason} If this is a mistake or you'd like to reorder, just reply — we'll sort it out.`,
    textBody: `${first}, we've canceled order ${label}. ${reason}\n\nIf this is a mistake or you'd like to reorder, reply to this email.\n\n${brand.name}`,
    cta: { label: "Start a new order", href: `${brand.siteUrl}/shop` },
  });
}

export async function sendOrderEmails(order: OrderPayload) {
  const config = loadConfig();
  if (!config) return { sent: false, reason: "SMTP not configured" } as const;

  const transporter = getTransport(config);
  const lines = renderOrderLines(order);
  const subjectTag = `[${order.storefrontOrderId}]`;
  const first = firstName(order.customerName);

  const ownerText = [
    `New order received — ${order.storefrontOrderId}`,
    `Placed: ${formatDate(order.createdAt)}`,
    `Total: ${money(order.orderTotal)}`,
    "",
    `Customer: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
    `Address: ${order.customerAddress}`,
    "",
    `Notes: ${order.customerMessage || "(none)"}`,
    "",
    "Items:",
    lines,
  ].join("\n");

  const payToEmail = brand.paymentEmail;
  const bankTransferLines =
    order.paymentMethod === "bank_transfer" && order.paymentReference
      ? [
          "",
          "ACTION REQUIRED — send your bank transfer:",
          `  Amount:    ${money(order.orderTotal)}`,
          `  Send to:   ${payToEmail}`,
          `  Reference: ${order.paymentReference}  (include this in the transfer details)`,
          `  Security answer: ${order.paymentReference}`,
          "",
          `We ship same-day after the transfer confirms (before ${region.dispatchCutoff} cut-off).`,
        ]
      : [];

  const totalsLines: string[] = [];
  if (order.subtotal != null) totalsLines.push(`Subtotal: ${money(order.subtotal)}`);
  if (order.shippingFee != null) totalsLines.push(`Shipping: ${order.freeShipping ? "FREE" : money(order.shippingFee)}`);
  totalsLines.push(`Order total: ${money(order.orderTotal)}`);

  const customerText = [
    `Thanks for your order, ${first}.`,
    "",
    `Order ${order.storefrontOrderId} has been logged.`,
    `Placed: ${formatDate(order.createdAt)}`,
    "",
    "Your items:",
    lines,
    "",
    ...totalsLines,
    ...bankTransferLines,
    "",
    "What happens next:",
    "1. We confirm payment.",
    `2. We pack your order. ${brand.packagingPolicy}`,
    "3. You get tracking the moment it ships.",
    "",
    `Questions? Reply to this email or reach us at ${brand.supportEmail}.`,
    "",
    `Back to the shop: ${config.siteUrl}/shop`,
    "",
    "${brand.name}",
  ].join("\n");

  try {
    await Promise.all([
      transporter.sendMail({
        from: config.from,
        to: config.orderInbox,
        replyTo: order.customerEmail,
        subject: `${subjectTag} New order — ${order.customerName} · ${money(order.orderTotal)}${
          order.paymentMethod === "bank_transfer" ? ` · Bank transfer pending` : ""
        }`,
        text: ownerText,
        html: ownerEmailHtml(order),
      }),
      transporter.sendMail({
        from: config.from,
        to: order.customerEmail,
        replyTo: brand.supportEmail,
        subject:
          order.paymentMethod === "bank_transfer"
            ? `${subjectTag} Send bank transfer · ref ${order.paymentReference}`
            : `${subjectTag} We got your order`,
        text: customerText,
        html: customerEmailHtml(order, config.siteUrl),
      }),
    ]);
    return { sent: true } as const;
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown SMTP error",
    } as const;
  }
}
