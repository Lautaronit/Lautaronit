/**
 * mockConnector.test.ts
 * -----------------------------------------------------------------------------
 * Unit tests for the mock connector. They lock the merchant's business rules:
 * availability, valid quantities and budget enforcement.
 */

import { describe, it, expect } from "vitest";
import { MockConnector } from "./mockConnector.js";
import { MC_DONALDS_CATALOG, MC_DONALDS_INFO } from "./catalogs.js";
import type { DeliveryAddress } from "../types.js";

const address: DeliveryAddress = {
  label: "Test",
  street: "1 Main St",
  city: "City",
};

function makeConnector(): MockConnector {
  return new MockConnector(MC_DONALDS_INFO, MC_DONALDS_CATALOG);
}

describe("MockConnector.getCatalog", () => {
  it("returns the full catalog", async () => {
    const catalog = await makeConnector().getCatalog();
    expect(catalog.length).toBe(MC_DONALDS_CATALOG.length);
  });

  it("returns copies, so the internal catalog can't be mutated", async () => {
    const connector = makeConnector();
    const first = await connector.getCatalog();
    first[0]!.name = "HACKED";
    const second = await connector.getCatalog();
    expect(second[0]!.name).not.toBe("HACKED");
  });
});

describe("MockConnector.searchCatalog", () => {
  it("finds items by tag", async () => {
    const results = await makeConnector().searchCatalog("big mac");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (r) =>
          r.name.toLowerCase().includes("big mac") ||
          (r.tags ?? []).includes("big mac"),
      ),
    ).toBe(true);
  });

  it("returns empty for a blank search", async () => {
    const results = await makeConnector().searchCatalog("   ");
    expect(results).toHaveLength(0);
  });
});

describe("MockConnector.placeOrder", () => {
  it("confirms a valid order and computes the total", async () => {
    const result = await makeConnector().placeOrder({
      lines: [{ sku: "bigmac-combo-med", quantity: 2 }],
      address,
    });
    expect(result.status).toBe("confirmed");
    expect(result.totalCents).toBe(999 * 2);
    expect(result.currency).toBe("USD");
    expect(result.externalOrderId).toBeDefined();
  });

  it("rejects an unknown SKU", async () => {
    const result = await makeConnector().placeOrder({
      lines: [{ sku: "does-not-exist", quantity: 1 }],
      address,
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects zero or negative quantity (edge case)", async () => {
    const result = await makeConnector().placeOrder({
      lines: [{ sku: "bigmac-combo-med", quantity: 0 }],
      address,
    });
    expect(result.status).toBe("rejected");
  });

  it("rejects when over budget", async () => {
    const result = await makeConnector().placeOrder({
      lines: [{ sku: "bigmac-combo-med", quantity: 1 }],
      address,
      budgetCents: 500, // $5, not enough for a $9.99 combo
    });
    expect(result.status).toBe("rejected");
    expect(result.message).toContain("budget");
  });

  it("confirms right at the budget limit", async () => {
    const result = await makeConnector().placeOrder({
      lines: [{ sku: "bigmac-combo-med", quantity: 1 }],
      address,
      budgetCents: 999, // exact
    });
    expect(result.status).toBe("confirmed");
  });

  it("rejects an order with no lines", async () => {
    const result = await makeConnector().placeOrder({ lines: [], address });
    expect(result.status).toBe("rejected");
  });
});
