/**
 * config.ts
 * -----------------------------------------------------------------------------
 * Configuración del cliente. Lo más importante: a qué backend apunta la app.
 *
 * - PRODUCCIÓN: seteá EXPO_PUBLIC_API_URL a la URL del backend en la nube
 *   (ej. "https://on-it-backend.up.railway.app"). Expo la inyecta al compilar.
 * - WEB local: sin esa variable, usa http://localhost:3000.
 * - CELULAR (Expo Go): el teléfono NO ve "localhost" de tu compu; usá la IP de
 *   tu compu en la red local (la que imprime el backend al arrancar) en LAN_IP,
 *   o seteá EXPO_PUBLIC_API_URL.
 */

import { Platform } from "react-native";

const LAN_IP = "192.168.1.3"; // 👈 cambiá esto por la IP de tu compu (solo para Expo Go)
const PORT = 3000;

// En producción, esta variable manda (apunta al backend en la nube).
const ENV_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

export const API_URL =
  ENV_URL && ENV_URL.length > 0
    ? ENV_URL
    : Platform.OS === "web"
      ? `http://localhost:${PORT}`
      : `http://${LAN_IP}:${PORT}`;
