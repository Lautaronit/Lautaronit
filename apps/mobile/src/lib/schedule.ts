/**
 * schedule.ts
 * -----------------------------------------------------------------------------
 * Helpers for the "calendar" of scheduled orders. We only ever build two kinds
 * of cron expressions from the UI — daily and weekly-on-a-weekday, always at
 * the top of an hour — so the build/describe logic stays small and readable.
 *
 *   daily  at HH:00  -> "0 H * * *"
 *   weekly at HH:00  -> "0 H * * D"   (D = 0..6, 0 = Sunday)
 *
 * `describeCron` also tolerates anything else by falling back to the raw string.
 */

export type Frequency = "daily" | "weekly";

/** Weekdays in display order (Mon→Sun), with their cron number (0 = Sun). */
export const WEEKDAYS: { label: string; short: string; cron: number }[] = [
  { label: "Monday", short: "Mon", cron: 1 },
  { label: "Tuesday", short: "Tue", cron: 2 },
  { label: "Wednesday", short: "Wed", cron: 3 },
  { label: "Thursday", short: "Thu", cron: 4 },
  { label: "Friday", short: "Fri", cron: 5 },
  { label: "Saturday", short: "Sat", cron: 6 },
  { label: "Sunday", short: "Sun", cron: 0 },
];

/** Builds a cron string from the simple options the form offers. */
export function buildCron(opts: {
  frequency: Frequency;
  weekdayCron: number; // used only when weekly
  hour: number; // 0..23
}): string {
  const dow = opts.frequency === "weekly" ? String(opts.weekdayCron) : "*";
  return `0 ${opts.hour} * * ${dow}`;
}

/** Turns an hour (0..23) into a 12h label, e.g. 9 -> "9:00 AM", 18 -> "6:00 PM". */
export function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${period}`;
}

interface ParsedCron {
  hour: number | null;
  /** cron weekday (0..6) or null when it runs every day. */
  weekdayCron: number | null;
}

/** Parses the two cron shapes we generate; returns nulls when it can't. */
export function parseCron(cron: string): ParsedCron {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { hour: null, weekdayCron: null };
  const hour = Number.parseInt(parts[1]!, 10);
  const dowRaw = parts[4]!;
  const weekdayCron =
    dowRaw === "*" ? null : normalizeDow(Number.parseInt(dowRaw, 10));
  return {
    hour: Number.isNaN(hour) ? null : hour,
    weekdayCron,
  };
}

/** Cron allows 7 for Sunday too; fold it to 0. */
function normalizeDow(n: number): number | null {
  if (Number.isNaN(n)) return null;
  if (n === 7) return 0;
  if (n < 0 || n > 6) return null;
  return n;
}

/** Human-readable cadence, e.g. "Every Monday · 9:00 AM" or "Every day · 7:00 AM". */
export function describeCron(cron: string): string {
  const { hour, weekdayCron } = parseCron(cron);
  if (hour === null) return cron; // fallback: show the raw expression
  const time = formatHour(hour);
  if (weekdayCron === null) return `Every day · ${time}`;
  const day = WEEKDAYS.find((w) => w.cron === weekdayCron);
  return day ? `Every ${day.label} · ${time}` : `Weekly · ${time}`;
}

/**
 * Which weekdays (by cron number) a schedule lands on — a daily schedule marks
 * all seven. Used to light up the week strip at the top of the screen.
 */
export function activeWeekdays(cron: string): number[] {
  const { weekdayCron } = parseCron(cron);
  if (weekdayCron === null) return WEEKDAYS.map((w) => w.cron);
  return [weekdayCron];
}
