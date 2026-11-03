/**
 * types.ts
 * -----------------------------------------------------------------------------
 * El "contrato" de On It con el mundo de los comercios.
 *
 * Toda la app (IA, API, agenda) trabaja contra estas interfaces y NUNCA contra
 * un comercio concreto. Gracias a esto, agregar McDonald's, un supermercado o
 * cualquier comercio nuevo es simplemente escribir una clase que cumpla con
 * `MerchantConnector`, sin tocar el resto del sistema.
 *
 * Nota sobre el dinero: guardamos todos los montos en CENTAVOS (números enteros)
 * para evitar errores de redondeo con decimales. 1550 = $15,50.
 */

/** Categoría del comercio. Nos sirve para que la IA elija el comercio correcto. */
export type MerchantCategory =
  | "supermarket"
  | "fast_food"
  | "pharmacy"
  | "other";

/** Datos de identidad de un comercio. */
export interface MerchantInfo {
  /** Identificador estable, ej. "mock-mcdonalds". */
  id: string;
  /** Nombre visible, ej. "McDonald's (simulado)". */
  name: string;
  category: MerchantCategory;
}

/**
 * Información nutricional de un producto, POR UNIDAD vendida (el paquete entero).
 * Gramos de cada macro + calorías. Opcional: no todos los productos la traen.
 */
export interface Nutrition {
  proteinG: number;
  carbsG: number;
  fatG: number;
  kcal: number;
}

/** Un producto tal como lo ofrece el comercio en su catálogo. */
export interface CatalogItem {
  /** Código único del producto dentro del comercio. */
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
  available: boolean;
  /** Palabras clave para búsqueda difusa, ej. ["hamburguesa", "combo"]. */
  tags?: string[];
  /** Macros por unidad, cuando el comercio las expone. */
  nutrition?: Nutrition;
}

/** Una línea del pedido: qué SKU y cuántas unidades. */
export interface OrderLineInput {
  sku: string;
  quantity: number;
}

/** A dónde se entrega el pedido. */
export interface DeliveryAddress {
  label?: string;
  street: string;
  city: string;
  notes?: string;
}

/** Lo que On It le pide a un comercio que ejecute. */
export interface PlaceOrderRequest {
  lines: OrderLineInput[];
  address: DeliveryAddress;
  /** Tope de gasto opcional, en centavos. El comercio debe respetarlo. */
  budgetCents?: number;
}

/** Una línea ya confirmada por el comercio, con su precio real. */
export interface PlacedOrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export type OrderStatus = "confirmed" | "rejected" | "needs_review";

/** La respuesta del comercio después de intentar hacer el pedido. */
export interface PlaceOrderResult {
  status: OrderStatus;
  /** Id del pedido en el sistema del comercio (si se confirmó). */
  externalOrderId?: string;
  lines: PlacedOrderLine[];
  totalCents: number;
  currency: string;
  estimatedDeliveryMinutes?: number;
  /** Mensaje legible, útil cuando se rechaza o necesita revisión. */
  message?: string;
}

/**
 * El contrato que cumple TODO comercio en On It.
 *
 * Implementá esta interfaz para conectar un comercio nuevo. El resto de la app
 * no necesita saber si por detrás hay una API oficial, un MCP o un mock.
 */
export interface MerchantConnector {
  readonly info: MerchantInfo;

  /** Devuelve el catálogo completo del comercio. */
  getCatalog(): Promise<CatalogItem[]>;

  /** Busca productos por texto libre (ej. "big mac", "leche"). */
  searchCatalog(query: string): Promise<CatalogItem[]>;

  /** Ejecuta un pedido y devuelve el resultado del comercio. */
  placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResult>;
}
