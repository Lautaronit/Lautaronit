/**
 * provider.test.ts
 * -----------------------------------------------------------------------------
 * Pruebas del proveedor de pagos simulado: registro de tarjetas (solo acepta
 * tarjetas de prueba válidas) y cobro.
 */

import { describe, it, expect } from "vitest";
import { MockStripeProvider, CardError } from "./provider.js";

const provider = new MockStripeProvider();

describe("MockStripeProvider.attachCard", () => {
  it("acepta la Visa de prueba 4242 y devuelve marca + últimos 4", async () => {
    const card = await provider.attachCard({
      number: "4242 4242 4242 4242",
      expMonth: 12,
      expYear: 2030,
      cvc: "123",
    });
    expect(card.brand).toBe("Visa");
    expect(card.last4).toBe("4242");
    expect(card.providerRef).toMatch(/^pm_mock_/);
  });

  it("detecta Mastercard de prueba", async () => {
    const card = await provider.attachCard({
      number: "5555555555554444",
      expMonth: 1,
      expYear: 2031,
      cvc: "123",
    });
    expect(card.brand).toBe("Mastercard");
    expect(card.last4).toBe("4444");
  });

  it("rechaza un número que no es tarjeta de prueba", async () => {
    await expect(
      provider.attachCard({ number: "1234567812345670", expMonth: 5, expYear: 2030, cvc: "123" }),
    ).rejects.toBeInstanceOf(CardError);
  });

  it("rechaza un número demasiado corto", async () => {
    await expect(
      provider.attachCard({ number: "4242", expMonth: 5, expYear: 2030, cvc: "123" }),
    ).rejects.toBeInstanceOf(CardError);
  });

  it("rechaza un mes de vencimiento inválido", async () => {
    await expect(
      provider.attachCard({ number: "4242424242424242", expMonth: 13, expYear: 2030, cvc: "123" }),
    ).rejects.toBeInstanceOf(CardError);
  });

  it("nunca expone el número completo (solo últimos 4)", async () => {
    const card = await provider.attachCard({
      number: "4000056655665556",
      expMonth: 8,
      expYear: 2029,
      cvc: "123",
    });
    expect(card.last4).toBe("5556");
    expect(JSON.stringify(card)).not.toContain("4000056655665556");
  });
});

describe("MockStripeProvider.charge", () => {
  it("cobra un monto válido", async () => {
    const res = await provider.charge({ amountCents: 2500, description: "Wallet top-up" });
    expect(res.status).toBe("succeeded");
    expect(res.providerRef).toMatch(/^ch_mock_/);
  });

  it("rechaza un monto no positivo", async () => {
    const res = await provider.charge({ amountCents: 0, description: "x" });
    expect(res.status).toBe("failed");
  });
});
