/**
 * scheduler.test.ts
 * -----------------------------------------------------------------------------
 * Pruebas de la lógica pura del scheduler: el matcher de cron y la decisión de
 * "¿toca ahora?" (`isDue`). Sin base de datos, así que corren rápido y seguro.
 *
 * Fechas de referencia (hora local):
 *   2026-11-01 = domingo, 11-02 = lunes, 11-03 = martes, 11-04 = miércoles.
 */

import { describe, it, expect } from "vitest";
import { cronMatches } from "./cron.js";
import { isDue } from "./scheduler.js";

const monday9 = new Date(2026, 10, 2, 9, 0); // lunes 09:00
const monday901 = new Date(2026, 10, 2, 9, 1);
const tuesday9 = new Date(2026, 10, 3, 9, 0);
const sunday8 = new Date(2026, 10, 1, 8, 0);
const wednesday9 = new Date(2026, 10, 4, 9, 0);

describe("cronMatches", () => {
  it("semanal: '0 9 * * 1' dispara el lunes a las 9:00", () => {
    expect(cronMatches("0 9 * * 1", monday9)).toBe(true);
  });

  it("no dispara un minuto después", () => {
    expect(cronMatches("0 9 * * 1", monday901)).toBe(false);
  });

  it("no dispara otro día de la semana", () => {
    expect(cronMatches("0 9 * * 1", tuesday9)).toBe(false);
  });

  it("diario: '0 9 * * *' dispara cualquier día a las 9:00", () => {
    expect(cronMatches("0 9 * * *", monday9)).toBe(true);
    expect(cronMatches("0 9 * * *", tuesday9)).toBe(true);
  });

  it("domingo acepta tanto 0 como 7", () => {
    expect(cronMatches("0 8 * * 0", sunday8)).toBe(true);
    expect(cronMatches("0 8 * * 7", sunday8)).toBe(true);
  });

  it("listas de días: '0 9 * * 1,3,5' incluye el miércoles", () => {
    expect(cronMatches("0 9 * * 1,3,5", wednesday9)).toBe(true);
    expect(cronMatches("0 9 * * 1,3,5", tuesday9)).toBe(false);
  });

  it("rangos de hora: '0 9-11 * * *' cubre 9, 10 y 11", () => {
    expect(cronMatches("0 9-11 * * *", new Date(2026, 10, 2, 10, 0))).toBe(true);
    expect(cronMatches("0 9-11 * * *", new Date(2026, 10, 2, 12, 0))).toBe(false);
  });

  it("pasos de minuto: cada 15 minutos matchea 0/15/30/45", () => {
    expect(cronMatches("*/15 * * * *", new Date(2026, 10, 2, 9, 30))).toBe(true);
    expect(cronMatches("*/15 * * * *", new Date(2026, 10, 2, 9, 7))).toBe(false);
  });

  it("un cron inválido (no tiene 5 campos) nunca dispara", () => {
    expect(cronMatches("0 9 * *", monday9)).toBe(false);
    expect(cronMatches("", monday9)).toBe(false);
  });
});

describe("isDue", () => {
  it("toca cuando el cron matchea y nunca corrió", () => {
    expect(isDue({ cron: "0 9 * * 1", lastRunAt: null }, monday9)).toBe(true);
  });

  it("no toca si ya corrió este mismo minuto", () => {
    const ranThisMinute = new Date(2026, 10, 2, 9, 0, 30); // 09:00:30
    expect(isDue({ cron: "0 9 * * 1", lastRunAt: ranThisMinute }, monday9)).toBe(false);
  });

  it("vuelve a tocar si la última corrida fue en un minuto anterior", () => {
    const ranLastWeek = new Date(2026, 9, 26, 9, 0);
    expect(isDue({ cron: "0 9 * * 1", lastRunAt: ranLastWeek }, monday9)).toBe(true);
  });

  it("no toca si el cron no matchea ahora", () => {
    expect(isDue({ cron: "0 9 * * 1", lastRunAt: null }, tuesday9)).toBe(false);
  });
});
