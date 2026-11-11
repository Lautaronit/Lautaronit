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
  surfaceRaised: "#FBF8F1", // crema casi blanco: tarjetas que "suben" sobre el fondo
  surfaceSunken: "#ECE6D8", // zonas hundidas / inputs
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
  // Para tarjetas y la caja de escritura: sombra apenas perceptible, TINTADA de
  // verde de marca (no gris — una sombra gris sin tintar lee como "barato").
  card: {
    shadowColor: "#163A2B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  // Para elementos que "flotan" (botón de enviar, banners): algo más marcada.
  float: {
    shadowColor: "#163A2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
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
