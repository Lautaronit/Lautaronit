/**
 * PreferencesScreen.tsx
 * -----------------------------------------------------------------------------
 * A few personal preferences: your "usual order" (for quick repeats later),
 * dietary notes/restrictions, and whether to get order notifications.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPreferences, updatePreferences } from "../api";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

export default function PreferencesScreen({ token, onBack }: Props) {
  const [usualOrder, setUsualOrder] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [notifyOnOrder, setNotifyOnOrder] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await getPreferences(token);
      setUsualOrder(p.usualOrder ?? "");
      setDietaryNotes(p.dietaryNotes ?? "");
      setNotifyOnOrder(p.notifyOnOrder);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your preferences.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setBanner(null);
    try {
      await updatePreferences(
        {
          usualOrder: usualOrder.trim() || null,
          dietaryNotes: dietaryNotes.trim() || null,
          notifyOnOrder,
        },
        token,
      );
      setBanner("Preferences saved ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Preferences</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {banner ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>YOUR USUAL ORDER</Text>
          <TextInput
            style={styles.area}
            value={usualOrder}
            onChangeText={setUsualOrder}
            placeholder="e.g. 2 big mac combo medium"
            placeholderTextColor={colors.placeholder}
            multiline
            accessibilityLabel="Usual order"
          />
          <Text style={styles.hint}>Save what you order most, to repeat it in a tap later.</Text>

          <Text style={styles.sectionLabel}>DIETARY NOTES</Text>
          <TextInput
            style={styles.area}
            value={dietaryNotes}
            onChangeText={setDietaryNotes}
            placeholder="e.g. no pork, gluten-free"
            placeholderTextColor={colors.placeholder}
            multiline
            accessibilityLabel="Dietary notes"
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Order notifications</Text>
              <Text style={styles.hint}>Get a heads-up when an order is placed.</Text>
            </View>
            <Switch
              value={notifyOnOrder}
              onValueChange={setNotifyOnOrder}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Save preferences"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { height: 56, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  banner: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#FFFFFF" },

  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  area: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 56,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  switchLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },

  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.md },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  pressed: { opacity: 0.85 },
});
