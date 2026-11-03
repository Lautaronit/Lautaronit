/**
 * index.ts
 * -----------------------------------------------------------------------------
 * Punto de arranque del backend: construye la app, levanta el servidor HTTP y
 * maneja el cierre ordenado (para no dejar conexiones de base de datos colgadas).
 */

import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDb } from "./db.js";

async function main(): Promise<void> {
  const app = await buildApp({ startScheduler: true });

  // Cierre ordenado ante Ctrl+C o señales del sistema.
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      app.log.info(`Recibido ${signal}, cerrando...`);
      await app.close();
      await disconnectDb();
      process.exit(0);
    });
  }

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`On It escuchando en http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
