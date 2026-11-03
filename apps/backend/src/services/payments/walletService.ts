/**
 * walletService.ts
 * -----------------------------------------------------------------------------
 * La lógica de la billetera. Un solo lugar que:
 *   - lee el saldo y el historial de movimientos,
 *   - carga saldo (top-up) cobrando con el proveedor de pagos,
 *   - descuenta saldo cuando se confirma un pedido,
 *   - administra las tarjetas guardadas.
 *
 * El saldo vive cacheado en `User.walletBalanceCents`, pero la fuente de verdad
 * es el ledger (`WalletTransaction`): cada cambio de saldo se escribe como una
 * fila, DENTRO de la misma transacción en la que se actualiza el cache. Así el
 * saldo y el historial nunca quedan desalineados.
 */

import { prisma } from "../../db.js";
import { CardError, type CardInput, type PaymentProvider } from "./provider.js";

/** Tope de carga por operación (defensa básica): $10,000. */
const MAX_TOPUP_CENTS = 1_000_000;

export class WalletService {
  constructor(private readonly provider: PaymentProvider) {}

  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalanceCents: true },
    });
    return user?.walletBalanceCents ?? 0;
  }

  async listTransactions(userId: string, take = 50) {
    return prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async listCards(userId: string) {
    return prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /** Registra una tarjeta (simulada). La primera queda como predeterminada. */
  async addCard(userId: string, input: CardInput) {
    const attached = await this.provider.attachCard(input); // puede lanzar CardError
    const existing = await prisma.paymentMethod.count({ where: { userId } });
    return prisma.paymentMethod.create({
      data: {
        userId,
        brand: attached.brand,
        last4: attached.last4,
        expMonth: attached.expMonth,
        expYear: attached.expYear,
        providerRef: attached.providerRef,
        isDefault: existing === 0, // la primera tarjeta es la predeterminada
      },
    });
  }

  async removeCard(userId: string, cardId: string): Promise<boolean> {
    const { count } = await prisma.paymentMethod.deleteMany({
      where: { id: cardId, userId },
    });
    return count > 0;
  }

  /**
   * Carga saldo cobrando con el proveedor. Si no se pasa tarjeta, usa la
   * predeterminada. El cobro y el asiento en el ledger ocurren juntos.
   */
  async topUp(userId: string, amountCents: number, paymentMethodId?: string) {
    if (amountCents <= 0) throw new WalletError("Enter an amount greater than $0.", 400);
    if (amountCents > MAX_TOPUP_CENTS) throw new WalletError("That amount is too large.", 400);

    const card = paymentMethodId
      ? await prisma.paymentMethod.findFirst({ where: { id: paymentMethodId, userId } })
      : await prisma.paymentMethod.findFirst({
          where: { userId },
          orderBy: { isDefault: "desc" },
        });
    if (!card) throw new WalletError("Add a card before adding funds.", 400);

    const charge = await this.provider.charge({
      amountCents,
      paymentMethodRef: card.providerRef ?? undefined,
      description: "Wallet top-up",
    });
    if (charge.status !== "succeeded") {
      throw new WalletError(charge.message ?? "The payment was declined.", 402);
    }

    // Cobro OK -> sumamos saldo y asentamos el movimiento, todo junto.
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { walletBalanceCents: { increment: amountCents } },
        select: { walletBalanceCents: true },
      });
      const movement = await tx.walletTransaction.create({
        data: {
          userId,
          type: "topup",
          amountCents,
          balanceAfterCents: user.walletBalanceCents,
          description: `Added funds · ${card.brand} ••${card.last4}`,
          paymentMethodId: card.id,
          providerRef: charge.providerRef,
        },
      });
      return { balanceCents: user.walletBalanceCents, transaction: movement };
    });
  }

  /** ¿Alcanza el saldo para gastar `amountCents`? */
  async hasSufficient(userId: string, amountCents: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amountCents;
  }

  /**
   * Descuenta saldo por un pedido confirmado. Lanza `InsufficientFundsError` si
   * no alcanza (re-chequea el saldo dentro de la transacción para evitar carreras).
   */
  async debit(
    userId: string,
    amountCents: number,
    meta: { orderId?: string; description: string },
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalanceCents: true },
      });
      const balance = user?.walletBalanceCents ?? 0;
      if (balance < amountCents) {
        throw new InsufficientFundsError(amountCents - balance);
      }
      const updated = await tx.user.update({
        where: { id: userId },
        data: { walletBalanceCents: { decrement: amountCents } },
        select: { walletBalanceCents: true },
      });
      await tx.walletTransaction.create({
        data: {
          userId,
          type: "order_debit",
          amountCents: -amountCents,
          balanceAfterCents: updated.walletBalanceCents,
          description: meta.description,
          orderId: meta.orderId,
        },
      });
      return { balanceCents: updated.walletBalanceCents };
    });
  }
}

/** Error de billetera con código HTTP (para que la API responda bien). */
export class WalletError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

/** Saldo insuficiente: lleva cuánto falta (en centavos) para el mensaje. */
export class InsufficientFundsError extends Error {
  constructor(public readonly shortfallCents: number) {
    super("Insufficient balance.");
    this.name = "InsufficientFundsError";
  }
}

// Re-export para comodidad de quien importe desde acá.
export { CardError };
