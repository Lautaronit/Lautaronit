/**
 * mockConnector.ts
 * -----------------------------------------------------------------------------
 * Un comercio SIMULADO que cumple el contrato `MerchantConnector`.
 *
 * ¿Por qué existe? Porque hoy ningún comercio real (McDonald's, súper, etc.)
 * expone una API pública de pedidos. Este mock se comporta como uno real:
 * tiene catálogo, busca productos, valida presupuesto y "confirma" el pedido.
 * Gracias a él podemos construir y probar TODA la app de punta a punta sin
 * depender de nadie. El día que llegue un comercio real, escribimos otra clase
 * igual a esta y la enchufamos.
 */

import type {
  CatalogItem,
  MerchantConnector,
  MerchantInfo,
  PlaceOrderRequest,
  PlaceOrderResult,
  PlacedOrderLine,
} from "../types.js";

/** Simula una demora de red para que el flujo se sienta realista. */
function simulateLatency(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockConnector implements MerchantConnector {
  public readonly info: MerchantInfo;
  private readonly catalog: CatalogItem[];

  constructor(info: MerchantInfo, catalog: CatalogItem[]) {
    this.info = info;
    this.catalog = catalog;
  }

  async getCatalog(): Promise<CatalogItem[]> {
    await simulateLatency();
    // Copiamos para que quien lo reciba no pueda mutar nuestro catálogo interno.
    return this.catalog.map((item) => ({ ...item }));
  }

  async searchCatalog(query: string): Promise<CatalogItem[]> {
    await simulateLatency();
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    return this.catalog.filter((item) => {
      const inName = item.name.toLowerCase().includes(q);
      const inTags = (item.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(q),
      );
      return inName || inTags;
    });
  }

  async placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    await simulateLatency(300);

    const lines: PlacedOrderLine[] = [];
    const currency = this.catalog[0]?.currency ?? "USD";

    // 1) Resolvemos cada línea contra el catálogo real.
    for (const line of request.lines) {
      const item = this.catalog.find((c) => c.sku === line.sku);

      if (!item) {
        return {
          status: "rejected",
          lines: [],
          totalCents: 0,
          currency,
          message: `Item "${line.sku}" doesn't exist at ${this.info.name}.`,
        };
      }

      if (!item.available) {
        return {
          status: "rejected",
          lines: [],
          totalCents: 0,
          currency,
          message: `"${item.name}" isn't available right now.`,
        };
      }

      if (line.quantity <= 0) {
        return {
          status: "rejected",
          lines: [],
          totalCents: 0,
          currency,
          message: `Invalid quantity for "${item.name}".`,
        };
      }

      lines.push({
        sku: item.sku,
        name: item.name,
        quantity: line.quantity,
        unitPriceCents: item.priceCents,
        lineTotalCents: item.priceCents * line.quantity,
      });
    }

    if (lines.length === 0) {
      return {
        status: "rejected",
        lines: [],
        totalCents: 0,
        currency,
        message: "The order has no items.",
      };
    }

    const totalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);

    // 2) Respetamos el presupuesto si vino especificado.
    if (request.budgetCents !== undefined && totalCents > request.budgetCents) {
      return {
        status: "rejected",
        lines,
        totalCents,
        currency,
        message:
          `The order ($${(totalCents / 100).toFixed(2)}) exceeds the ` +
          `budget ($${(request.budgetCents / 100).toFixed(2)}).`,
      };
    }

    // 3) Confirmamos: generamos un id de pedido simulado.
    const externalOrderId = `${this.info.id}-${Date.now()}`;

    return {
      status: "confirmed",
      externalOrderId,
      lines,
      totalCents,
      currency,
      estimatedDeliveryMinutes: this.info.category === "fast_food" ? 30 : 90,
      message: `Order confirmed at ${this.info.name}.`,
    };
  }
}
