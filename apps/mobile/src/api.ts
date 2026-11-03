/**
 * api.ts
 * -----------------------------------------------------------------------------
 * Cliente HTTP del backend de On It. Centraliza las llamadas, el header de
 * autenticación y el manejo de errores (lanza Error con el mensaje del server).
 */

import { API_URL } from "./config";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface OrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderResult {
  status: "confirmed" | "rejected" | "needs_review";
  totalCents: number;
  currency: string;
  estimatedDeliveryMinutes?: number;
  message?: string;
  lines: OrderLine[];
}

export interface CreateOrderResponse {
  orderId: string;
  intent: { merchantId: string; notes: string };
  result: OrderResult;
}

/** Un ítem de pedido tal como lo devuelve el historial. */
export interface OrderItemRow {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

/** Un pedido del historial (fila de la tabla Order + sus ítems). */
export interface OrderRow {
  id: string;
  merchantId: string;
  status: string;
  totalCents: number;
  currency: string;
  rawMessage: string | null;
  createdAt: string;
  items: OrderItemRow[];
}

/** Una programación recurrente. */
export interface ScheduleRow {
  id: string;
  merchantId: string;
  cron: string;
  message: string;
  budgetCents: number | null;
  active: boolean;
  createdAt: string;
  lastRunAt: string | null;
}

export interface MerchantInfo {
  id: string;
  name: string;
  category: string;
}

export interface Wallet {
  balanceCents: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: "topup" | "order_debit" | "refund";
  amountCents: number; // con signo: + entra, - sale
  balanceAfterCents: number;
  description: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface Address {
  id: string;
  label: string | null;
  street: string;
  city: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface Preferences {
  usualOrder: string | null;
  dietaryNotes: string | null;
  notifyOnOrder: boolean;
}

export interface MacroTargets {
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
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

/** Extrae un mensaje de error legible del cuerpo de la respuesta. */
function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string") return err;
    return fallback;
  }
  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't log in."));
  }
  return body as LoginResponse;
}

export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your account."));
  }
  return body as AuthUser;
}

export async function createOrder(
  message: string,
  token: string,
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't create the order."));
  }
  return body as CreateOrderResponse;
}

/** Comercios disponibles (público): lo usamos para mostrar nombres legibles. */
export async function getMerchants(): Promise<MerchantInfo[]> {
  const res = await fetch(`${API_URL}/merchants`);
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load merchants."));
  }
  return body as MerchantInfo[];
}

/** Historial de pedidos del usuario (más nuevos primero). */
export async function getOrders(token: string): Promise<OrderRow[]> {
  const res = await fetch(`${API_URL}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your orders."));
  }
  return body as OrderRow[];
}

/** Repite un pedido pasado por su id. */
export async function reorder(
  orderId: string,
  token: string,
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_URL}/orders/${orderId}/reorder`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't repeat the order."));
  }
  return body as CreateOrderResponse;
}

/** Programaciones recurrentes del usuario. */
export async function getSchedules(token: string): Promise<ScheduleRow[]> {
  const res = await fetch(`${API_URL}/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your schedules."));
  }
  return body as ScheduleRow[];
}

export async function createSchedule(
  input: { message: string; cron: string; budgetCents?: number },
  token: string,
): Promise<ScheduleRow> {
  const res = await fetch(`${API_URL}/schedules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't create the schedule."));
  }
  return body as ScheduleRow;
}

export async function updateSchedule(
  id: string,
  changes: { active?: boolean; cron?: string; message?: string },
  token: string,
): Promise<ScheduleRow> {
  const res = await fetch(`${API_URL}/schedules/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(changes),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't update the schedule."));
  }
  return body as ScheduleRow;
}

/** Ejecuta una programación ahora mismo ("Run now"). */
export async function runSchedule(
  id: string,
  token: string,
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_URL}/schedules/${id}/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't run the schedule."));
  }
  return body as CreateOrderResponse;
}

export async function deleteSchedule(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/schedules/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const body = await parseJson(res);
    throw new Error(errorMessage(body, "Couldn't delete the schedule."));
  }
}

// --- Billetera (wallet) -------------------------------------------------------

export async function getWallet(token: string): Promise<Wallet> {
  const res = await fetch(`${API_URL}/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your wallet."));
  }
  return body as Wallet;
}

export async function getWalletTransactions(
  token: string,
): Promise<WalletTransaction[]> {
  const res = await fetch(`${API_URL}/wallet/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your transactions."));
  }
  return body as WalletTransaction[];
}

export async function topUp(
  amountCents: number,
  token: string,
  paymentMethodId?: string,
): Promise<{ balanceCents: number }> {
  const res = await fetch(`${API_URL}/wallet/topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amountCents, paymentMethodId }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't add funds."));
  }
  return body as { balanceCents: number };
}

export async function getPaymentMethods(
  token: string,
): Promise<PaymentMethod[]> {
  const res = await fetch(`${API_URL}/payment-methods`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't load your cards."));
  }
  return body as PaymentMethod[];
}

export async function addPaymentMethod(
  input: { number: string; expMonth: number; expYear: number; cvc: string },
  token: string,
): Promise<PaymentMethod> {
  const res = await fetch(`${API_URL}/payment-methods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't save the card."));
  }
  return body as PaymentMethod;
}

export async function deletePaymentMethod(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/payment-methods/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const body = await parseJson(res);
    throw new Error(errorMessage(body, "Couldn't remove the card."));
  }
}

export async function setDefaultCard(
  id: string,
  token: string,
): Promise<PaymentMethod> {
  const res = await fetch(`${API_URL}/payment-methods/${id}/default`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, "Couldn't set the default card."));
  }
  return body as PaymentMethod;
}

// --- Direcciones --------------------------------------------------------------

export async function getAddresses(token: string): Promise<Address[]> {
  const res = await fetch(`${API_URL}/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't load your addresses."));
  return body as Address[];
}

export async function createAddress(
  input: { label?: string; street: string; city: string; notes?: string; isDefault?: boolean },
  token: string,
): Promise<Address> {
  const res = await fetch(`${API_URL}/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't save the address."));
  return body as Address;
}

export async function updateAddress(
  id: string,
  changes: { label?: string | null; street?: string; city?: string; notes?: string | null; isDefault?: boolean },
  token: string,
): Promise<Address> {
  const res = await fetch(`${API_URL}/addresses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(changes),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't update the address."));
  return body as Address;
}

export async function deleteAddress(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/addresses/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const body = await parseJson(res);
    throw new Error(errorMessage(body, "Couldn't delete the address."));
  }
}

// --- Preferencias -------------------------------------------------------------

export async function getPreferences(token: string): Promise<Preferences> {
  const res = await fetch(`${API_URL}/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't load your preferences."));
  return body as Preferences;
}

export async function updatePreferences(
  changes: Partial<Preferences>,
  token: string,
): Promise<Preferences> {
  const res = await fetch(`${API_URL}/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(changes),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't save your preferences."));
  return body as Preferences;
}

// --- Canasta por macros -------------------------------------------------------

export async function planBasket(
  input: { budgetCents: number } & MacroTargets,
  token: string,
): Promise<BasketPlan> {
  const res = await fetch(`${API_URL}/baskets/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't build the basket."));
  return body as BasketPlan;
}

export async function orderBasket(
  input: { merchantId: string; lines: { sku: string; quantity: number }[]; budgetCents?: number },
  token: string,
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_URL}/orders/from-basket`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't order the basket."));
  return body as CreateOrderResponse;
}

/** Convierte la canasta en un link de compra de Instacart (si está conectado). */
export async function instacartLink(
  input: { merchantId: string; lines: { sku: string; quantity: number }[] },
  token: string,
): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/baskets/instacart-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(errorMessage(body, "Couldn't open Instacart."));
  return body as { url: string };
}
