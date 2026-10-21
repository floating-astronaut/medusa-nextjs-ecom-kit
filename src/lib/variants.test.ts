import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultVariant,
  findVariant,
  priceRange,
  selectValue,
  sortOptionValues,
  sortOptions,
  sortVariants,
  valueState,
  variantLabel,
  type ProductOption,
  type ProductVariant,
} from "./variants.ts";

const SIZE = "opt_size";
const COLOR = "opt_color";

const options: ProductOption[] = [
  { id: SIZE, title: "Size", values: ["S", "M", "L", "XL"] },
  { id: COLOR, title: "Color", values: ["Black", "Natural"] },
];

function v(size: string, color: string, extra: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: `var_${size}_${color}`,
    title: `${size} / ${color}`,
    price: 28,
    options: { [SIZE]: size, [COLOR]: color },
    inventory: 30,
    available: true,
    ...extra,
  };
}

// The seeded tee: XL costs more, XL / Natural is sold out.
const tee: ProductVariant[] = [
  v("M", "Natural"),
  v("S", "Natural"),
  v("S", "Black"),
  v("M", "Black"),
  v("L", "Black"),
  v("XL", "Black", { price: 30 }),
  v("L", "Natural"),
  v("XL", "Natural", { price: 30, inventory: 0, available: false }),
];

test("sortOptionValues: explicit order wins, unknown values go last", () => {
  assert.deepEqual(sortOptionValues(["L", "S", "Tall", "M"], ["S", "M", "L"]), ["S", "M", "L", "Tall"]);
});

test("sortOptionValues: sizes, numbers and text sort naturally without an explicit order", () => {
  assert.deepEqual(sortOptionValues(["L", "M", "S", "XL", "xs"]), ["xs", "S", "M", "L", "XL"]);
  assert.deepEqual(sortOptionValues(["10", "8", "12"]), ["8", "10", "12"]);
  assert.deepEqual(sortOptionValues(["Rust", "Charcoal", "Oat", "Rust"]), ["Charcoal", "Oat", "Rust"]);
});

test("sortOptions follows the explicit order and keeps the rest after it", () => {
  const api = [options[1], options[0]]; // Medusa returned Color before Size
  assert.deepEqual(sortOptions(api, ["Size", "Color"]).map((o) => o.title), ["Size", "Color"]);
  assert.deepEqual(sortOptions(api).map((o) => o.title), ["Color", "Size"]);
});

test("sortVariants follows option order", () => {
  assert.deepEqual(
    sortVariants(tee, options).map((variant) => variant.title),
    ["S / Black", "S / Natural", "M / Black", "M / Natural", "L / Black", "L / Natural", "XL / Black", "XL / Natural"],
  );
});

test("findVariant needs every option to match", () => {
  assert.equal(findVariant(tee, { [SIZE]: "M", [COLOR]: "Black" })?.id, "var_M_Black");
  assert.equal(findVariant(tee, { [SIZE]: "M" }), undefined);
  assert.equal(findVariant(tee, {}), undefined);
});

test("defaultVariant skips sold-out variants", () => {
  const sorted = sortVariants(tee, options);
  assert.equal(defaultVariant(sorted)?.title, "S / Black");
  const allSoldOut = sorted.map((variant) => ({ ...variant, available: false }));
  assert.equal(defaultVariant(allSoldOut)?.title, "S / Black");
  assert.equal(defaultVariant([]), undefined);
});

test("valueState distinguishes available, needs-other-choice and sold out", () => {
  const selection = { [SIZE]: "XL", [COLOR]: "Black" };
  assert.equal(valueState(tee, selection, COLOR, "Black"), "available");
  // XL / Natural is sold out, but Natural exists in other sizes
  assert.equal(valueState(tee, selection, COLOR, "Natural"), "unavailable-with-selection");
  const noNatural = tee.map((variant) =>
    variant.options[COLOR] === "Natural" ? { ...variant, available: false } : variant,
  );
  assert.equal(valueState(noNatural, selection, COLOR, "Natural"), "sold-out");
});

test("selectValue keeps other choices when that combination is in stock", () => {
  const next = selectValue(tee, { [SIZE]: "S", [COLOR]: "Black" }, COLOR, "Natural");
  assert.deepEqual(next, { [SIZE]: "S", [COLOR]: "Natural" });
});

test("selectValue moves to the closest in-stock variant otherwise", () => {
  // XL / Black → Natural: XL / Natural is sold out, so land on some in-stock Natural
  const next = selectValue(tee, { [SIZE]: "XL", [COLOR]: "Black" }, COLOR, "Natural");
  assert.equal(next[COLOR], "Natural");
  assert.equal(findVariant(tee, next)?.available, true);
});

test("priceRange ignores sold-out variants unless all are sold out", () => {
  assert.deepEqual(priceRange(tee), { min: 28, max: 30 });
  const onlySBlackLeft = tee.map((variant) => ({ ...variant, available: variant.title === "S / Black" }));
  assert.deepEqual(priceRange(onlySBlackLeft), { min: 28, max: 28 });
  assert.deepEqual(priceRange([]), { min: 0, max: 0 });
});

test("variantLabel joins values in option order, null for single-variant products", () => {
  assert.equal(variantLabel(tee[0], options), "M / Natural");
  assert.equal(variantLabel(tee[0], []), null);
});
