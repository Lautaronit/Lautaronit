/**
 * SettingsScreen.tsx
 * -----------------------------------------------------------------------------
 * El área de cuenta / ajustes, abierta desde el menú ☰. Muestra la cuenta y las
 * secciones (direcciones, pagos, créditos, programados, historial, preferencias)
 * más cerrar sesión. Trato premium: tarjeta agrupada con profundidad, avatar con
 * gradiente, entrada escalonada y feedback de escala al tocar.
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
import { LinearGradient } from "expo-linear-gradient";
import { getMe, getWallet, type AuthUser } from "../api";
import { colors, fonts, formatMoney, radius, shadow, spacing } from "../theme";
import { FadeInUp, PressScale } from "../components/Motion";

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

  const items: RowItem[] = [
    { icon: "map-outline", label: "Addresses", onPress: onOpenAddresses },
    { icon: "card-outline", label: "Payment methods", onPress: onOpenPayments },
    {
      icon: "wallet-outline",
      label: "Credits",
      value: balanceCents !== null ? formatMoney(balanceCents) : undefined,
      onPress: onOpenCredits,
    },
    { icon: "nutrition-outline", label: "Macro basket", onPress: onOpenBasket },
    { icon: "calendar-outline", label: "Scheduled orders", onPress: onOpenScheduled },
    { icon: "receipt-outline", label: "Order history", onPress: onOpenHistory },
    { icon: "options-outline", label: "Preferences", onPress: onOpenPreferences },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FadeInUp>
          <View style={styles.profile}>
            <LinearGradient
              colors={["#215842", "#163A2B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
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
        </FadeInUp>

        <FadeInUp delay={90}>
          <View style={styles.menuCard}>
            {items.map((it, i) => (
              <Row key={it.label} {...it} isLast={i === items.length - 1} />
            ))}
          </View>
        </FadeInUp>

        <FadeInUp delay={180}>
          <PressScale
            onPress={onLogout}
            style={styles.logoutRow}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.danger} style={styles.rowIcon} />
            <Text style={[styles.rowLabel, { color: colors.danger }]}>Log out</Text>
          </PressScale>
        </FadeInUp>
      </ScrollView>
    </View>
  );
}

interface RowItem {
  icon: any;
  label: string;
  value?: string;
  onPress?: () => void;
}

function Row({ icon, label, value, onPress, isLast }: RowItem & { isLast?: boolean }) {
  return (
    <PressScale
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, isLast && styles.rowLast]}
      scaleTo={0.98}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </PressScale>
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
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatarText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.bg },
  profileName: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  profileEmail: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  menuCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginTop: spacing.sm,
    ...shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 24, textAlign: "center" },
  rowLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  rowValue: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },

  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
