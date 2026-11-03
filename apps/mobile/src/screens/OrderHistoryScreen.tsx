/**
 * OrderHistoryScreen.tsx
 * -----------------------------------------------------------------------------
 * The list of past orders, newest first, each with an "Order again" button that
 * replays the original message through the same ordering flow.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMerchants,
  getOrders,
  reorder,
  type MerchantInfo,
  type OrderRow,
} from "../api";
import { colors, fonts, formatDate, formatMoney, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

export default function OrderHistoryScreen({ token, onBack }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [merchants, setMerchants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ords, merch] = await Promise.all([getOrders(token), getMerchants()]);
      setOrders(ords);
      setMerchants(Object.fromEntries(merch.map((m: MerchantInfo) => [m.id, m.name])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your orders.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReorder(id: string) {
    if (reordering) return;
    setReordering(id);
    setBanner(null);
    try {
      const out = await reorder(id, token);
      const ok = out.result.status === "confirmed";
      setBanner(ok ? "Order placed again ✓" : out.result.message ?? "Couldn't confirm the order.");
      await load(); // refresh so the new order shows at the top
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Couldn't repeat the order.");
    } finally {
      setReordering(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Order history</Text>
      </View>

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={32} color={colors.placeholder} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.muted}>Your past orders will show up here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              merchantName={merchants[o.merchantId] ?? "Merchant"}
              reordering={reordering === o.id}
              disabled={reordering !== null}
              onReorder={() => handleReorder(o.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function OrderCard({
  order,
  merchantName,
  reordering,
  disabled,
  onReorder,
}: {
  order: OrderRow;
  merchantName: string;
  reordering: boolean;
  disabled: boolean;
  onReorder: () => void;
}) {
  const confirmed = order.status === "confirmed";
  const shown = order.items.slice(0, 3);
  const extra = order.items.length - shown.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.merchant}>{merchantName}</Text>
        <StatusPill status={order.status} />
      </View>
      <Text style={styles.date}>{formatDate(order.createdAt)}</Text>

      <View style={styles.items}>
        {shown.map((it) => (
          <Text key={it.id} style={styles.itemLine} numberOfLines={1}>
            {it.quantity}× {it.name}
          </Text>
        ))}
        {extra > 0 ? <Text style={styles.itemLine}>+{extra} more</Text> : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.total}>{formatMoney(order.totalCents)}</Text>
        <Pressable
          onPress={onReorder}
          disabled={disabled}
          style={({ pressed }) => [
            styles.reorderBtn,
            disabled && styles.reorderBtnDisabled,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Order again from ${merchantName}`}
        >
          {reordering ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.reorderText}>Order again</Text>
            </>
          )}
        </Pressable>
      </View>

      {!confirmed ? <Text style={styles.wasNote}>This order wasn't confirmed.</Text> : null}
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const confirmed = status === "confirmed";
  const label = confirmed
    ? "Confirmed"
    : status === "needs_review"
      ? "Needs review"
      : "Rejected";
  return (
    <View style={[styles.pill, confirmed ? styles.pillOk : styles.pillOff]}>
      <Text style={[styles.pillText, confirmed ? styles.pillTextOk : styles.pillTextOff]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 56,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" },

  banner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bg },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  merchant: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text, flex: 1 },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  items: { marginTop: 6, gap: 2 },
  itemLine: { fontFamily: fonts.body, fontSize: 14, color: colors.text },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  total: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 118,
    justifyContent: "center",
  },
  reorderBtnDisabled: { opacity: 0.5 },
  reorderText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  pressed: { opacity: 0.7 },
  wasNote: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginTop: 4 },

  pill: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  pillOk: { backgroundColor: "#E4F2EA" },
  pillOff: { backgroundColor: "#F3E7E5" },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  pillTextOk: { color: colors.success },
  pillTextOff: { color: colors.danger },
});
