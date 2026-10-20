"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatMoney } from "@/config/region";

export type HeroSlide = {
  /** Small uppercase eyebrow above the title (e.g. "Drop of the week") */
  eyebrow?: string;
  /** Bottom-left chip below the title (e.g. category) */
  category?: string;
  /** Top-right chip (e.g. "Save 15%", "Free shipping") */
  badge?: string;
  /** Main heading */
  title: string;
  /** Supporting body copy */
  body?: string;
  /** "Shop now", "Get the code", etc. */
  ctaLabel?: string;
  /** Where the CTA goes */
  ctaHref: string;
  /** Hero image — usually a product photo, can be a promo graphic */
  imageUrl: string;
  /** Optional price chip with stock indicator (for product slides) */
  price?: { amount: number; currency?: string; stock?: number | null };
};

const ROTATION_MS = 7000;

export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Auto-rotate, but never if there's only one slide, the user reduces motion,
  // or the user is hovering / touching the carousel.
  useEffect(() => {
    if (total <= 1 || paused || reducedMotion) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, [total, paused, reducedMotion]);

  function go(delta: number) {
    setIndex((current) => (current + delta + total) % total);
  }

  function onTouchStart(event: React.TouchEvent) {
    touchStart.current = event.touches[0].clientX;
  }
  function onTouchEnd(event: React.TouchEvent) {
    if (touchStart.current == null) return;
    const dx = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) {
      go(dx < 0 ? 1 : -1);
    }
    touchStart.current = null;
  }

  if (total === 0) return null;

  return (
    <div
      className="relative lg:pb-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(20,33,25,0.1)] bg-[var(--color-forest)] shadow-[0_30px_90px_rgba(20,33,25,0.22)] sm:rounded-[2.6rem]">
        <div className="relative aspect-[4/5] sm:aspect-[0.88/1]">
          {slides.map((slide, slideIndex) => (
            <SlideCard
              key={`${slide.title}-${slideIndex}`}
              slide={slide}
              isActive={slideIndex === index}
              priority={slideIndex === 0}
            />
          ))}

          {total > 1 ? (
            <>
              {/* Arrows — desktop only, keep mobile clean */}
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-lg !text-white backdrop-blur transition hover:bg-black/50 lg:inline-flex"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-lg !text-white backdrop-blur transition hover:bg-black/50 lg:inline-flex"
              >
                ›
              </button>

              {/* Dots — visible on all sizes */}
              <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 sm:bottom-4">
                {slides.map((_, slideIndex) => (
                  <button
                    key={slideIndex}
                    type="button"
                    onClick={() => setIndex(slideIndex)}
                    aria-label={`Go to slide ${slideIndex + 1}`}
                    aria-current={slideIndex === index}
                    className={
                      "h-1.5 rounded-full transition-all duration-300 " +
                      (slideIndex === index
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/40 hover:bg-white/70")
                    }
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  isActive,
  priority,
}: {
  slide: HeroSlide;
  isActive: boolean;
  priority: boolean;
}) {
  return (
    <Link
      href={slide.ctaHref}
      tabIndex={isActive ? 0 : -1}
      aria-hidden={!isActive}
      className={
        "group absolute inset-0 block transition-opacity duration-500 " +
        (isActive ? "opacity-100" : "pointer-events-none opacity-0")
      }
    >
      <Image
        src={slide.imageUrl}
        alt={slide.title}
        fill
        priority={priority}
        className="object-cover transition duration-700 group-hover:scale-[1.04]"
        sizes="(max-width: 1024px) 100vw, 45vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,15,12,0.15)_0%,rgba(9,15,12,0.78)_100%)]" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
        {slide.eyebrow ? (
          <span className="rounded-full bg-[var(--color-clay)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] !text-white">
            {slide.eyebrow}
          </span>
        ) : (
          <span />
        )}
        {slide.badge ? (
          <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/90 backdrop-blur">
            {slide.badge}
          </span>
        ) : null}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5 pb-12 sm:p-7 sm:pb-14">
        {slide.category ? (
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">{slide.category}</p>
        ) : null}
        <h2 className="mt-2 font-display text-4xl leading-[0.92] text-white sm:text-5xl lg:text-6xl">
          {slide.title}
        </h2>
        {slide.body ? (
          <p className="mt-3 max-w-md text-sm leading-6 text-white/80 sm:text-base">{slide.body}</p>
        ) : null}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            {slide.price ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">From</p>
                <p className="text-2xl font-semibold text-white sm:text-3xl">
                  {formatMoney(slide.price.amount)}
                </p>
                {(() => {
                  const stock = Number(slide.price?.stock);
                  return Number.isFinite(stock) && stock > 0 && stock <= 25 ? (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-clay-soft)]">
                      Only {stock} left
                    </p>
                  ) : null;
                })()}
              </>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-forest)]">
            {slide.ctaLabel ?? "Shop now"} <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (window.matchMedia ? window.matchMedia(REDUCED_MOTION).matches : false),
    () => false,
  );
}
