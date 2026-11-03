/**
 * SettingsScreen.tsx
 * -----------------------------------------------------------------------------
 * The settings / account area, opened from the ☰ menu. Shows the account and
 * the sections (addresses, payment methods, credits, scheduled orders, order
 * history, preferences) plus log out.
 *
 * For this slice, only Credits navigates and Log out works; the other sections
 * are placeholders we'll build next.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMe, getWallet, type AuthUser } from "../api";
import { colors, fonts, formatMoney, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHistory: () => void;
  onOpenScheduled: () => void;
  onOpenAddresses: () => void;
  onOpenPayments: () => void;
  onOpenPreferences: () => void;
  onOpenBasket: () => void;
  onLogout: () => void;
}

export default function SettingsScreen({
  token,
  onBack,
  onOpenCredits,
  onOpenHistory,
  onOpenScheduled,
  onOpenAddresses,
  onOpenPayments,
  onOpenPreferences,
  onOpenBasket,
  onLogout,
}: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);

  useEffect(() => {
    getMe(token)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    getWallet(token)
      .then((w) => setBalanceCents(w.balanceCents))
      .catch(() => setBalanceCents(null));
  }, [token]);

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.profileName}>{user?.name ?? "Your account"}</Text>
                <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
              </>
            )}
          </View>
        </View>

        <Row icon="map-outline" label="Addresses" onPress={onOpenAddresses} />
        <Row icon="card-outline" label="Payment methods" onPress={onOpenPayments} />
        <Row
          icon="wallet-outline"
          label="Credits"
          value={balanceCents !== null ? formatMoney(balanceCents) : undefined}
          onPress={onOpenCredits}
        />
        <Row icon="nutrition-outline" label="Macro basket" onPress={onOpenBasket} />
        <Row icon="calendar-outline" label="Scheduled orders" onPress={onOpenScheduled} />
        <Row icon="receipt-outline" label="Order history" onPress={onOpenHistory} />
        <Row icon="options-outline" label="Preferences" onPress={onOpenPreferences} />

        <View style={styles.divider} />

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} style={styles.rowIcon} />
          <Text style={[styles.rowLabel, { color: colors.danger }]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </Pressable>
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

  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.bg },
  profileName: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  profileEmail: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: { opacity: 0.6 },
  rowIcon: { width: 24, textAlign: "center" },
  rowLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  rowValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },

  divider: { height: spacing.lg },
});
