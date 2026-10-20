"use client";

import { useEffect, useId, useRef, useState } from "react";
import { region } from "@/config/region";

type PhotonFeature = {
  type: "Feature";
  geometry?: { coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    district?: string;
    locality?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

export type AddressParts = {
  address_1: string;
  address_2: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  countryCode: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (parts: AddressParts) => void;
  placeholder?: string;
  countryFilter?: string;
  /** Optional latitude bias for Photon (NEXT_PUBLIC_ADDRESS_BIAS_LAT). */
  biasLat?: number;
  /** Optional longitude bias for Photon (NEXT_PUBLIC_ADDRESS_BIAS_LON). */
  biasLon?: number;
  className?: string;
  inputClassName?: string;
};

function featureToParts(feature: PhotonFeature): AddressParts {
  const props = feature.properties;
  const street = [props.housenumber, props.street ?? props.name].filter(Boolean).join(" ").trim();
  return {
    address_1: street || props.name || "",
    address_2: "",
    city: props.city || props.district || props.locality || "",
    province: props.state || "",
    postal_code: props.postcode || "",
    country: props.country || "",
    countryCode: (props.countrycode || "").toUpperCase(),
  };
}

function featureToLabel(feature: PhotonFeature): string {
  const p = feature.properties;
  const street = [p.housenumber, p.street ?? p.name].filter(Boolean).join(" ").trim();
  const tail = [p.city || p.district || p.locality, p.state, p.postcode]
    .filter(Boolean)
    .join(", ");
  return [street || p.name, tail].filter(Boolean).join(" · ");
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing your address",
  countryFilter = region.countryCode.toLowerCase(),
  biasLat = region.addressBias?.lat,
  biasLon = region.addressBias?.lon,
  className,
  inputClassName,
}: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      // No fetch necessary; clear out any previous results in a layout effect
      // so we never re-render in the same tick that read `value`.
      const reset = setTimeout(() => {
        setResults([]);
        setOpen(false);
      }, 0);
      return () => clearTimeout(reset);
    }
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", value);
        url.searchParams.set("limit", "6");
        url.searchParams.set("lang", "en");
        if (countryFilter) url.searchParams.set("layer", "house");
        // Optional geographic bias so results near the store rank first
        if (biasLat !== undefined && biasLon !== undefined) {
          url.searchParams.set("lat", String(biasLat));
          url.searchParams.set("lon", String(biasLon));
        }
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) throw new Error("photon failed");
        const data = (await response.json()) as PhotonResponse;
        const features = (data.features ?? []).filter((f) =>
          countryFilter ? f.properties.countrycode?.toLowerCase() === countryFilter.toLowerCase() : true,
        );
        setResults(features);
        setOpen(features.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, countryFilter, biasLat, biasLon]);

  function pick(feature: PhotonFeature) {
    const parts = featureToParts(feature);
    onSelect(parts);
    onChange(parts.address_1);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      pick(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="address-line1"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={inputClassName}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-auto rounded-[1.2rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(20,33,25,0.14)]"
        >
          {results.map((feature, index) => (
            <li key={`${feature.properties.osm_type}-${feature.properties.osm_id ?? index}`}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(feature);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={
                  "flex w-full flex-col gap-1 px-4 py-3 text-left text-sm text-[var(--color-forest)] " +
                  (index === activeIndex ? "bg-[var(--color-panel)]" : "hover:bg-[var(--color-panel)]/60")
                }
              >
                <span className="font-semibold">{featureToLabel(feature)}</span>
                {feature.properties.country ? (
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {feature.properties.country}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          <li className="border-t border-[var(--color-line)] px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
            Suggestions powered by OpenStreetMap{busy ? " · loading…" : ""}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
