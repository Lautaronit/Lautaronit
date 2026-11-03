/**
 * routes/wallet.ts
 * -----------------------------------------------------------------------------
 * Endpoints de la billetera y de las tarjetas. Todo protegido: el `userId` sale
 * del token, nunca del cuerpo, así nadie opera la billetera de otra persona.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import {
  CardError,
  WalletError,
  type WalletService,
} from "../services/payments/walletService.js";

const topUpBody = z.object({
  amountCents: z.number().int().positive(),
  paymentMethodId: z.string().optional(),
});

const addCardBody = z.object({
  number: z.string().min(12).max(25),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2100),
  cvc: z.string().min(3).max(4),
});

export function registerWalletRoutes(
  app: FastifyInstance,
  deps: { wallet: WalletService },
): void {
  // Saldo actual.
  app.get("/wallet", { preHandler: [app.authenticate] }, async (req, reply) => {
    const balanceCents = await deps.wallet.getBalance(req.user.id);
    return reply.send({ balanceCents, currency: "USD" });
  });

  // Historial de movimientos.
  app.get("/wallet/transactions", { preHandler: [app.authenticate] }, async (req, reply) => {
    const txns = await deps.wallet.listTransactions(req.user.id);
    return reply.send(txns);
  });

  // Cargar saldo.
  app.post("/wallet/topup", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = topUpBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    try {
      const out = await deps.wallet.topUp(
        req.user.id,
        parsed.data.amountCents,
        parsed.data.paymentMethodId,
      );
      return reply.code(201).send(out);
    } catch (err) {
      if (err instanceof WalletError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while adding funds." });
    }
  });

  // Tarjetas guardadas.
  app.get("/payment-methods", { preHandler: [app.authenticate] }, async (req, reply) => {
    const cards = await deps.wallet.listCards(req.user.id);
    return reply.send(cards);
  });

  app.post("/payment-methods", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = addCardBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    try {
      const card = await deps.wallet.addCard(req.user.id, parsed.data);
      return reply.code(201).send(card);
    } catch (err) {
      if (err instanceof CardError) {
        return reply.code(400).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while saving the card." });
    }
  });

  app.delete("/payment-methods/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await deps.wallet.removeCard(req.user.id, id);
    if (!ok) return reply.code(404).send({ error: "Card not found." });
    return reply.code(204).send();
  });

  // Marca una tarjeta como predeterminada (desmarca las demás).
  app.patch("/payment-methods/:id/default", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.paymentMethod.findFirst({ where: { id, userId: req.user.id } });
    if (!owned) return reply.code(404).send({ error: "Card not found." });

    const card = await prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
      return tx.paymentMethod.update({ where: { id }, data: { isDefault: true } });
    });
    return reply.send(card);
  });
}
