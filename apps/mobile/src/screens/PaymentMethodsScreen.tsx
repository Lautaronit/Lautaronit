/**
 * PaymentMethodsScreen.tsx
 * -----------------------------------------------------------------------------
 * Saved cards: list, add (Stripe test cards only), set default and remove.
 * Same simulated-Stripe backend as the wallet — no real card is ever stored.
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  addPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  setDefaultCard,
  type PaymentMethod,
} from "../api";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

export default function PaymentMethodsScreen({ token, onBack }: Props) {
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setCards(await getPaymentMethods(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your cards.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function makeDefault(c: PaymentMethod) {
    if (c.isDefault) return;
    setBusy(c.id);
    setError(null);
    try {
      await setDefaultCard(c.id, token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set the default card.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await deletePaymentMethod(id, token);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the card.");
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
        <Text style={styles.title}>Payment methods</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : cards.length === 0 && !adding ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={30} color={colors.placeholder} />
            <Text style={styles.muted}>No cards yet.</Text>
          </View>
        ) : (
          cards.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardMain}>
                <Ionicons name="card" size={22} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>
                    {c.brand} ••{c.last4}
                    {c.isDefault ? "  ·  Default" : ""}
                  </Text>
                  <Text style={styles.cardExp}>
                    Expires {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                  </Text>
                </View>
              </View>
              {confirmDelete === c.id ? (
                <View style={styles.actions}>
                  <Text style={styles.confirmText}>Remove this card?</Text>
                  <Pressable onPress={() => remove(c.id)} disabled={busy === c.id} hitSlop={6}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(null)} hitSlop={6}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  {!c.isDefault ? (
                    <Pressable onPress={() => makeDefault(c)} disabled={busy === c.id} style={styles.actionBtn} hitSlop={6}>
                      {busy === c.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="star-outline" size={15} color={colors.primary} />
                          <Text style={styles.actionText}>Set default</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => setConfirmDelete(c.id)} style={styles.actionBtn} hitSlop={6}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={styles.deleteText}>Remove</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}

        {adding ? (
          <AddCardForm
            token={token}
            onCancel={() => setAdding(false)}
            onAdded={async () => {
              setAdding(false);
              await load();
            }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Add card"
          >
            <Ionicons name="add" size={20} color={colors.bg} />
            <Text style={styles.newBtnText}>Add card</Text>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.note}>
          Simulated payments (Stripe test mode). Use a test card like
          4242 4242 4242 4242 — real cards are rejected.
        </Text>
      </ScrollView>
    </View>
  );
}

function AddCardForm({
  token,
  onCancel,
  onAdded,
}: {
  token: string;
  onCancel: () => void;
  onAdded: () => void;
}) {
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const digits = number.replace(/\D/g, "");
    const m = exp.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
    if (!m) {
      setErr("Expiration must be MM/YY.");
      return;
    }
    const expMonth = Number.parseInt(m[1]!, 10);
    let expYear = Number.parseInt(m[2]!, 10);
    if (expYear < 100) expYear += 2000;
    if (!digits || cvc.length < 3) {
      setErr("Fill in the card number and CVC.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await addPaymentMethod({ number: digits, expMonth, expYear, cvc }, token);
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the card.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={styles.input} value={number} onChangeText={setNumber} placeholder="4242 4242 4242 4242" placeholderTextColor={colors.placeholder} keyboardType="number-pad" accessibilityLabel="Card number" />
      <View style={styles.formRow}>
        <TextInput style={[styles.input, { flex: 1 }]} value={exp} onChangeText={setExp} placeholder="MM/YY" placeholderTextColor={colors.placeholder} accessibilityLabel="Expiration" />
        <TextInput style={[styles.input, { flex: 1 }]} value={cvc} onChangeText={setCvc} placeholder="CVC" placeholderTextColor={colors.placeholder} keyboardType="number-pad" accessibilityLabel="CVC" />
      </View>
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={6}>
          <Text style={styles.actionText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Save card">
          {saving ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.saveBtnText}>Save card</Text>}
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

  empty: { alignItems: "center", gap: 6, paddingVertical: spacing.xl },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.sm },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  cardExp: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },

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

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  newBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  pressed: { opacity: 0.85 },

  note: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: spacing.lg },

  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  formRow: { flexDirection: "row", gap: spacing.sm },
  formActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: spacing.md },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: "center" },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
});
