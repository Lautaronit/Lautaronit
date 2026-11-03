/**
 * basketService.ts
 * -----------------------------------------------------------------------------
 * El "armador de canastas por macros": dado un presupuesto y objetivos de
 * proteína / carbohidratos / grasas, elige qué productos del súper comprar para
 * acercarse lo más posible a esos objetivos SIN pasarse del presupuesto.
 *
 * El optimizador (`planBasket`) es una función PURA (sin base de datos ni red),
 * por eso es fácil de testear. `BasketService` es la cáscara que lee el catálogo
 * del supermercado y se lo pasa.
 *
 * Es una heurística voraz (greedy): en cada paso agrega el producto que más
 * reduce lo que falta de los macros pedidos, por dólar gastado. No es un óptimo
 * matemático perfecto (con paquetes enteros es imposible clavar los macros),
 * pero da canastas con sentido y es rápido y explicable.
 */

import type {
  CartLineItem,
  CartLinkProvider,
  MerchantRegistry,
  Nutrition,
} from "@on-it/connectors";

export interface MacroTargets {
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/** Un producto candidato para el optimizador. */
export interface PlannerItem {
  sku: string;
  name: string;
  priceCents: number;
  nutrition: Nutrition;
}

export interface BasketLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface BasketTotals {
  costCents: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
}

export interface BasketPlan {
  merchantId: string;
  merchantName: string;
  lines: BasketLine[];
  totals: BasketTotals;
  targets: MacroTargets;
}

/** Tope de unidades por producto, para que la canasta sea realista. */
const DEFAULT_CAP = 8;

/**
 * El optimizador puro: devuelve las líneas y los totales que mejor cumplen los
 * objetivos dentro del presupuesto.
 */
export function planBasket(
  items: PlannerItem[],
  budgetCents: number,
  targets: MacroTargets,
  capPerItem = DEFAULT_CAP,
): { lines: BasketLine[]; totals: BasketTotals } {
  const remaining = {
    p: Math.max(0, targets.proteinG ?? 0),
    c: Math.max(0, targets.carbsG ?? 0),
    f: Math.max(0, targets.fatG ?? 0),
  };
  const counts = new Map<string, number>();
  const totals: BasketTotals = { costCents: 0, proteinG: 0, carbsG: 0, fatG: 0, kcal: 0 };

  // Mientras algún producto asequible siga acercándonos a los objetivos.
  for (;;) {
    let best: PlannerItem | null = null;
    let bestScore = 0;

    for (const it of items) {
      if ((counts.get(it.sku) ?? 0) >= capPerItem) continue;
      if (totals.costCents + it.priceCents > budgetCents) continue;

      // Beneficio = cuánto cubre de lo que TODAVÍA falta (no premia pasarse).
      const benefit =
        Math.min(it.nutrition.proteinG, remaining.p) +
        Math.min(it.nutrition.carbsG, remaining.c) +
        Math.min(it.nutrition.fatG, remaining.f);
      if (benefit <= 0) continue;

      const score = benefit / (it.priceCents / 100); // beneficio por dólar
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }

    if (!best) break; // nada asequible mejora el objetivo -> terminamos

    counts.set(best.sku, (counts.get(best.sku) ?? 0) + 1);
    totals.costCents += best.priceCents;
    totals.proteinG += best.nutrition.proteinG;
    totals.carbsG += best.nutrition.carbsG;
    totals.fatG += best.nutrition.fatG;
    totals.kcal += best.nutrition.kcal;
    remaining.p = Math.max(0, remaining.p - best.nutrition.proteinG);
    remaining.c = Math.max(0, remaining.c - best.nutrition.carbsG);
    remaining.f = Math.max(0, remaining.f - best.nutrition.fatG);
  }

  const bySku = new Map(items.map((i) => [i.sku, i]));
  const lines: BasketLine[] = [...counts.entries()].map(([sku, quantity]) => {
    const it = bySku.get(sku)!;
    return {
      sku,
      name: it.name,
      quantity,
      unitPriceCents: it.priceCents,
      lineTotalCents: it.priceCents * quantity,
    };
  });
  // Más caro primero: la canasta "se lee" con lo importante arriba.
  lines.sort((a, b) => b.lineTotalCents - a.lineTotalCents);

  return { lines, totals };
}

export class BasketService {
  constructor(
    private readonly registry: MerchantRegistry,
    private readonly cartLinks: CartLinkProvider,
  ) {}

  /** ¿Está conectada la integración con Instacart? */
  get instacartConfigured(): boolean {
    return this.cartLinks.configured;
  }

  /**
   * Convierte una canasta (SKUs + cantidades) en un link de compra de Instacart.
   * Resuelve los nombres de producto desde el catálogo y se lo pasa al proveedor.
   */
  async instacartLink(input: {
    lines: { sku: string; quantity: number }[];
    merchantId?: string;
  }): Promise<{ url: string }> {
    const connector = this.resolveSupermarket(input.merchantId);
    if (!connector) {
      throw new BasketError("No supermarket is available right now.", 404);
    }
    const catalog = await connector.getCatalog();
    const bySku = new Map(catalog.map((c) => [c.sku, c]));
    const lineItems: CartLineItem[] = input.lines.map((l) => {
      const item = bySku.get(l.sku);
      return { name: item?.name ?? l.sku, quantity: l.quantity };
    });
    return this.cartLinks.buildCartLink({
      lineItems,
      title: "On It — Macro basket",
      countryCode: "US",
    });
  }

  async plan(input: {
    budgetCents: number;
    targets: MacroTargets;
    merchantId?: string;
  }): Promise<BasketPlan> {
    const connector = this.resolveSupermarket(input.merchantId);
    if (!connector) {
      throw new BasketError("No supermarket is available right now.", 404);
    }
    if (input.budgetCents <= 0) {
      throw new BasketError("Set a budget greater than $0.", 400);
    }
    const t = input.targets;
    if (!(t.proteinG || t.carbsG || t.fatG)) {
      throw new BasketError("Set at least one macro target (protein, carbs or fat).", 400);
    }

    const catalog = await connector.getCatalog();
    const items: PlannerItem[] = catalog
      .filter((c) => c.available && c.nutrition)
      .map((c) => ({ sku: c.sku, name: c.name, priceCents: c.priceCents, nutrition: c.nutrition! }));

    const { lines, totals } = planBasket(items, input.budgetCents, input.targets);
    return {
      merchantId: connector.info.id,
      merchantName: connector.info.name,
      lines,
      totals,
      targets: input.targets,
    };
  }

  private resolveSupermarket(merchantId?: string) {
    if (merchantId) return this.registry.get(merchantId);
    return this.registry.list().find((c) => c.info.category === "supermarket");
  }
}

/** Error con código HTTP para el armador de canastas. */
export class BasketError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "BasketError";
  }
}
