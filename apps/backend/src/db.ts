/**
 * db.ts
 * -----------------------------------------------------------------------------
 * Única instancia del cliente de Prisma para toda la app (patrón singleton).
 * Reutilizar una sola conexión evita agotar el pool de la base de datos.
 */

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/** Cierre ordenado de la conexión cuando el proceso termina. */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
