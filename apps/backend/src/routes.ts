/**
 * routes.ts
 * -----------------------------------------------------------------------------
 * Endpoints de pedidos y comercios. Las rutas de pedidos están PROTEGIDAS: el
 * `userId` se toma del token JWT (`req.user.id`), nunca del cuerpo de la
 * petición. Así un usuario no puede operar en nombre de otro.
 */

import type { FastifyInstance } from "fastify";
import type { MerchantRegistry } from "@on-it/connectors";
import { z } from "zod";
import { prisma } from "./db.js";
import { OrderError, type OrderService } from "./services/orders/orderService.js";
import { BasketError, type BasketService } from "./services/orders/basketService.js";
import { CartLinkError } from "@on-it/connectors";
import type { OrderingAgent } from "./services/ai/agent.js";
import { runScheduledOrder } from "./services/scheduler/scheduler.js";

const createOrderBody = z.object({
  message: z.string().min(1, "Message can't be empty.").max(1000),
  addressId: z.string().optional(),
});

// Un cron válido tiene 5 campos separados por espacios (min hora dom mes dow).
// No validamos la semántica fina acá; la app arma expresiones conocidas.
const cronField = z
  .string()
  .min(1)
  .max(100)
  .refine((v) => v.trim().split(/\s+/).length === 5, {
    message: "Cron must have 5 fields.",
  });

const createScheduleBody = z.object({
  message: z.string().min(1, "Message can't be empty.").max(1000),
  cron: cronField,
  budgetCents: z.number().int().positive().optional(),
});

const updateScheduleBody = z.object({
  active: z.boolean().optional(),
  cron: cronField.optional(),
  message: z.string().min(1).max(1000).optional(),
  budgetCents: z.number().int().positive().nullable().optional(),
});

const planBasketBody = z.object({
  budgetCents: z.number().int().positive(),
  proteinG: z.number().min(0).max(100000).optional(),
  carbsG: z.number().min(0).max(100000).optional(),
  fatG: z.number().min(0).max(100000).optional(),
  merchantId: z.string().optional(),
});

const basketLine = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
});

const orderBasketBody = z.object({
  merchantId: z.string().min(1),
  lines: z.array(basketLine).min(1, "The basket is empty."),
  budgetCents: z.number().int().positive().optional(),
});

export function registerRoutes(
  app: FastifyInstance,
  deps: {
    registry: MerchantRegistry;
    orderService: OrderService;
    agent: OrderingAgent;
    basket: BasketService;
  },
): void {
  // --- Públicas -------------------------------------------------------------

  app.get("/health", async () => ({ status: "ok", service: "on-it" }));

  app.get("/merchants", async () => {
    return deps.registry.list().map((c) => c.info);
  });

  app.get("/merchants/:id/catalog", async (req, reply) => {
    const { id } = req.params as { id: string };
    const connector = deps.registry.get(id);
    if (!connector) {
      return reply.code(404).send({ error: `Merchant not found: ${id}` });
    }
    return connector.getCatalog();
  });

  // --- Protegidas (requieren token) -----------------------------------------

  // Crear un pedido a partir de un mensaje en lenguaje natural.
  app.post(
    "/orders",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = createOrderBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
      }

      try {
        const out = await deps.orderService.createFromMessage({
          userId: req.user.id, // <- del token, no del cliente
          message: parsed.data.message,
          addressId: parsed.data.addressId,
        });
        return reply.code(201).send(out);
      } catch (err) {
        if (err instanceof OrderError) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        req.log.error(err);
        return reply.code(500).send({ error: "Internal error while creating the order." });
      }
    },
  );

  // Historial de pedidos del usuario autenticado.
  app.get("/orders", { preHandler: [app.authenticate] }, async (req, reply) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 50,
    });
    return reply.send(orders);
  });

  // Repetir un pedido pasado: reusa el mensaje original y vuelve a ordenar.
  app.post(
    "/orders/:id/reorder",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      // Importante: filtramos por userId para no dejar repetir pedidos ajenos.
      const original = await prisma.order.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!original) {
        return reply.code(404).send({ error: "Order not found." });
      }
      if (!original.rawMessage) {
        return reply.code(422).send({ error: "This order can't be repeated." });
      }

      try {
        const out = await deps.orderService.createFromMessage({
          userId: req.user.id,
          message: original.rawMessage,
          addressId: original.addressId ?? undefined,
        });
        return reply.code(201).send(out);
      } catch (err) {
        if (err instanceof OrderError) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        req.log.error(err);
        return reply.code(500).send({ error: "Internal error while repeating the order." });
      }
    },
  );

  // --- Canasta por macros ---------------------------------------------------

  // Arma (sin pedir) una canasta del súper que se ajuste al presupuesto y a los
  // objetivos de macros. Devuelve las líneas propuestas y los totales.
  app.post("/baskets/plan", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = planBasketBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    try {
      const plan = await deps.basket.plan({
        budgetCents: parsed.data.budgetCents,
        targets: {
          proteinG: parsed.data.proteinG,
          carbsG: parsed.data.carbsG,
          fatG: parsed.data.fatG,
        },
        merchantId: parsed.data.merchantId,
      });
      return reply.send(plan);
    } catch (err) {
      if (err instanceof BasketError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while building the basket." });
    }
  });

  // Convierte una canasta en un link de compra de Instacart (si está conectado).
  app.post("/baskets/instacart-link", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = orderBasketBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    if (!deps.basket.instacartConfigured) {
      return reply.code(503).send({
        error: "Instacart isn't connected yet. Add an INSTACART_API_KEY to enable real stores.",
      });
    }
    try {
      const out = await deps.basket.instacartLink({
        lines: parsed.data.lines,
        merchantId: parsed.data.merchantId,
      });
      return reply.send(out);
    } catch (err) {
      if (err instanceof CartLinkError) {
        return reply.code(502).send({ error: err.message });
      }
      if (err instanceof BasketError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while building the Instacart link." });
    }
  });

  // Hace el pedido de una canasta ya armada (líneas explícitas).
  app.post("/orders/from-basket", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = orderBasketBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    try {
      const out = await deps.orderService.createFromLines({
        userId: req.user.id,
        merchantId: parsed.data.merchantId,
        lines: parsed.data.lines,
        budgetCents: parsed.data.budgetCents,
      });
      return reply.code(201).send(out);
    } catch (err) {
      if (err instanceof OrderError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while ordering the basket." });
    }
  });

  // --- Pedidos programados (recurrencias) -----------------------------------

  // Lista las programaciones del usuario (más nuevas primero).
  app.get("/schedules", { preHandler: [app.authenticate] }, async (req, reply) => {
    const schedules = await prisma.scheduledOrder.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(schedules);
  });

  // Crea una programación. Validamos el mensaje con el agente: solo se puede
  // programar algo que realmente sabemos ordenar (y de paso resolvemos el
  // comercio y un presupuesto sugerido si el mensaje lo trae).
  app.post("/schedules", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    const interpreted = await deps.agent.interpret(parsed.data.message);
    if (!interpreted.ok) {
      return reply.code(422).send({ error: interpreted.reason });
    }

    const schedule = await prisma.scheduledOrder.create({
      data: {
        userId: req.user.id,
        merchantId: interpreted.intent.merchantId,
        cron: parsed.data.cron.trim(),
        message: parsed.data.message,
        budgetCents: parsed.data.budgetCents ?? interpreted.intent.budgetCents ?? null,
      },
    });
    return reply.code(201).send(schedule);
  });

  // Actualiza una programación (pausar/reanudar, cambiar horario, etc.).
  app.patch("/schedules/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateScheduleBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }

    // Solo deja tocar programaciones propias.
    const { count } = await prisma.scheduledOrder.updateMany({
      where: { id, userId: req.user.id },
      data: {
        ...(parsed.data.active !== undefined && { active: parsed.data.active }),
        ...(parsed.data.cron !== undefined && { cron: parsed.data.cron.trim() }),
        ...(parsed.data.message !== undefined && { message: parsed.data.message }),
        ...(parsed.data.budgetCents !== undefined && { budgetCents: parsed.data.budgetCents }),
      },
    });
    if (count === 0) {
      return reply.code(404).send({ error: "Schedule not found." });
    }

    const schedule = await prisma.scheduledOrder.findUnique({ where: { id } });
    return reply.send(schedule);
  });

  // Elimina una programación propia.
  app.delete("/schedules/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { count } = await prisma.scheduledOrder.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (count === 0) {
      return reply.code(404).send({ error: "Schedule not found." });
    }
    return reply.code(204).send();
  });

  // Ejecuta una programación AHORA (botón "Run now"): mismo camino que usa el
  // scheduler automático, pero disparado a mano.
  app.post("/schedules/:id/run", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const schedule = await prisma.scheduledOrder.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!schedule) {
      return reply.code(404).send({ error: "Schedule not found." });
    }
    try {
      const out = await runScheduledOrder(deps.orderService, schedule);
      return reply.code(201).send(out);
    } catch (err) {
      if (err instanceof OrderError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      req.log.error(err);
      return reply.code(500).send({ error: "Internal error while running the schedule." });
    }
  });

  // Cuenta del usuario autenticado (para la pantalla de Settings).
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) return reply.code(404).send({ error: "User not found." });
    return reply.send(user);
  });
}
