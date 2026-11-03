/**
 * routes/auth.ts
 * -----------------------------------------------------------------------------
 * Endpoints de registro e inicio de sesión. Devuelven un JWT que el cliente
 * manda luego en el header `Authorization: Bearer <token>`.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../services/auth/password.js";

const registerBody = z.object({
  email: z.string().email("Invalid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().min(1).optional(),
});

const loginBody = z.object({
  email: z.string().email("Invalid email."),
  password: z.string().min(1, "Password is required."),
});

export function registerAuthRoutes(app: FastifyInstance): void {
  // Crear cuenta.
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "An account with that email already exists." });
    }

    const user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash: await hashPassword(password) },
    });

    const token = app.jwt.sign({ id: user.id });
    return reply.code(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });

  // Iniciar sesión.
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten().fieldErrors });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message whether or not the user exists: don't reveal which emails exist.
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: "Incorrect email or password." });
    }

    const token = app.jwt.sign({ id: user.id });
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });
}
