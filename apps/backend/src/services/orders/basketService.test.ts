/**
 * basketService.test.ts
 * -----------------------------------------------------------------------------
 * Pruebas del optimizador por macros (puro) y del servicio que lo envuelve.
 * Verificamos lo importante: nunca se pasa del presupuesto ni del tope por
 * producto, y apunta a los macros pedidos.
 */

import { describe, it, expect } from "vitest";
import {
  createDefaultRegistry,
  InstacartCartProvider,
  type CartLinkProvider,
} from "@on-it/connectors";
import { BasketService, BasketError, planBasket, type PlannerItem } from "./basketService.js";

/** Instacart sin clave: la integración queda inactiva. */
const noInstacart = new InstacartCartProvider("");

/** Proveedor de prueba que devuelve un link fijo y recuerda lo que recibió. */
class StubCartProvider implements CartLinkProvider {
  readonly configured = true;
  lastItems: { name: string; quantity: number }[] = [];
  async buildCartLink(input: { lineItems: { name: string; quantity: number }[] }) {
    this.lastItems = input.lineItems;
    return { url: "https://instacart.example/cart/abc" };
  }
}

const ITEMS: PlannerItem[] = [
  { sku: "chicken", name: "Chicken 1kg", priceCents: 699, nutrition: { proteinG: 230, carbsG: 0, fatG: 30, kcal: 1300 } },
  { sku: "tuna", name: "Tuna can", priceCents: 149, nutrition: { proteinG: 40, carbsG: 0, fatG: 6, kcal: 200 } },
  { sku: "rice", name: "Rice 1kg", priceCents: 219, nutrition: { proteinG: 70, carbsG: 800, fatG: 5, kcal: 3600 } },
  { sku: "oil", name: "Oil 900ml", priceCents: 429, nutrition: { proteinG: 0, carbsG: 0, fatG: 828, kcal: 7452 } },
];

function sumCost(lines: { lineTotalCents: number }[]): number {
  return lines.reduce((s, l) => s + l.lineTotalCents, 0);
}

describe("planBasket (optimizador)", () => {
  it("apunta a la proteína y no se pasa del presupuesto", () => {
    const { lines, totals } = planBasket(ITEMS, 5000, { proteinG: 200 });
    expect(totals.costCents).toBeLessThanOrEqual(5000);
    expect(totals.proteinG).toBeGreaterThanOrEqual(200); // alcanza el objetivo
    expect(lines.length).toBeGreaterThan(0);
  });

  it("nunca excede el presupuesto aunque el objetivo sea enorme", () => {
    const { totals } = planBasket(ITEMS, 300, { proteinG: 1000 });
    expect(totals.costCents).toBeLessThanOrEqual(300);
  });

  it("los totales coinciden con la suma de las líneas", () => {
    const { lines, totals } = planBasket(ITEMS, 4000, { proteinG: 150, carbsG: 300 });
    expect(sumCost(lines)).toBe(totals.costCents);
  });

  it("respeta el tope por producto", () => {
    const { lines } = planBasket(ITEMS, 100000, { proteinG: 5000 }, 2);
    for (const l of lines) expect(l.quantity).toBeLessThanOrEqual(2);
  });

  it("sin objetivos devuelve canasta vacía", () => {
    const { lines, totals } = planBasket(ITEMS, 5000, {});
    expect(lines).toHaveLength(0);
    expect(totals.costCents).toBe(0);
  });

  it("para carbos elige el producto denso en carbos (arroz)", () => {
    const { lines } = planBasket(ITEMS, 2000, { carbsG: 700 });
    expect(lines.some((l) => l.sku === "rice")).toBe(true);
  });
});

describe("BasketService", () => {
  it("arma una canasta real del súper dentro del presupuesto", async () => {
    const service = new BasketService(createDefaultRegistry(), noInstacart);
    const plan = await service.plan({ budgetCents: 4000, targets: { proteinG: 150 } });
    expect(plan.merchantId).toBe("mock-super");
    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.totals.costCents).toBeLessThanOrEqual(4000);
    expect(plan.totals.proteinG).toBeGreaterThan(0);
  });

  it("rechaza presupuesto <= 0", async () => {
    const service = new BasketService(createDefaultRegistry(), noInstacart);
    await expect(service.plan({ budgetCents: 0, targets: { proteinG: 100 } })).rejects.toBeInstanceOf(BasketError);
  });

  it("rechaza si no hay ningún objetivo de macro", async () => {
    const service = new BasketService(createDefaultRegistry(), noInstacart);
    await expect(service.plan({ budgetCents: 4000, targets: {} })).rejects.toBeInstanceOf(BasketError);
  });

  it("instacartConfigured es false sin clave", () => {
    const service = new BasketService(createDefaultRegistry(), noInstacart);
    expect(service.instacartConfigured).toBe(false);
  });

  it("instacartLink resuelve nombres y devuelve el link del proveedor", async () => {
    const stub = new StubCartProvider();
    const service = new BasketService(createDefaultRegistry(), stub);
    const out = await service.instacartLink({ lines: [{ sku: "milk-1l", quantity: 2 }] });
    expect(out.url).toBe("https://instacart.example/cart/abc");
    // Mapeó el SKU a su nombre real del catálogo.
    expect(stub.lastItems).toEqual([{ name: "Whole Milk 1L", quantity: 2 }]);
  });
});
