/**
 * auth.ts (plugin)
 * -----------------------------------------------------------------------------
 * Configura JWT en la app y expone un "guardián" `app.authenticate` que se usa
 * como preHandler en las rutas protegidas. Si el token falta o es inválido,
 * responde 401 y la ruta no se ejecuta.
 */

import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

// Tipado: qué guarda el token y qué queda en `req.user`.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string };
    user: { id: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await req.jwtVerify();
      } catch {
        await reply
          .code(401)
          .send({ error: "Unauthorized. Please log in to continue." });
      }
    },
  );
}
