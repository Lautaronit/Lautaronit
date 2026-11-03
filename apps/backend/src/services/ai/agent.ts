/**
 * agent.ts
 * -----------------------------------------------------------------------------
 * El "cerebro" que entiende un pedido escrito en lenguaje natural y lo traduce
 * a algo que un comercio pueda ejecutar (qué SKUs, qué cantidades, qué tope de
 * gasto).
 *
 * Definimos la interfaz `OrderingAgent` y una implementación por REGLAS
 * (`RuleBasedAgent`) que funciona SIN clave de IA, para poder probar todo el
 * flujo desde el día uno. Cuando sumemos Claude, será otra clase que cumpla la
 * misma interfaz — el resto de la app no cambia.
 */

import type { MerchantRegistry, OrderLineInput } from "@on-it/connectors";

/** El pedido ya interpretado y estructurado. */
export interface OrderIntent {
  merchantId: string;
  lines: OrderLineInput[];
  budgetCents?: number;
  /** Explicación legible de cómo se interpretó (para mostrarle al usuario). */
  notes: string;
}

export type AgentResult =
  | { ok: true; intent: OrderIntent }
  | { ok: false; reason: string };

export interface OrderingAgent {
  /** Interpreta el mensaje del usuario y devuelve un pedido estructurado. */
  interpret(message: string): Promise<AgentResult>;
}

// --- Utilidades de parseo -----------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // saca tildes: "menú" -> "menu"
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detects a budget like "$20", "budget 15", "under 8".
 * Key: it ONLY picks it up when the amount sits next to "$" or a budget word,
 * so a product quantity ("5 big mac") is never mistaken for the spending cap.
 */
function parseBudget(text: string): number | undefined {
  const re =
    /(?:\$|budget|spend|limit|max|up to|under)\s*\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)/;
  const match = text.match(re);
  if (!match) return undefined;
  const digits = match[1]!.replace(/[.,]/g, "");
  const pesos = Number.parseInt(digits, 10);
  if (Number.isNaN(pesos) || pesos <= 0) return undefined;
  return pesos * 100; // a centavos
}

/** Cantidad que precede a un término, ej. "2 big mac" -> 2. Default 1. */
function quantityBefore(text: string, term: string): number {
  const re = new RegExp(`(\\d+)\\s*(?:x\\s*)?${escapeRegExp(term)}`);
  const m = text.match(re);
  if (!m) return 1;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isNaN(n) || n <= 0 ? 1 : n;
}

interface ScoredItem {
  sku: string;
  quantity: number;
  score: number;
  matchedTags: string[];
}

/**
 * Agente por reglas: busca productos del catálogo dentro del texto.
 * Es un punto de partida honesto; la comprensión fina del lenguaje es,
 * justamente, el trabajo que después hará el agente con Claude.
 */
export class RuleBasedAgent implements OrderingAgent {
  constructor(private readonly registry: MerchantRegistry) {}

  async interpret(message: string): Promise<AgentResult> {
    const text = normalize(message);
    const budgetCents = parseBudget(text);

    let best:
      | { merchantId: string; merchantName: string; items: ScoredItem[] }
      | null = null;

    // Evaluamos cada comercio y nos quedamos con el que mejor matchea.
    for (const connector of this.registry.list()) {
      const catalog = await connector.getCatalog();
      const scored: ScoredItem[] = [];

      for (const item of catalog) {
        const terms = [normalize(item.name), ...(item.tags ?? []).map(normalize)];
        const matchedTags = terms.filter((t) => t.length > 0 && text.includes(t));
        if (matchedTags.length === 0) continue;

        // La cantidad la tomamos del término más específico que haya matcheado.
        const quantity = Math.max(
          ...matchedTags.map((t) => quantityBefore(text, t)),
        );

        scored.push({
          sku: item.sku,
          quantity,
          score: matchedTags.length,
          matchedTags,
        });
      }

      // Dedupe greedy: si dos productos comparten un tag (ej. dos combos que
      // comparten "big mac"), nos quedamos con el de mayor score.
      const chosen = this.dedupeBySharedTags(scored);
      if (chosen.length === 0) continue;

      const totalScore = chosen.reduce((s, i) => s + i.score, 0);
      const bestScore = best
        ? best.items.reduce((s, i) => s + i.score, 0)
        : -1;

      if (totalScore > bestScore) {
        best = {
          merchantId: connector.info.id,
          merchantName: connector.info.name,
          items: chosen,
        };
      }
    }

    if (!best) {
      return {
        ok: false,
        reason:
          "I couldn't find any items I recognize in your message. " +
          'Try something like: "2 big mac combo medium".',
      };
    }

    const lines: OrderLineInput[] = best.items.map((i) => ({
      sku: i.sku,
      quantity: i.quantity,
    }));

    return {
      ok: true,
      intent: {
        merchantId: best.merchantId,
        lines,
        budgetCents,
        notes: `Interpreted for ${best.merchantName}: ${lines
          .map((l) => `${l.quantity}x ${l.sku}`)
          .join(", ")}.`,
      },
    };
  }

  /** De productos que comparten tags, conserva el de mayor score. */
  private dedupeBySharedTags(items: ScoredItem[]): ScoredItem[] {
    const sorted = [...items].sort((a, b) => b.score - a.score);
    const chosen: ScoredItem[] = [];
    const usedTags = new Set<string>();

    for (const item of sorted) {
      const conflicts = item.matchedTags.some((t) => usedTags.has(t));
      if (conflicts) continue;
      chosen.push(item);
      for (const t of item.matchedTags) usedTags.add(t);
    }
    return chosen;
  }
}
