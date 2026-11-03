/**
 * agent.test.ts
 * -----------------------------------------------------------------------------
 * Tests for the rule-based agent: order interpretation, budget detection and
 * the edge cases most likely to break it (ambiguous numbers, messages with no
 * items, combos that share tags).
 */

import { describe, it, expect } from "vitest";
import { createDefaultRegistry } from "@on-it/connectors";
import { RuleBasedAgent } from "./agent.js";

function makeAgent(): RuleBasedAgent {
  return new RuleBasedAgent(createDefaultRegistry());
}

describe("RuleBasedAgent.interpret", () => {
  it("interprets a food order and its quantity", async () => {
    const res = await makeAgent().interpret("2 big mac combo medium");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.intent.merchantId).toBe("mock-mcdonalds");
    expect(res.intent.lines).toEqual([
      { sku: "bigmac-combo-med", quantity: 2 },
    ]);
  });

  it("doesn't duplicate combos that share tags (dedupe)", async () => {
    // "big mac combo medium" also matches the large combo and the quarter
    // pounder (they share the "combo" tag); it must keep only ONE.
    const res = await makeAgent().interpret("1 big mac combo medium");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.intent.lines).toHaveLength(1);
    expect(res.intent.lines[0]!.sku).toBe("bigmac-combo-med");
  });

  it("interprets several supermarket items", async () => {
    const res = await makeAgent().interpret("3 milk and 2 bread");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.intent.merchantId).toBe("mock-super");
    const skus = res.intent.lines.map((l) => l.sku).sort();
    expect(skus).toEqual(["bread", "milk-1l"]);
  });

  it("detects the budget when it sits next to $ or 'budget'", async () => {
    const res = await makeAgent().interpret(
      "3 big mac combo large with budget $50",
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.intent.budgetCents).toBe(5000);
    expect(res.intent.lines[0]!.quantity).toBe(3);
  });

  it("does NOT mistake an item quantity for the budget", async () => {
    // "5 big mac" has no $ and no budget word -> it's not a budget.
    const res = await makeAgent().interpret("5 big mac combo medium");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.intent.budgetCents).toBeUndefined();
    expect(res.intent.lines[0]!.quantity).toBe(5);
  });

  it("fails on a message with no known items", async () => {
    const res = await makeAgent().interpret("hello there, how are you?");
    expect(res.ok).toBe(false);
  });

  it("fails on an empty message", async () => {
    const res = await makeAgent().interpret("");
    expect(res.ok).toBe(false);
  });

  it("is robust to uppercase", async () => {
    const res = await makeAgent().interpret("2 BIG MAC COMBO MEDIUM");
    expect(res.ok).toBe(true);
  });
});
