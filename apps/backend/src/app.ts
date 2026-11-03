/**
 * app.ts
 * -----------------------------------------------------------------------------
 * Arma la aplicación Fastify y conecta todas las piezas. El orden importa:
 * primero las defensas (rate-limit, JWT) y recién después las rutas.
 *
 * Es async porque registrar plugins (JWT, rate-limit) lo es.
 */

import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createDefaultRegistry, InstacartCartProvider } from "@on-it/connectors";
import { RuleBasedAgent } from "./services/ai/agent.js";
import { ClaudeAgent } from "./services/ai/claudeAgent.js";
import { OrderService } from "./services/orders/orderService.js";
import { BasketService } from "./services/orders/basketService.js";
import { MockStripeProvider } from "./services/payments/provider.js";
import { WalletService } from "./services/payments/walletService.js";
import { Scheduler } from "./services/scheduler/scheduler.js";
import { registerRoutes } from "./routes.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWalletRoutes } from "./routes/wallet.js";
import { registerAccountRoutes } from "./routes/account.js";
import { registerAuth } from "./plugins/auth.js";
import { env, hasAI } from "./config/env.js";

export interface BuildAppOptions {
  /** Arranca el scheduler de recurrencias (solo en el server real, no en tests). */
  startScheduler?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  // bodyLimit: rechaza cuerpos enormes (defensa básica contra abuso).
  const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });

  // 1) Defensas antes que nada.
  // CORS: en desarrollo permitimos cualquier origen (la app web corre en otro
  // puerto). En producción conviene restringirlo al dominio real de la app.
  // Declaramos los métodos explícitamente: el default de @fastify/cors deja
  // solo GET/HEAD/POST, y necesitamos PATCH/DELETE para las programaciones.
  // En producción, CORS_ORIGIN restringe a los dominios de la app; vacío = todos.
  const corsOrigin = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
    : true;
  await app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await registerAuth(app); // JWT + guardián app.authenticate

  // 2) Comercios y cerebro. Con clave de Claude usamos el agente con IA (que
  //    cae al de reglas si algo falla); sin clave, directamente el de reglas.
  const registry = createDefaultRegistry();
  const ruleBased = new RuleBasedAgent(registry);
  const agent = hasAI
    ? new ClaudeAgent(registry, ruleBased, env.AGENT_MODEL, env.ANTHROPIC_API_KEY)
    : ruleBased;
  app.log.info(
    hasAI
      ? `IA: clave de Claude detectada — agente con IA activo (modelo ${env.AGENT_MODEL}).`
      : "IA: sin clave de Claude — el agente corre en modo reglas.",
  );
  // Pagos: proveedor simulado (Stripe-ready) + billetera.
  const paymentProvider = new MockStripeProvider();
  const wallet = new WalletService(paymentProvider);
  const orderService = new OrderService(registry, agent, wallet);
  const instacart = new InstacartCartProvider(env.INSTACART_API_KEY, env.INSTACART_API_URL);
  const basket = new BasketService(registry, instacart);
  app.log.info(
    instacart.configured
      ? "Instacart: clave detectada — links de compra reales activos."
      : "Instacart: sin clave — la integración queda inactiva.",
  );

  // 3) Rutas.
  registerAuthRoutes(app);
  registerRoutes(app, { registry, orderService, agent, basket });
  registerWalletRoutes(app, { wallet });
  registerAccountRoutes(app);

  // 4) Scheduler de recurrencias. Se construye siempre, pero solo "late" cuando
  //    se lo pide (el server real); en tests queda quieto.
  const scheduler = new Scheduler(orderService, app.log);
  if (options.startScheduler) {
    scheduler.start();
    app.addHook("onClose", async () => scheduler.stop());
  }

  return app;
}
