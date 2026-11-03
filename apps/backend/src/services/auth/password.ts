/**
 * password.ts
 * -----------------------------------------------------------------------------
 * Hasheo y verificación de contraseñas con scrypt (incluido en Node, sin
 * dependencias externas). NUNCA se guarda la contraseña en texto plano.
 *
 * Formato almacenado: "<salt_hex>:<hash_hex>". El salt es aleatorio por usuario,
 * así dos usuarios con la misma contraseña tienen hashes distintos.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;

  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  const keyBuf = Buffer.from(keyHex, "hex");

  // Comparación en tiempo constante para evitar timing attacks.
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}
