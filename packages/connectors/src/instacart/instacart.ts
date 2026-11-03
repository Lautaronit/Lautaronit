/**
 * instacart.ts
 * -----------------------------------------------------------------------------
 * Conector con el Instacart Developer Platform (IDP). A diferencia de los
 * comercios mock (que "ejecutan" un pedido), Instacart NO coloca el pedido por
 * detrás: arma una página de compra en Instacart Marketplace y devuelve un LINK.
 * El usuario abre ese link, elige su tienda local y paga en Instacart.
 *
 * Por eso vive detrás de su propia interfaz (`CartLinkProvider`), no de
 * `MerchantConnector`. Y es "key-ready": sin `INSTACART_API_KEY` queda inactivo
 * (`configured === false`) y la app lo trata con elegancia; cuando haya clave de
 * desarrollo, empieza a generar links reales sin tocar el resto.
 *
 * Doc: POST {baseUrl}/idp/v1/products/products_link  (Create shopping list page)
 */

/** Una línea del carrito que le pedimos a Instacart que arme. */
export interface CartLineItem {
  name: string;
  quantity: number;
  /** Unidad opcional, ej. "each", "kg". */
  unit?: string;
  /** Códigos UPC opcionales para un match más preciso del producto. */
  upcs?: string[];
}

export interface BuildCartLinkInput {
  lineItems: CartLineItem[];
  /** Título de la lista en Instacart, ej. "On It — Macro basket". */
  title?: string;
  /** País (ISO), ej. "US". */
  countryCode?: string;
  /** Días hasta que el link expira (opcional). */
  expiresInDays?: number;
}

export interface CartLinkResult {
  url: string;
}

/** Interfaz del proveedor de "links de carrito" (hoy, Instacart). */
export interface CartLinkProvider {
  /** ¿Está configurado (hay API key)? Si no, no se puede generar el link. */
  readonly configured: boolean;
  buildCartLink(input: BuildCartLinkInput): Promise<CartLinkResult>;
}

/**
 * Arma el cuerpo del request a IDP a partir de nuestras líneas. PURO (sin red),
 * así que es fácil de testear. El formato sigue "Create shopping list page".
 */
export function buildProductsLinkBody(input: BuildCartLinkInput): Record<string, unknown> {
  return {
    title: input.title ?? "On It basket",
    link_type: "shopping_list",
    expires_in: input.expiresInDays,
    country_code: input.countryCode ?? "US",
    line_items: input.lineItems.map((li) => ({
      name: li.name,
      quantity: li.quantity,
      unit: li.unit ?? "each",
      ...(li.upcs && li.upcs.length ? { upcs: li.upcs } : {}),
    })),
  };
}

/** Error del proveedor de links, con un mensaje legible. */
export class CartLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartLinkError";
  }
}

export class InstacartCartProvider implements CartLinkProvider {
  readonly configured: boolean;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://connect.instacart.com",
  ) {
    this.configured = apiKey.trim().length > 0;
  }

  async buildCartLink(input: BuildCartLinkInput): Promise<CartLinkResult> {
    if (!this.configured) {
      throw new CartLinkError("Instacart isn't connected yet (no API key).");
    }
    if (input.lineItems.length === 0) {
      throw new CartLinkError("The basket is empty.");
    }

    const url = `${this.baseUrl.replace(/\/$/, "")}/idp/v1/products/products_link`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(buildProductsLinkBody(input)),
      });
    } catch (err) {
      throw new CartLinkError(
        `Couldn't reach Instacart: ${err instanceof Error ? err.message : "network error"}.`,
      );
    }

    if (!res.ok) {
      throw new CartLinkError(`Instacart returned ${res.status}.`);
    }

    const body = (await res.json().catch(() => null)) as
      | { products_link_url?: string; url?: string }
      | null;
    const link = body?.products_link_url ?? body?.url;
    if (!link) {
      throw new CartLinkError("Instacart didn't return a cart link.");
    }
    return { url: link };
  }
}
