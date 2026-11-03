/**
 * storage.ts
 * -----------------------------------------------------------------------------
 * Guardado del token de sesión.
 * - En celular: expo-secure-store (almacenamiento cifrado del sistema).
 * - En web: localStorage (SecureStore no existe en web).
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "onit_token";

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      /* algunos navegadores bloquean storage; se ignora */
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
