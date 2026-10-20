import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
};

export function BrandMark({ compact = false, href = "/" }: BrandMarkProps) {
  // Compact = header mode (show only logo + wordmark, no tagline; wordmark
  // hides on the smallest screens to leave room for cart + hamburger).
  // Full   = footer mode (logo + wordmark always; tagline only on sm+).
  return (
    <Link
      href={href}
      className={compact ? "flex items-center gap-2.5 sm:gap-4" : "flex items-center gap-3 sm:gap-5"}
      aria-label={`${brand.name} home`}
    >
      <Image
        src={brand.logoSvg}
        alt=""
        width={compact ? 64 : 80}
        height={compact ? 64 : 80}
        className={
          compact
            ? "h-10 w-10 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]"
            : "h-12 w-12 shrink-0 sm:h-16 sm:w-16 lg:h-20 lg:w-20"
        }
        priority
      />
      <div className="min-w-0">
        <p
          className={
            compact
              ? "hidden text-[10px] uppercase tracking-[0.28em] text-[var(--color-olive)] min-[400px]:block sm:text-[11px] sm:tracking-[0.42em]"
              : "text-[10px] uppercase tracking-[0.32em] text-[var(--color-olive)] sm:text-[11px] sm:tracking-[0.42em]"
          }
        >
          {brand.name}
        </p>
        {!compact ? (
          <p className="mt-1 hidden text-sm leading-6 text-[var(--color-muted)] sm:block">
            {brand.tagline}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
