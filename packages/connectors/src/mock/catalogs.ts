/**
 * catalogs.ts
 * -----------------------------------------------------------------------------
 * Sample catalogs for the simulated merchants. This mimics what, for a real
 * merchant, would come from its API. Prices in cents, currency USD.
 */

import type { CatalogItem, MerchantInfo } from "../types.js";

export const MC_DONALDS_INFO: MerchantInfo = {
  id: "mock-mcdonalds",
  name: "McDonald's (demo)",
  category: "fast_food",
};

export const MC_DONALDS_CATALOG: CatalogItem[] = [
  {
    sku: "bigmac-combo-med",
    name: "Big Mac Combo (Medium)",
    priceCents: 999,
    currency: "USD",
    available: true,
    tags: ["big mac", "combo", "burger", "medium"],
  },
  {
    sku: "bigmac-combo-large",
    name: "Big Mac Combo (Large)",
    priceCents: 1149,
    currency: "USD",
    available: true,
    tags: ["big mac", "combo", "burger", "large"],
  },
  {
    sku: "quarter-combo",
    name: "Quarter Pounder Combo (Medium)",
    priceCents: 1049,
    currency: "USD",
    available: true,
    tags: ["quarter pounder", "combo", "burger"],
  },
  {
    sku: "mcnuggets-10",
    name: "McNuggets x10",
    priceCents: 799,
    currency: "USD",
    available: true,
    tags: ["nuggets", "chicken"],
  },
  {
    sku: "fries-large",
    name: "Large Fries",
    priceCents: 399,
    currency: "USD",
    available: true,
    tags: ["fries", "side"],
  },
];

export const SUPER_INFO: MerchantInfo = {
  id: "mock-super",
  name: "FreshMart (demo)",
  category: "supermarket",
};

// Macros por unidad (el paquete entero). Aproximadas pero realistas, para que
// el armador por macros proponga canastas con sentido.
export const SUPER_CATALOG: CatalogItem[] = [
  {
    sku: "chicken-breast-1kg",
    name: "Chicken Breast 1kg",
    priceCents: 699,
    currency: "USD",
    available: true,
    tags: ["chicken", "meat", "protein"],
    nutrition: { proteinG: 230, carbsG: 0, fatG: 30, kcal: 1300 },
  },
  {
    sku: "eggs-12",
    name: "Eggs x12",
    priceCents: 329,
    currency: "USD",
    available: true,
    tags: ["eggs", "protein"],
    nutrition: { proteinG: 72, carbsG: 6, fatG: 60, kcal: 816 },
  },
  {
    sku: "tuna-can",
    name: "Canned Tuna 170g",
    priceCents: 149,
    currency: "USD",
    available: true,
    tags: ["tuna", "fish", "protein"],
    nutrition: { proteinG: 40, carbsG: 0, fatG: 6, kcal: 200 },
  },
  {
    sku: "greek-yogurt-1kg",
    name: "Greek Yogurt 1kg",
    priceCents: 449,
    currency: "USD",
    available: true,
    tags: ["yogurt", "dairy", "protein"],
    nutrition: { proteinG: 100, carbsG: 40, fatG: 20, kcal: 700 },
  },
  {
    sku: "milk-1l",
    name: "Whole Milk 1L",
    priceCents: 189,
    currency: "USD",
    available: true,
    tags: ["milk", "dairy"],
    nutrition: { proteinG: 32, carbsG: 48, fatG: 36, kcal: 640 },
  },
  {
    sku: "oats-1kg",
    name: "Rolled Oats 1kg",
    priceCents: 299,
    currency: "USD",
    available: true,
    tags: ["oats", "cereal", "carbs"],
    nutrition: { proteinG: 130, carbsG: 600, fatG: 70, kcal: 3800 },
  },
  {
    sku: "rice-1kg",
    name: "Rice 1kg",
    priceCents: 219,
    currency: "USD",
    available: true,
    tags: ["rice", "carbs"],
    nutrition: { proteinG: 70, carbsG: 800, fatG: 5, kcal: 3600 },
  },
  {
    sku: "pasta-500g",
    name: "Pasta 500g",
    priceCents: 149,
    currency: "USD",
    available: true,
    tags: ["pasta", "noodles", "carbs"],
    nutrition: { proteinG: 60, carbsG: 375, fatG: 8, kcal: 1800 },
  },
  {
    sku: "bread",
    name: "Sliced Bread 500g",
    priceCents: 249,
    currency: "USD",
    available: true,
    tags: ["bread", "bakery", "carbs"],
    nutrition: { proteinG: 45, carbsG: 245, fatG: 15, kcal: 1280 },
  },
  {
    sku: "banana-bunch",
    name: "Bananas (bunch)",
    priceCents: 129,
    currency: "USD",
    available: true,
    tags: ["banana", "fruit", "carbs"],
    nutrition: { proteinG: 7, carbsG: 135, fatG: 2, kcal: 520 },
  },
  {
    sku: "peanut-butter-500g",
    name: "Peanut Butter 500g",
    priceCents: 399,
    currency: "USD",
    available: true,
    tags: ["peanut butter", "fat", "protein"],
    nutrition: { proteinG: 125, carbsG: 100, fatG: 250, kcal: 3000 },
  },
  {
    sku: "oil-900ml",
    name: "Sunflower Oil 900ml",
    priceCents: 429,
    currency: "USD",
    available: true,
    tags: ["oil", "fat"],
    nutrition: { proteinG: 0, carbsG: 0, fatG: 828, kcal: 7452 },
  },
  {
    sku: "coffee-250g",
    name: "Ground Coffee 250g",
    priceCents: 499,
    currency: "USD",
    available: true,
    tags: ["coffee"],
    nutrition: { proteinG: 0, carbsG: 0, fatG: 0, kcal: 0 },
  },
];
