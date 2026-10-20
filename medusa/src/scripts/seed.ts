import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

// ── Store settings ─────────────────────────────────────────────────────────
// Keep these in step with the storefront's .env.local:
//   CURRENCY → NEXT_PUBLIC_BRAND_CURRENCY, COUNTRY → NEXT_PUBLIC_BRAND_COUNTRY
// Prices below are in major units (28 = $28.00), as Medusa 2 expects.
const CURRENCY = "usd";
const COUNTRY = "us";
const REGION_NAME = "United States";
const WAREHOUSE = { name: "Main Warehouse", city: "New York", country_code: "US" };

// Category names must match the storefront's (footer links, placeholder images).
const CATEGORIES = ["Apparel", "Accessories", "Home", "Stationery"] as const;
type Category = (typeof CATEGORIES)[number];

type SeedProduct = {
  title: string;
  handle: string;
  category: Category;
  description: string;
  price: number;
  weight: number;
  badge: string;
  stock: number;
  packCount?: string;
  /**
   * One option with several values (e.g. sizes); omitted = single variant.
   * The storefront has no variant picker yet and always sells the first
   * variant, so the sample catalog leaves this unset.
   */
  option?: { title: string; values: string[] };
};

const PRODUCTS: SeedProduct[] = [
  {
    title: "Everyday Cotton Tee",
    handle: "everyday-cotton-tee",
    category: "Apparel",
    description: "Heavyweight organic cotton with a relaxed fit that keeps its shape wash after wash.",
    price: 28,
    weight: 220,
    badge: "Bestseller",
    stock: 120,
  },
  {
    title: "Brushed Crewneck",
    handle: "brushed-crewneck",
    category: "Apparel",
    description: "Soft brushed fleece inside, clean loopback outside. Made for cool mornings.",
    price: 64,
    weight: 520,
    badge: "New",
    stock: 60,
  },
  {
    title: "Canvas Tote Bag",
    handle: "canvas-tote-bag",
    category: "Accessories",
    description: "Waxed cotton canvas with an inside pocket and long handles that sit comfortably on the shoulder.",
    price: 34,
    weight: 380,
    badge: "Everyday carry",
    stock: 80,
  },
  {
    title: "Ribbed Wool Beanie",
    handle: "ribbed-wool-beanie",
    category: "Accessories",
    description: "Merino blend rib knit with a fold-over cuff. Warm without the itch.",
    price: 26,
    weight: 90,
    badge: "Cold weather",
    stock: 75,
  },
  {
    title: "Stoneware Mug",
    handle: "stoneware-mug",
    category: "Home",
    description: "Hand-glazed stoneware that holds 350 ml and is safe in the dishwasher and microwave.",
    price: 22,
    weight: 410,
    badge: "Handmade",
    stock: 150,
  },
  {
    title: "Linen Napkins",
    handle: "linen-napkins",
    category: "Home",
    description: "Stonewashed linen napkins that soften with every wash.",
    price: 38,
    weight: 260,
    badge: "Table set",
    stock: 40,
    packCount: "Set of 4",
  },
  {
    title: "Linen Notebook",
    handle: "linen-notebook",
    category: "Stationery",
    description: "A5, lay-flat binding, 160 pages of 100 gsm dot-grid paper under a linen cover.",
    price: 18,
    weight: 300,
    badge: "Staff pick",
    stock: 200,
  },
  {
    title: "Brass Pen",
    handle: "brass-pen",
    category: "Stationery",
    description: "Solid brass body that patinas with use. Takes standard gel refills.",
    price: 42,
    weight: 45,
    badge: "Gift idea",
    stock: 55,
  },
];

function skuFor(handle: string, value?: string) {
  return [handle, value].filter(Boolean).join("-").toUpperCase();
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [{ name: "Default Sales Channel" }],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [{ currency_code: CURRENCY, is_default: true }],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: REGION_NAME,
          currency_code: CURRENCY,
          countries: [COUNTRY],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: COUNTRY, provider_id: "tp_system" }],
  });

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: WAREHOUSE.name,
          address: {
            city: WAREHOUSE.city,
            country_code: WAREHOUSE.country_code,
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [{ name: "Default Shipping Profile", type: "default" }],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: `${WAREHOUSE.name} delivery`,
    type: "shipping",
    service_zones: [
      {
        name: REGION_NAME,
        geo_zones: [{ country_code: COUNTRY, type: "country" }],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  const shippingRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ];

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ships in 2-4 business days.",
          code: "standard",
        },
        prices: [
          { currency_code: CURRENCY, amount: 15 },
          { region_id: region.id, amount: 15 },
        ],
        rules: shippingRules,
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ships next business day.",
          code: "express",
        },
        prices: [
          { currency_code: CURRENCY, amount: 30 },
          { region_id: region.id, amount: 30 },
        ],
        rules: shippingRules,
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Seeding publishable API key data...");
  const { data: existingKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: {
      type: "publishable",
    },
  });

  let publishableApiKey = existingKeys?.[0] as Pick<ApiKey, "id" | "token"> | undefined;

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as Pick<ApiKey, "id" | "token">;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });

  logger.info("Seeding product data...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: CATEGORIES.map((name) => ({ name, is_active: true })),
    },
  });
  const categoryId = (name: Category) =>
    categoryResult.find((category) => category.name === name)!.id;

  await createProductsWorkflow(container).run({
    input: {
      products: PRODUCTS.map((product) => {
        const option = product.option ?? { title: "Default", values: ["Default"] };
        return {
          title: product.title,
          handle: product.handle,
          description: product.description,
          category_ids: [categoryId(product.category)],
          weight: product.weight,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          // The storefront reads these for the card badge, category and stock.
          metadata: {
            category: product.category,
            badge: product.badge,
            stock: product.stock,
            ...(product.packCount ? { pack_count: product.packCount } : {}),
          },
          options: [{ title: option.title, values: option.values }],
          variants: option.values.map((value) => ({
            title: product.option ? value : product.title,
            sku: skuFor(product.handle, product.option ? value : undefined),
            options: { [option.title]: value },
            prices: [{ amount: product.price, currency_code: CURRENCY }],
          })),
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        };
      }),
    },
  });

  logger.info("Seeding inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
    (inventoryItem) => ({
      location_id: stockLocation.id,
      stocked_quantity: 1000,
      inventory_item_id: inventoryItem.id,
    })
  );

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding. Add these to the storefront's .env.local:");
  logger.info(`  MEDUSA_PUBLISHABLE_KEY=${publishableApiKey.token}`);
  logger.info(`  MEDUSA_REGION_ID=${region.id}`);
  logger.info(`  NEXT_PUBLIC_MEDUSA_REGION_ID=${region.id}`);
  logger.info(`  MEDUSA_SALES_CHANNEL_ID=${defaultSalesChannel[0].id}`);
}
