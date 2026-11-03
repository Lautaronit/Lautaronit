/**
 * provider.ts
 * -----------------------------------------------------------------------------
 * El "procesador de pagos" detrás de una interfaz, igual que hicimos con los
 * comercios y con el agente. Hoy hay una implementación SIMULADA
 * (`MockStripeProvider`) que no cobra plata de verdad; mañana, cuando haya una
 * cuenta de Stripe, se escribe `StripeProvider` cumpliendo esta misma interfaz
 * y el resto de la app (WalletService, rutas, UI) no cambia.
 *
 * Importante sobre tarjetas: NUNCA se guarda el número completo. El proveedor
 * recibe el número solo para validarlo/registrarlo y devuelve lo que es seguro
 * mostrar (marca + últimos 4) más una referencia opaca (`providerRef`).
 */

export interface CardInput {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
}

export interface AttachedCard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  providerRef: string;
}

export interface ChargeInput {
  amountCents: number;
  /** Referencia del medio de pago en el proveedor (Stripe: pm_...). */
  paymentMethodRef?: string;
  description: string;
}

export interface ChargeResult {
  status: "succeeded" | "failed";
  providerRef: string;
  message?: string;
}

export interface PaymentProvider {
  /** Registra una tarjeta y devuelve datos seguros + una referencia opaca. */
  attachCard(input: CardInput): Promise<AttachedCard>;
  /** Cobra un monto (para cargar la billetera). */
  charge(input: ChargeInput): Promise<ChargeResult>;
}

/** Error al registrar una tarjeta (ej. número no válido). */
export class CardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardError";
  }
}

// --- Implementación simulada --------------------------------------------------

/**
 * Prefijos de las TARJETAS DE PRUEBA de Stripe que aceptamos. Solo trabajamos
 * con números de test: así nadie ingresa una tarjeta real y el flujo es idéntico
 * al que usará Stripe en modo test cuando lo enchufemos.
 */
const TEST_CARDS: { brand: string; prefixes: string[] }[] = [
  { brand: "Visa", prefixes: ["4242", "4000"] },
  { brand: "Mastercard", prefixes: ["5555", "5200", "2223"] },
  { brand: "Amex", prefixes: ["3782", "3714"] },
  { brand: "Discover", prefixes: ["6011"] },
];

function detectBrand(digits: string): string | null {
  for (const card of TEST_CARDS) {
    if (card.prefixes.some((p) => digits.startsWith(p))) return card.brand;
  }
  return null;
}

/** Validación Luhn (checksum estándar de tarjetas). */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export class MockStripeProvider implements PaymentProvider {
  async attachCard(input: CardInput): Promise<AttachedCard> {
    const digits = input.number.replace(/\D/g, "");
    if (digits.length < 12 || digits.length > 19) {
      throw new CardError("That card number doesn't look right.");
    }
    const brand = detectBrand(digits);
    if (!brand || !luhnValid(digits)) {
      // Solo aceptamos tarjetas de prueba de Stripe (ej. 4242 4242 4242 4242).
      throw new CardError("Use a Stripe test card, e.g. 4242 4242 4242 4242.");
    }
    if (input.expMonth < 1 || input.expMonth > 12) {
      throw new CardError("Invalid expiration month.");
    }

    return {
      brand,
      last4: digits.slice(-4),
      expMonth: input.expMonth,
      expYear: input.expYear,
      providerRef: `pm_mock_${Math.random().toString(36).slice(2, 12)}`,
    };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.amountCents <= 0) {
      return { status: "failed", providerRef: "", message: "Invalid amount." };
    }
    // Simulación: el cobro siempre entra. El StripeProvider real haría aquí un
    // PaymentIntent y podría devolver "failed" (tarjeta rechazada, etc.).
    return {
      status: "succeeded",
      providerRef: `ch_mock_${Math.random().toString(36).slice(2, 12)}`,
    };
  }
}
