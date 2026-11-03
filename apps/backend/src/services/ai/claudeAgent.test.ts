/**
 * claudeAgent.test.ts
 * -----------------------------------------------------------------------------
 * Pruebas de la lógica PURA del agente con IA: armado del índice del catálogo y
 * la validación de la respuesta del modelo a `OrderIntent`. No llama a Claude
 * (eso es la cáscara); acá verificamos que nunca confiamos a ciegas en el modelo.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createDefaultRegistry } from "@on-it/connectors";
import {
  buildCatalogIndex,
  buildIntentFromToolInput,
  renderCatalog,
  type CatalogIndex,
} from "./claudeAgent.js";

let index: CatalogIndex;

beforeAll(async () => {
  index = await buildCatalogIndex(createDefaultRegistry());
});

describe("buildCatalogIndex / renderCatalog", () => {
  it("indexa los dos comercios mock con sus SKUs", () => {
    expect(index.merchants.has("mock-mcdonalds")).toBe(true);
    expect(index.merchants.has("mock-super")).toBe(true);
    expect(index.merchants.get("mock-mcdonalds")!.items.has("bigmac-combo-med")).toBe(true);
    expect(index.merchants.get("mock-super")!.items.has("milk-1l")).toBe(true);
  });

  it("el catálogo renderizado incluye nombre de comercio y un SKU", () => {
    const text = renderCatalog(index);
    expect(text).toContain("merchantId: mock-mcdonalds");
    expect(text).toContain("bigmac-combo-med");
  });
});

describe("buildIntentFromToolInput", () => {
  it("arma un OrderIntent válido con SKUs reales", () => {
    const res = buildIntentFromToolInput(
      { merchantId: "mock-mcdonalds", lines: [{ sku: "bigmac-combo-med", quantity: 2 }] },
      index,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.intent.merchantId).toBe("mock-mcdonalds");
      expect(res.intent.lines).toEqual([{ sku: "bigmac-combo-med", quantity: 2 }]);
    }
  });

  it("rechaza un comercio que no existe", () => {
    const res = buildIntentFromToolInput(
      { merchantId: "mock-pizza", lines: [{ sku: "x", quantity: 1 }] },
      index,
    );
    expect(res.ok).toBe(false);
  });

  it("ignora SKUs inventados y conserva los válidos", () => {
    const res = buildIntentFromToolInput(
      {
        merchantId: "mock-super",
        lines: [
          { sku: "milk-1l", quantity: 1 },
          { sku: "sku-que-no-existe", quantity: 3 },
        ],
      },
      index,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.intent.lines).toEqual([{ sku: "milk-1l", quantity: 1 }]);
    }
  });

  it("falla si todas las líneas son SKUs inventados", () => {
    const res = buildIntentFromToolInput(
      { merchantId: "mock-super", lines: [{ sku: "nope", quantity: 1 }] },
      index,
    );
    expect(res.ok).toBe(false);
  });

  it("falla con lines vacío (nada que pedir)", () => {
    const res = buildIntentFromToolInput({ merchantId: "mock-super", lines: [] }, index);
    expect(res.ok).toBe(false);
  });

  it("toma el presupuesto cuando viene", () => {
    const res = buildIntentFromToolInput(
      { merchantId: "mock-super", lines: [{ sku: "milk-1l", quantity: 1 }], budgetCents: 4000 },
      index,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.intent.budgetCents).toBe(4000);
  });

  it("normaliza cantidades no enteras o <= 0", () => {
    const res = buildIntentFromToolInput(
      {
        merchantId: "mock-super",
        lines: [
          { sku: "milk-1l", quantity: 2.7 },
          { sku: "bread", quantity: 0 },
        ],
      },
      index,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.intent.lines).toEqual([{ sku: "milk-1l", quantity: 2 }]);
  });

  it("rechaza entradas que no son objeto", () => {
    expect(buildIntentFromToolInput(null, index).ok).toBe(false);
    expect(buildIntentFromToolInput("nope", index).ok).toBe(false);
  });
});
