/**
 * claudeAgent.ts
 * -----------------------------------------------------------------------------
 * El "cerebro" con IA real: usa Claude para entender el pedido en lenguaje
 * natural y mapearlo a productos concretos del catálogo. Cumple la MISMA interfaz
 * (`OrderingAgent`) que el agente por reglas, así que el resto de la app no
 * cambia según cuál esté activo.
 *
 * Diseño:
 *  - Le pasamos a Claude el catálogo de cada comercio (id, nombre, SKUs, precios)
 *    y le pedimos que llame a una herramienta `submit_order` con el comercio y
 *    las líneas elegidas.
 *  - Validamos la respuesta contra el catálogo real (nunca confiamos a ciegas en
 *    el SKU que devuelve el modelo).
 *  - Si no hay API key, o la llamada falla, caemos automáticamente al agente por
 *    reglas: la app nunca se rompe por un problema de IA.
 *
 * El modelo por defecto es Opus 5.5 (configurable con AGENT_MODEL).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MerchantRegistry, OrderLineInput } from "@on-it/connectors";
import type { AgentResult, OrderingAgent, OrderIntent } from "./agent.js";

// --- Índice del catálogo (para armar el prompt y validar la respuesta) --------

interface IndexedItem {
  name: string;
  priceCents: number;
  available: boolean;
  tags: string[];
}

export interface CatalogIndex {
  /** merchantId -> { name, items: Map<sku, item> } */
  merchants: Map<string, { name: string; items: Map<string, IndexedItem> }>;
}

/** Arma el índice a partir del registro de comercios (lee los catálogos). */
export async function buildCatalogIndex(
  registry: MerchantRegistry,
): Promise<CatalogIndex> {
  const merchants = new Map<string, { name: string; items: Map<string, IndexedItem> }>();
  for (const connector of registry.list()) {
    const items = new Map<string, IndexedItem>();
    for (const item of await connector.getCatalog()) {
      items.set(item.sku, {
        name: item.name,
        priceCents: item.priceCents,
        available: item.available,
        tags: item.tags ?? [],
      });
    }
    merchants.set(connector.info.id, { name: connector.info.name, items });
  }
  return { merchants };
}

/** Renderiza el catálogo como texto compacto para el system prompt. */
export function renderCatalog(index: CatalogIndex): string {
  const blocks: string[] = [];
  for (const [merchantId, m] of index.merchants) {
    const lines = [`Merchant "${m.name}" (merchantId: ${merchantId}):`];
    for (const [sku, item] of m.items) {
      const price = `$${(item.priceCents / 100).toFixed(2)}`;
      const tags = item.tags.length ? ` [${item.tags.join(", ")}]` : "";
      const avail = item.available ? "" : " (unavailable)";
      lines.push(`  - sku: ${sku} | ${item.name} | ${price}${tags}${avail}`);
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

// --- Validación de la respuesta del modelo -> OrderIntent ---------------------

interface RawLine {
  sku: string;
  quantity: number;
}

/**
 * Convierte lo que el modelo devolvió (no confiable) en un `OrderIntent` válido,
 * validando comercio, SKUs, cantidades y disponibilidad contra el catálogo real.
 */
export function buildIntentFromToolInput(
  raw: unknown,
  index: CatalogIndex,
): AgentResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "I couldn't understand that order. Try naming a product." };
  }
  const input = raw as { merchantId?: unknown; lines?: unknown; budgetCents?: unknown; notes?: unknown };

  const merchantId = typeof input.merchantId === "string" ? input.merchantId : "";
  const merchant = index.merchants.get(merchantId);
  if (!merchant) {
    return { ok: false, reason: "I couldn't match your order to a store I know." };
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, reason: "I couldn't find any items I recognize in your message." };
  }

  const lines: OrderLineInput[] = [];
  for (const l of input.lines as RawLine[]) {
    const sku = typeof l?.sku === "string" ? l.sku : "";
    const item = merchant.items.get(sku);
    if (!item || !item.available) continue; // ignoramos SKUs inventados o sin stock
    const quantity = Number.isFinite(l?.quantity) ? Math.floor(l.quantity) : 1;
    if (quantity <= 0) continue;
    lines.push({ sku, quantity });
  }

  if (lines.length === 0) {
    return { ok: false, reason: "I couldn't find any items I recognize in your message." };
  }

  const budgetCents =
    typeof input.budgetCents === "number" && input.budgetCents > 0
      ? Math.floor(input.budgetCents)
      : undefined;

  const detail = lines
    .map((l) => `${l.quantity}x ${merchant.items.get(l.sku)?.name ?? l.sku}`)
    .join(", ");
  const notes =
    typeof input.notes === "string" && input.notes.trim()
      ? input.notes.trim()
      : `Interpreted for ${merchant.name}: ${detail}.`;

  const intent: OrderIntent = { merchantId, lines, budgetCents, notes };
  return { ok: true, intent };
}

// --- El agente ----------------------------------------------------------------

const SYSTEM_PROMPT = `You are On It's ordering assistant. The user writes what they want in natural language; you turn it into a concrete order.

Rules:
- Choose the single best merchant for the request from the catalog below.
- Map the request to real items using ONLY the exact SKUs listed. Never invent a SKU.
- Infer quantities (default 1). If the user gives a spending cap (e.g. "under $20", "budget 15"), set budgetCents (in cents).
- For a vague request (e.g. "something for dinner, max $20"), pick a reasonable set of items that fits.
- Always answer by calling the submit_order tool. If nothing in the catalog fits, call it with an empty lines array.

Catalog:
`;

const SUBMIT_ORDER_TOOL: Anthropic.Tool = {
  name: "submit_order",
  description: "Submit the interpreted order: the chosen merchant and the line items (by SKU).",
  input_schema: {
    type: "object",
    properties: {
      merchantId: { type: "string", description: "The merchantId of the chosen store." },
      lines: {
        type: "array",
        description: "The items to order.",
        items: {
          type: "object",
          properties: {
            sku: { type: "string", description: "An exact SKU from the catalog." },
            quantity: { type: "integer", minimum: 1 },
          },
          required: ["sku", "quantity"],
        },
      },
      budgetCents: { type: "integer", description: "Optional spending cap in cents." },
      notes: { type: "string", description: "Short human-readable summary of what was ordered." },
    },
    required: ["merchantId", "lines"],
  },
};

export class ClaudeAgent implements OrderingAgent {
  private readonly client: Anthropic;

  constructor(
    private readonly registry: MerchantRegistry,
    /** Agente de respaldo (por reglas) para cuando la IA falla. */
    private readonly fallback: OrderingAgent,
    private readonly model: string,
    apiKey?: string,
  ) {
    // Sin apiKey explícita, el SDK la toma del entorno (ANTHROPIC_API_KEY).
    this.client = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }

  async interpret(message: string): Promise<AgentResult> {
    try {
      const index = await buildCatalogIndex(this.registry);
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT + renderCatalog(index),
        tools: [SUBMIT_ORDER_TOOL],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: message }],
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        // El modelo no armó un pedido: usamos su texto como razón si lo hay.
        const text = response.content.find((b) => b.type === "text");
        const reason =
          text && text.type === "text" && text.text.trim()
            ? text.text.trim()
            : "I couldn't turn that into an order. Try naming a product.";
        return { ok: false, reason };
      }

      return buildIntentFromToolInput(toolUse.input, index);
    } catch {
      // Cualquier problema con la IA (sin key, red, rate limit, etc.) ->
      // seguimos funcionando con el agente por reglas.
      return this.fallback.interpret(message);
    }
  }
}
