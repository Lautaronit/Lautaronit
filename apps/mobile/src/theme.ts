/**
 * theme.ts
 * -----------------------------------------------------------------------------
 * Identidad visual de On It, definida junto al usuario.
 * - Fondo crema, verde oscuro de marca, negro cálido para texto.
 * - Naranja SOLO para la acción (botón de enviar).
 * - Wordmark "On It" en Fraunces cursiva; resto de textos en Space Grotesk.
 */

export const colors = {
  bg: "#F4F0E6", // crema
  surface: "#FFFFFF",
  primary: "#163A2B", // verde oscuro (marca)
  text: "#16150F", // negro cálido
  textMuted: "#6E6756",
  placeholder: "#A7A08C",
  border: "#E2DCCB", // hairline crema
  borderStrong: "#1C1C1A", // negro fino (caja de escritura)
  accent: "#E8552D", // naranja (solo acción)
  accentText: "#FFFFFF",
  success: "#1B8A5A",
  danger: "#C0392B",
};

export const fonts = {
  wordmark: "Fraunces_500Medium_Italic", // "On It" en cursiva
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

/**
 * Sombras suaves para dar profundidad. react-native-web traduce estas props a
 * `box-shadow` en la web; en nativo usan `elevation`. Tono cálido (negro de
 * marca) y muy sutiles, para que se sienta premium sin ensuciar.
 */
export const shadow = {
  // Para tarjetas y la caja de escritura: sombra apenas perceptible.
  card: {
    shadowColor: "#16150F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  // Para elementos que "flotan" (botón de enviar, banners): algo más marcada.
  float: {
    shadowColor: "#16150F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

/** Formats cents (USD) into a dollar string, e.g. 999 -> "$9.99". */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formats an ISO date into a short US date + time, e.g. "Nov 3, 2:30 PM". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
