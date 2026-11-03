/**
 * routes/account.ts
 * -----------------------------------------------------------------------------
 * Direcciones de entrega y preferencias del usuario (Settings). Todo protegido:
 * el `userId` sale del token, nunca del cuerpo.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const createAddressBody = z.object({
  label: z.string().max(60).optional(),
  street: z.string().min(1, "Street is required.").max(200),
  city: z.string().min(1, "City is required.").max(120),
  notes: z.string().max(300).optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressBody = z.object({
  label: z.string().max(60).nullable().optional(),
  street: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(120).optional(),
  notes: z.string().max(300).nullable().optional(),
  isDefault: z.boolean().optional(),
});

const preferencesBody = z.object({
  usualOrder: z.string().max(1000).nullable().optional(),
  dietaryNotes: z.string().max(1000).nullable().optional(),
  notifyOnOrder: z.boolean().optional(),
});

export function registerAccountRoutes(app: FastifyInstance): void {
  // --- Direcciones ----------------------------------------------------------

  app.get("/addresses", { preHandler: [app.authenticate] }, async (req, reply) => {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return reply.send(addresses);
  });

  app.post("/addresses", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createAddressBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    // La primera dirección es la predeterminada aunque no lo pidan.
    const count = await prisma.address.count({ where: { userId: req.user.id } });
    const makeDefault = parsed.data.isDefault || count === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId: req.user.id },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId: req.user.id,
          label: parsed.data.label ?? null,
          street: parsed.data.street,
          city: parsed.data.city,
          notes: parsed.data.notes ?? null,
          isDefault: makeDefault,
        },
      });
    });
    return reply.code(201).send(address);
  });

  app.patch("/addresses/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateAddressBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    // Debe ser una dirección propia.
    const owned = await prisma.address.findFirst({ where: { id, userId: req.user.id } });
    if (!owned) return reply.code(404).send({ error: "Address not found." });

    const d = parsed.data;
    const address = await prisma.$transaction(async (tx) => {
      if (d.isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user.id },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(d.label !== undefined && { label: d.label }),
          ...(d.street !== undefined && { street: d.street }),
          ...(d.city !== undefined && { city: d.city }),
          ...(d.notes !== undefined && { notes: d.notes }),
          ...(d.isDefault !== undefined && { isDefault: d.isDefault }),
        },
      });
    });
    return reply.send(address);
  });

  app.delete("/addresses/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { count } = await prisma.address.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (count === 0) return reply.code(404).send({ error: "Address not found." });

    // Si borramos la predeterminada, ascendemos otra para no quedar sin default.
    const stillDefault = await prisma.address.findFirst({
      where: { userId: req.user.id, isDefault: true },
    });
    if (!stillDefault) {
      const next = await prisma.address.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return reply.code(204).send();
  });

  // --- Preferencias ---------------------------------------------------------

  app.get("/preferences", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { usualOrder: true, dietaryNotes: true, notifyOnOrder: true },
    });
    if (!user) return reply.code(404).send({ error: "User not found." });
    return reply.send(user);
  });

  app.patch("/preferences", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = preferencesBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    const d = parsed.data;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(d.usualOrder !== undefined && { usualOrder: d.usualOrder }),
        ...(d.dietaryNotes !== undefined && { dietaryNotes: d.dietaryNotes }),
        ...(d.notifyOnOrder !== undefined && { notifyOnOrder: d.notifyOnOrder }),
      },
      select: { usualOrder: true, dietaryNotes: true, notifyOnOrder: true },
    });
    return reply.send(user);
  });
}
