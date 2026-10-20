import { formatMoney, region } from "@/config/region";
import { getFreeShippingThreshold } from "@/lib/shipping";

const MESSAGES = [
  `Free shipping on orders over ${formatMoney(getFreeShippingThreshold())}`,
  "Secure checkout · multiple payment options",
  `Same-day dispatch before ${region.dispatchCutoff}`,
  "Thoughtfully made · quality guaranteed",
];

export function AnnouncementBar() {
  return (
    <div className="bg-[var(--color-forest-deep)] text-white">
      <div className="group relative mx-auto flex max-w-7xl overflow-hidden px-4 py-2 sm:px-6 lg:px-10">
        <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap gap-10 text-[11px] font-medium uppercase tracking-[0.24em] text-white/86">
          {[...MESSAGES, ...MESSAGES, ...MESSAGES].map((message, index) => (
            <span key={`${message}-${index}`} className="inline-flex items-center gap-10">
              {message}
              <span aria-hidden className="text-white/32">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
