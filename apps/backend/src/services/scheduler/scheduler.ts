/**
 * scheduler.ts
 * -----------------------------------------------------------------------------
 * El scheduler que hace que los pedidos programados se ejecuten solos. Cada
 * minuto revisa las recurrencias activas y dispara las que "tocan" en este
 * minuto, creando un pedido real (vinculado a la programación).
 *
 * La decisión de "¿toca ahora?" vive en `isDue`, una función PURA (sin base de
 * datos) y por eso fácil de testear. El `Scheduler` es la cáscara que lee la DB,
 * llama a `isDue` y ejecuta el pedido.
 */

import { prisma } from "../../db.js";
import type { OrderService } from "../orders/orderService.js";
import { cronMatches } from "./cron.js";

/** Lo mínimo que `isDue` necesita saber de una programación. */
export interface DueCandidate {
  cron: string;
  lastRunAt: Date | null;
}

/** ¿Esta recurrencia debe ejecutarse en `now`? (pura, sin efectos). */
export function isDue(candidate: DueCandidate, now: Date): boolean {
  if (!cronMatches(candidate.cron, now)) return false;
  // Evita dispararla dos veces en el mismo minuto si hay dos ticks seguidos.
  if (candidate.lastRunAt) {
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);
    if (candidate.lastRunAt >= minuteStart) return false;
  }
  return true;
}

/** Datos de una programación que necesitamos para ejecutarla. */
export interface RunnableSchedule {
  id: string;
  userId: string;
  message: string;
  budgetCents: number | null;
}

/**
 * Ejecuta UNA programación ahora: crea el pedido (con el presupuesto guardado) y
 * registra la hora de ejecución. Lo usan tanto el tick automático como el botón
 * "Run now" de la app.
 */
export async function runScheduledOrder(
  orderService: OrderService,
  schedule: RunnableSchedule,
) {
  const out = await orderService.createFromMessage({
    userId: schedule.userId,
    message: schedule.message,
    scheduleId: schedule.id,
    budgetCentsOverride: schedule.budgetCents ?? undefined,
  });
  await prisma.scheduledOrder.update({
    where: { id: schedule.id },
    data: { lastRunAt: new Date() },
  });
  return out;
}

/** Logger mínimo que nos alcanza (lo cumple el logger de Fastify). */
interface Logger {
  info(msg: string): void;
  error(obj: unknown): void;
}

export class Scheduler {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly orderService: OrderService,
    private readonly logger?: Logger,
  ) {}

  /** Arranca el barrido periódico (por defecto, cada minuto). */
  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    // No bloquea el cierre del proceso si es lo único que queda vivo.
    this.timer.unref?.();
    this.logger?.info("Scheduler started (checking every minute).");
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Un barrido: busca las activas que tocan ahora y las ejecuta. Devuelve
   * cuántas disparó. Un error en una no frena a las demás.
   */
  async tick(now: Date = new Date()): Promise<number> {
    const schedules = await prisma.scheduledOrder.findMany({ where: { active: true } });
    let fired = 0;
    for (const s of schedules) {
      if (!isDue(s, now)) continue;
      try {
        const out = await runScheduledOrder(this.orderService, s);
        fired++;
        this.logger?.info(`Scheduler ran "${s.message}" -> ${out.result.status}`);
      } catch (err) {
        this.logger?.error(err);
      }
    }
    return fired;
  }
}
