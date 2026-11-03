/**
 * password.test.ts
 * -----------------------------------------------------------------------------
 * Verifica el hasheo de contraseñas: round-trip correcto, rechazo de la
 * contraseña equivocada y que dos hashes de la misma contraseña difieren (salt).
 */

import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("verifica correctamente la contraseña correcta", async () => {
    const hash = await hashPassword("miClave123");
    expect(await verifyPassword("miClave123", hash)).toBe(true);
  });

  it("rechaza la contraseña incorrecta", async () => {
    const hash = await hashPassword("miClave123");
    expect(await verifyPassword("otraClave", hash)).toBe(false);
  });

  it("genera hashes distintos para la misma contraseña (salt aleatorio)", async () => {
    const a = await hashPassword("igual");
    const b = await hashPassword("igual");
    expect(a).not.toBe(b);
  });

  it("no explota con un hash con formato inválido", async () => {
    expect(await verifyPassword("x", "basura-sin-formato")).toBe(false);
  });
});
