/**
 * BasketScreen.tsx
 * -----------------------------------------------------------------------------
 * "Armá mi compra del súper con este presupuesto y estos macros." El usuario
 * pone un presupuesto y objetivos de proteína/carbos/grasa; la app propone una
 * canasta que se ajusta, muestra el resumen de macros y el total, y permite
 * pedirla de un toque.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { instacartLink, orderBasket, planBasket, type BasketPlan } from "../api";
import { colors, fonts, formatMoney, radius, shadow, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

function toNum(s: string): number {
  const n = Number.parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export default function BasketScreen({ token, onBack }: Props) {
  const [budget, setBudget] = useState("40");
  const [protein, setProtein] = useState("150");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const [plan, setPlan] = useState<BasketPlan | null>(null);
  const [building, setBuilding] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [instacarting, setInstacarting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    const budgetCents = Math.round(toNum(budget) * 100);
    if (budgetCents <= 0) {
      setError("Set a budget greater than $0.");
      return;
    }
    const targets = { proteinG: toNum(protein), carbsG: toNum(carbs), fatG: toNum(fat) };
    if (!(targets.proteinG || targets.carbsG || targets.fatG)) {
      setError("Set at least one macro target.");
      return;
    }
    setBuilding(true);
    setError(null);
    setBanner(null);
    setPlan(null);
    try {
      setPlan(await planBasket({ budgetCents, ...targets }, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build the basket.");
    } finally {
      setBuilding(false);
    }
  }

  async function order() {
    if (!plan || plan.lines.length === 0 || ordering) return;
    setOrdering(true);
    setError(null);
    setBanner(null);
    try {
      const out = await orderBasket(
        {
          merchantId: plan.merchantId,
          lines: plan.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
          budgetCents: plan.totals.costCents,
        },
        token,
      );
      const ok = out.result.status === "confirmed";
      setBanner(
        ok
          ? `Ordered — ${formatMoney(out.result.totalCents)} ✓`
          : out.result.message ?? "Couldn't place the order.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't order the basket.");
    } finally {
      setOrdering(false);
    }
  }

  async function openInstacart() {
    if (!plan || plan.lines.length === 0 || instacarting) return;
    setInstacarting(true);
    setError(null);
    setBanner(null);
    try {
      const { url } = await instacartLink(
        {
          merchantId: plan.merchantId,
          lines: plan.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        },
        token,
      );
      await Linking.openURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open Instacart.");
    } finally {
      setInstacarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Macro basket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Set a budget and your macro goals — we'll build a grocery basket that fits.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Budget</Text>
          <TextInput
            style={styles.input}
            value={budget}
            onChangeText={setBudget}
            placeholder="$ e.g. 40"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            accessibilityLabel="Budget"
          />
        </View>

        <View style={styles.macroRow}>
          <MacroField label="Protein (g)" value={protein} onChange={setProtein} />
          <MacroField label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <MacroField label="Fat (g)" value={fat} onChange={setFat} />
        </View>

        <Pressable
          onPress={build}
          disabled={building}
          style={({ pressed }) => [styles.buildBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Build basket"
        >
          {building ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <Ionicons name="nutrition-outline" size={18} color={colors.bg} />
              <Text style={styles.buildBtnText}>Build my basket</Text>
            </>
          )}
        </Pressable>

        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {plan ? (
          plan.lines.length === 0 ? (
            <Text style={styles.muted}>
              Couldn't fit anything in that budget. Try a higher budget or lower targets.
            </Text>
          ) : (
            <View style={styles.result}>
              <Text style={styles.resultMerchant}>{plan.merchantName}</Text>

              {plan.lines.map((l) => (
                <View key={l.sku} style={styles.line}>
                  <Text style={styles.lineQty}>{l.quantity}×</Text>
                  <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                  <Text style={styles.linePrice}>{formatMoney(l.lineTotalCents)}</Text>
                </View>
              ))}

              <View style={styles.macroSummary}>
                <MacroStat label="Protein" got={plan.totals.proteinG} target={plan.targets.proteinG} />
                <MacroStat label="Carbs" got={plan.totals.carbsG} target={plan.targets.carbsG} />
                <MacroStat label="Fat" got={plan.totals.fatG} target={plan.targets.fatG} />
                <MacroStat label="kcal" got={plan.totals.kcal} />
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.total}>{formatMoney(plan.totals.costCents)}</Text>
              </View>

              <Pressable
                onPress={order}
                disabled={ordering}
                style={({ pressed }) => [styles.orderBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Order this basket"
              >
                {ordering ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Text style={styles.orderBtnText}>Order this basket</Text>
                )}
              </Pressable>

              <Pressable
                onPress={openInstacart}
                disabled={instacarting}
                style={({ pressed }) => [styles.instacartBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Order on Instacart"
              >
                {instacarting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cart-outline" size={16} color={colors.primary} />
                    <Text style={styles.instacartBtnText}>Order on Instacart</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.instacartNote}>
                Opens a real cart on Instacart (needs Instacart connected).
              </Text>
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function MacroField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={styles.macroField}>
      <Text style={styles.macroLabel}>{label}</Text>
      <TextInput
        style={styles.macroInput}
        value={value}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardType="number-pad"
        accessibilityLabel={label}
      />
    </View>
  );
}

function MacroStat({ label, got, target }: { label: string; got: number; target?: number }) {
  const g = Math.round(got);
  const hit = target !== undefined && target > 0 && g >= target;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, hit && styles.statHit]}>
        {g}
        {target && target > 0 ? <Text style={styles.statTarget}> / {Math.round(target)}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { height: 56, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: spacing.sm, marginBottom: spacing.md },

  field: { marginBottom: spacing.md },
  label: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },

  macroRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  macroField: { flex: 1 },
  macroLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  macroInput: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    textAlign: "center",
  },

  buildBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  buildBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  pressed: { opacity: 0.85 },

  banner: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#FFFFFF" },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.md },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: spacing.lg, textAlign: "center" },

  result: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadow.card,
  },
  resultMerchant: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  line: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  lineQty: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  lineName: { fontFamily: fonts.body, fontSize: 14, color: colors.text, flex: 1 },
  linePrice: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  macroSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  stat: { alignItems: "center", flex: 1 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  statValue: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, marginTop: 3 },
  statTarget: { fontFamily: fonts.body, fontSize: 12, color: colors.placeholder },
  statHit: { color: colors.success },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  total: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text },

  orderBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  orderBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },

  instacartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginTop: spacing.sm,
  },
  instacartBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.primary },
  instacartNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm },
});
