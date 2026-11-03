/**
 * instacart.test.ts
 * -----------------------------------------------------------------------------
 * Pruebas de la parte PURA del conector de Instacart: el armado del cuerpo del
 * request y el estado "no configurado" (sin clave no se puede generar el link).
 * La llamada HTTP real no se testea acá (necesita clave + sandbox).
 */

import { describe, it, expect } from "vitest";
import {
  buildProductsLinkBody,
  CartLinkError,
  InstacartCartProvider,
} from "./instacart.js";

describe("buildProductsLinkBody", () => {
  it("mapea las líneas al formato de IDP con defaults (US, each)", () => {
    const body = buildProductsLinkBody({
      lineItems: [
        { name: "Whole Milk 1L", quantity: 2 },
        { name: "Eggs x12", quantity: 1, unit: "pack" },
      ],
      title: "On It — Macro basket",
    });
    expect(body.title).toBe("On It — Macro basket");
    expect(body.country_code).toBe("US");
    expect(body.line_items).toEqual([
      { name: "Whole Milk 1L", quantity: 2, unit: "each" },
      { name: "Eggs x12", quantity: 1, unit: "pack" },
    ]);
  });

  it("incluye UPCs solo cuando vienen", () => {
    const body = buildProductsLinkBody({
      lineItems: [{ name: "Tuna", quantity: 1, upcs: ["0001112223"] }],
    });
    const items = body.line_items as Array<Record<string, unknown>>;
    expect(items[0]!.upcs).toEqual(["0001112223"]);
  });
});

describe("InstacartCartProvider", () => {
  it("sin clave: configured=false y buildCartLink lanza CartLinkError", async () => {
    const provider = new InstacartCartProvider("");
    expect(provider.configured).toBe(false);
    await expect(
      provider.buildCartLink({ lineItems: [{ name: "Milk", quantity: 1 }] }),
    ).rejects.toBeInstanceOf(CartLinkError);
  });

  it("con clave: configured=true", () => {
    const provider = new InstacartCartProvider("test-key");
    expect(provider.configured).toBe(true);
  });
});
