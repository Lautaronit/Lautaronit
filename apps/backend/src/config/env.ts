/**
 * env.ts
 * -----------------------------------------------------------------------------
 * Carga y valida las variables de entorno con zod. Si falta algo obligatorio,
 * la app falla al arrancar con un mensaje claro (mejor que romper a mitad de
 * camino con un valor `undefined`).
 */

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  // Modelo que usa el agente con IA. Por defecto Opus 5.5; se puede poner uno más
  // barato (ej. "claude-haiku-5-5") sin tocar código.
  AGENT_MODEL: z.string().min(1).default("claude-opus-5-5"),
  // Instacart Developer Platform. Sin clave, la integración queda inactiva.
  INSTACART_API_KEY: z.string().optional().default(""),
  INSTACART_API_URL: z.string().min(1).default("https://connect.instacart.com"),
  // Secreto para firmar los JWT. En producción DEBE ser un valor largo y secreto.
  JWT_SECRET: z.string().min(1).default("dev-secret-cambiar-en-produccion"),
  // Orígenes permitidos para CORS (separados por coma). Vacío = permitir todos
  // (cómodo en desarrollo). En producción, poné el dominio de tu app.
  CORS_ORIGIN: z.string().optional().default(""),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Si hay clave de Claude, el agente usa IA real; si no, modo reglas. */
export const hasAI = env.ANTHROPIC_API_KEY.trim().length > 0;
