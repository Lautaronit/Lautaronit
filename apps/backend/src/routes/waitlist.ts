/**
 * routes/waitlist.ts
 * -----------------------------------------------------------------------------
 * Lista de espera pre-lanzamiento ("Skip the Trip"). Rutas PÚBLICAS (sin token):
 *   - GET  /waitlist         -> sirve la landing (HTML).
 *   - GET  /waitlist/count   -> cuántos se anotaron (social proof).
 *   - POST /waitlist         -> alta de un email (deduplicado).
 *
 * Los emails quedan en TU base de datos (tabla WaitlistSignup), listos para
 * exportar y avisarles cuando la app salga en la App Store.
 */

import type { FastifyInstance } from "fastify";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { prisma } from "../db.js";

// La landing vive como archivo aparte (HTML limpio) y se lee una sola vez.
const here = dirname(fileURLToPath(import.meta.url));
const landingHtml = readFileSync(join(here, "waitlist.landing.html"), "utf8");

const signupBody = z.object({
  email: z.string().email("Please enter a valid email.").max(200),
  source: z.string().max(60).optional(),
});

export function registerWaitlistRoutes(app: FastifyInstance): void {
  // Landing pública.
  app.get("/waitlist", async (_req, reply) => {
    return reply.type("text/html; charset=utf-8").send(landingHtml);
  });

  // Cantidad de anotados (para el "social proof" de la landing).
  app.get("/waitlist/count", async () => {
    const count = await prisma.waitlistSignup.count();
    return { count };
  });

  // Alta en la lista de espera.
  app.post("/waitlist", async (req, reply) => {
    const parsed = signupBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Please enter a valid email." });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const source = parsed.data.source?.trim() || null;

    // ¿Ya estaba? Devolvemos su posición y no duplicamos.
    const existing = await prisma.waitlistSignup.findUnique({ where: { email } });
    if (existing) {
      const position = await prisma.waitlistSignup.count({
        where: { createdAt: { lte: existing.createdAt } },
      });
      return reply.code(200).send({ ok: true, already: true, position });
    }

    try {
      await prisma.waitlistSignup.create({ data: { email, source } });
    } catch {
      // Carrera (dos altas del mismo email a la vez): lo tratamos como ya anotado.
      return reply.code(200).send({ ok: true, already: true });
    }
    const position = await prisma.waitlistSignup.count();
    return reply.code(201).send({ ok: true, position });
  });
}
