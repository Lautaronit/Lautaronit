/**
 * cron.ts
 * -----------------------------------------------------------------------------
 * Un matcher de cron minimalista, sin dependencias. Responde una sola pregunta:
 * ¿este cron "dispara" en este minuto exacto?
 *
 * Soporta los 5 campos estándar (minuto hora día-del-mes mes día-de-semana) y,
 * en cada uno: asterisco, un número, listas "a,b", rangos "a-b" y pasos del tipo
 * asterisco-barra-n o "a-b" con paso. Es lo que necesita On It (generamos
 * "0 H estrella estrella estrella" para diario y con día de semana para semanal),
 * con margen de sobra para expresiones más ricas.
 *
 * Semántica: dispara cuando TODOS los campos coinciden con el minuto actual.
 * (La regla especial OR entre día-del-mes y día-de-semana no aplica: nunca
 * restringimos ambos a la vez.)
 */

/** ¿`value` cae dentro de un único campo de cron (ej. "1-5", "9", un paso)? */
function matchField(value: number, field: string): boolean {
  // Lista separada por comas: alcanza con que una parte coincida.
  return field.split(",").some((partRaw) => {
    const part = partRaw.trim();
    if (part === "*") return true;

    // Paso: "*/n" o "a-b/n".
    let step = 1;
    let base = part;
    const slash = part.indexOf("/");
    if (slash !== -1) {
      step = Number.parseInt(part.slice(slash + 1), 10);
      base = part.slice(0, slash);
      if (!Number.isInteger(step) || step <= 0) return false;
    }

    // Rango: "a-b" (o "*" como base del paso = todo el rango posible).
    if (base === "*") {
      return step === 1 ? true : value % step === 0;
    }
    const dash = base.indexOf("-");
    if (dash !== -1) {
      const lo = Number.parseInt(base.slice(0, dash), 10);
      const hi = Number.parseInt(base.slice(dash + 1), 10);
      if (Number.isNaN(lo) || Number.isNaN(hi)) return false;
      if (value < lo || value > hi) return false;
      return (value - lo) % step === 0;
    }

    // Número suelto.
    const n = Number.parseInt(base, 10);
    if (Number.isNaN(n)) return false;
    if (step === 1) return value === n;
    // "n/step": desde n hacia arriba, de a `step`.
    return value >= n && (value - n) % step === 0;
  });
}

/** ¿El cron dispara en el instante `date` (a resolución de minuto)? */
export function cronMatches(cron: string, date: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [min, hour, dom, month, dow] = parts as [string, string, string, string, string];

  const minuteOk = matchField(date.getMinutes(), min);
  const hourOk = matchField(date.getHours(), hour);
  const domOk = matchField(date.getDate(), dom);
  const monthOk = matchField(date.getMonth() + 1, month);

  // Día de semana: getDay() da 0..6 (0 = domingo). En cron, 0 y 7 son domingo,
  // así que para el domingo probamos también el 7.
  const wd = date.getDay();
  const dowOk = matchField(wd, dow) || (wd === 0 && matchField(7, dow));

  return minuteOk && hourOk && domOk && monthOk && dowOk;
}
