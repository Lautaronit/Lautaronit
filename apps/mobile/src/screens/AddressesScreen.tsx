/**
 * AddressesScreen.tsx
 * -----------------------------------------------------------------------------
 * Delivery addresses: list, add/edit, set default and delete. The default
 * address is the one orders use when you don't pick another.
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
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type Address,
} from "../api";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

export default function AddressesScreen({ token, onBack }: Props) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAddresses(await getAddresses(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your addresses.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function makeDefault(a: Address) {
    if (a.isDefault) return;
    setBusy(a.id);
    setError(null);
    try {
      await updateAddress(a.id, { isDefault: true }, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the address.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await deleteAddress(id, token);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the address.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Addresses</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {editing ? (
          <AddressForm
            token={token}
            address={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
            onPress={() => setEditing("new")}
            accessibilityRole="button"
            accessibilityLabel="Add address"
          >
            <Ionicons name="add" size={20} color={colors.bg} />
            <Text style={styles.newBtnText}>Add address</Text>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : addresses.length === 0 && !editing ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={30} color={colors.placeholder} />
            <Text style={styles.muted}>No addresses yet.</Text>
            <Text style={styles.muted}>Add one so your orders know where to go.</Text>
          </View>
        ) : (
          addresses.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardLabel}>{a.label || "Address"}</Text>
                {a.isDefault ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>Default</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardLine}>{a.street}</Text>
              <Text style={styles.cardLine}>{a.city}</Text>
              {a.notes ? <Text style={styles.cardNotes}>{a.notes}</Text> : null}

              {confirmDelete === a.id ? (
                <View style={styles.actions}>
                  <Text style={styles.confirmText}>Delete this address?</Text>
                  <Pressable onPress={() => remove(a.id)} disabled={busy === a.id} hitSlop={6}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(null)} hitSlop={6}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  {!a.isDefault ? (
                    <Pressable onPress={() => makeDefault(a)} disabled={busy === a.id} style={styles.actionBtn} hitSlop={6}>
                      {busy === a.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="star-outline" size={15} color={colors.primary} />
                          <Text style={styles.actionText}>Set default</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => setEditing(a)} style={styles.actionBtn} hitSlop={6}>
                    <Ionicons name="create-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(a.id)} style={styles.actionBtn} hitSlop={6}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AddressForm({
  token,
  address,
  onCancel,
  onSaved,
}: {
  token: string;
  address: Address | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(address?.label ?? "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [notes, setNotes] = useState(address?.notes ?? "");
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!street.trim() || !city.trim()) {
      setErr("Street and city are required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        label: label.trim() || undefined,
        street: street.trim(),
        city: city.trim(),
        notes: notes.trim() || undefined,
        isDefault,
      };
      if (address) {
        await updateAddress(
          address.id,
          { ...payload, label: label.trim() || null, notes: notes.trim() || null },
          token,
        );
      } else {
        await createAddress(payload, token);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the address.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label (Home, Work…)" placeholderTextColor={colors.placeholder} accessibilityLabel="Label" />
      <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="Street and number" placeholderTextColor={colors.placeholder} accessibilityLabel="Street" />
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.placeholder} accessibilityLabel="City" />
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Notes (buzzer, floor…)" placeholderTextColor={colors.placeholder} accessibilityLabel="Notes" />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Set as default</Text>
        <Switch
          value={isDefault}
          onValueChange={setIsDefault}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.surface}
        />
      </View>
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={6}>
          <Text style={styles.actionText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Save address">
          {saving ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { height: 56, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.sm },

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  newBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  pressed: { opacity: 0.85 },

  empty: { alignItems: "center", gap: 6, paddingVertical: spacing.xl },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  cardLine: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  cardNotes: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  deleteText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.danger },
  confirmText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, flex: 1 },

  pill: { backgroundColor: "#E4F2EA", borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.success },

  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  switchLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  formActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: spacing.md },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
});
