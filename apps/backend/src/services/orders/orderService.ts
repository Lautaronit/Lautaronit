/**
 * orderService.ts
 * -----------------------------------------------------------------------------
 * Orquesta el flujo completo de un pedido:
 *
 *   mensaje del usuario
 *     -> agente lo interpreta (qué comprar)
 *     -> se elige el conector del comercio
 *     -> se resuelve la dirección de entrega
 *     -> el comercio ejecuta el pedido
 *     -> se persiste el resultado en la base de datos
 *
 * Es el "caso de uso" central de On It. La API y el scheduler lo invocan.
 */

import type {
  DeliveryAddress,
  MerchantConnector,
  MerchantRegistry,
  OrderLineInput,
  PlaceOrderResult,
} from "@on-it/connectors";
import { prisma } from "../../db.js";
import type { OrderingAgent, OrderIntent } from "../ai/agent.js";
import { InsufficientFundsError, type WalletService } from "../payments/walletService.js";

/** Formatea centavos a dólares para los mensajes al usuario. */
function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface CreateOrderInput {
  userId: string;
  message: string;
  /** Dirección a usar. Si no viene, se toma la predeterminada del usuario. */
  addressId?: string;
  /** Si el pedido nace de una programación recurrente. */
  scheduleId?: string;
  /**
   * Presupuesto a imponer, en centavos. Lo usan las recurrencias, que guardan
   * su tope aparte del mensaje; si viene, pisa al que el agente deduzca del texto.
   */
  budgetCentsOverride?: number;
}

export interface CreateOrderOutput {
  orderId: string;
  intent: OrderIntent;
  result: PlaceOrderResult;
}

export class OrderService {
  constructor(
    private readonly registry: MerchantRegistry,
    private readonly agent: OrderingAgent,
    private readonly wallet: WalletService,
  ) {}

  async createFromMessage(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1) Interpretar el mensaje.
    const interpreted = await this.agent.interpret(input.message);
    if (!interpreted.ok) {
      throw new OrderError(interpreted.reason, 422);
    }
    const intent = interpreted.intent;

    // 2) Elegir el comercio.
    const connector = this.registry.get(intent.merchantId);
    if (!connector) {
      throw new OrderError(`Unknown merchant: ${intent.merchantId}`, 404);
    }

    // 3) Ejecutar y persistir. El presupuesto explícito (recurrencia) manda.
    return this.placeAndPersist(input.userId, connector, intent, {
      rawMessage: input.message,
      addressId: input.addressId,
      scheduleId: input.scheduleId,
      budgetCents: input.budgetCentsOverride ?? intent.budgetCents,
    });
  }

  /**
   * Pedido a partir de líneas EXPLÍCITAS (sin pasar por el agente). Lo usa el
   * armador de canastas por macros: ya sabe qué SKUs y cuántos pedir.
   */
  async createFromLines(input: {
    userId: string;
    merchantId: string;
    lines: OrderLineInput[];
    addressId?: string;
    budgetCents?: number;
  }): Promise<CreateOrderOutput> {
    const connector = this.registry.get(input.merchantId);
    if (!connector) {
      throw new OrderError(`Unknown merchant: ${input.merchantId}`, 404);
    }
    if (input.lines.length === 0) {
      throw new OrderError("The basket is empty.", 422);
    }
    const intent: OrderIntent = {
      merchantId: input.merchantId,
      lines: input.lines,
      budgetCents: input.budgetCents,
      notes: `Macro basket (${input.lines.length} item${input.lines.length === 1 ? "" : "s"}).`,
    };
    return this.placeAndPersist(input.userId, connector, intent, {
      rawMessage: null,
      addressId: input.addressId,
      budgetCents: input.budgetCents,
    });
  }

  /**
   * Núcleo compartido: ejecuta el pedido contra el comercio, cobra la billetera
   * (rechazando si no alcanza) y lo persiste. Lo usan los pedidos por mensaje,
   * las recurrencias y el armador de canastas.
   */
  private async placeAndPersist(
    userId: string,
    connector: MerchantConnector,
    intent: OrderIntent,
    opts: { rawMessage: string | null; addressId?: string; scheduleId?: string; budgetCents?: number },
  ): Promise<CreateOrderOutput> {
    const address = await this.resolveAddress(userId, opts.addressId);

    const result = await connector.placeOrder({
      lines: intent.lines,
      address,
      budgetCents: opts.budgetCents,
    });

    const items = result.lines.map((l) => ({
      sku: l.sku,
      name: l.name,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
    }));

    const baseData = {
      userId,
      merchantId: intent.merchantId,
      currency: result.currency,
      rawMessage: opts.rawMessage,
      addressId: opts.addressId ?? null,
      scheduleId: opts.scheduleId ?? null,
      items: { create: items },
    };

    // El comercio NO confirmó: se guarda tal cual, sin tocar la billetera.
    if (result.status !== "confirmed") {
      const order = await prisma.order.create({
        data: { ...baseData, status: result.status, totalCents: result.totalCents },
      });
      return { orderId: order.id, intent, result };
    }

    // Confirmado: ¿alcanza el saldo? Si no, se rechaza sin descontar.
    const enough = await this.wallet.hasSufficient(userId, result.totalCents);
    if (!enough) {
      const balance = await this.wallet.getBalance(userId);
      const short = result.totalCents - balance;
      const message = `Insufficient balance. This order is ${usd(
        result.totalCents,
      )} and your balance is ${usd(balance)} — add ${usd(short)} to your wallet.`;
      const order = await prisma.order.create({
        data: { ...baseData, status: "rejected", totalCents: result.totalCents },
      });
      return { orderId: order.id, intent, result: { ...result, status: "rejected", message } };
    }

    // Hay saldo: guardamos el pedido y descontamos, enlazando el movimiento.
    const order = await prisma.order.create({
      data: {
        ...baseData,
        status: "confirmed",
        totalCents: result.totalCents,
        externalOrderId: result.externalOrderId ?? null,
      },
    });

    try {
      await this.wallet.debit(userId, result.totalCents, {
        orderId: order.id,
        description: `Order · ${connector.info.name}`,
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await prisma.order.update({ where: { id: order.id }, data: { status: "rejected" } });
        const message = `Insufficient balance — add ${usd(
          err.shortfallCents,
        )} to your wallet and try again.`;
        return { orderId: order.id, intent, result: { ...result, status: "rejected", message } };
      }
      throw err;
    }

    return { orderId: order.id, intent, result };
  }

  /**
   * Devuelve la dirección de entrega. Prioridad: la pedida -> la predeterminada
   * del usuario -> una de respaldo (para que el demo funcione sin configurar).
   */
  private async resolveAddress(
    userId: string,
    addressId?: string,
  ): Promise<DeliveryAddress> {
    if (addressId) {
      const addr = await prisma.address.findUnique({ where: { id: addressId } });
      if (addr) {
        return { label: addr.label ?? undefined, street: addr.street, city: addr.city, notes: addr.notes ?? undefined };
      }
    }

    const fallback = await prisma.address.findFirst({
      where: { userId },
      orderBy: { isDefault: "desc" },
    });
    if (fallback) {
      return {
        label: fallback.label ?? undefined,
        street: fallback.street,
        city: fallback.city,
        notes: fallback.notes ?? undefined,
      };
    }

    return { label: "No address", street: "—", city: "—" };
  }
}

/** Error con código HTTP, para que la API responda el status correcto. */
export class OrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}
