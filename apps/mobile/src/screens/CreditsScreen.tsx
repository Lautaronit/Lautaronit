/**
 * CreditsScreen.tsx
 * -----------------------------------------------------------------------------
 * The wallet, now wired to the backend: real balance, add funds (charged to a
 * saved card), saved payment methods, and recent activity.
 *
 * Payments run through a SIMULATED Stripe provider for now (no real money moves,
 * no Stripe account needed). Cards must be Stripe test numbers, e.g.
 * 4242 4242 4242 4242 — the backend rejects anything else, so a real card can't
 * be entered or stored.
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
  getWallet,
  getWalletTransactions,
  topUp,
  type PaymentMethod,
  type WalletTransaction,
} from "../api";
import { colors, fonts, formatDate, formatMoney, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

const QUICK_AMOUNTS = [1000, 2500, 5000]; // $10 / $25 / $50 en centavos

export default function CreditsScreen({ token, onBack }: Props) {
  const [balanceCents, setBalanceCents] = useState(0);
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);

  const [addingCard, setAddingCard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, c, t] = await Promise.all([
        getWallet(token),
        getPaymentMethods(token),
        getWalletTransactions(token),
      ]);
      setBalanceCents(w.balanceCents);
      setCards(c);
      setTxns(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your wallet.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const defaultCard = cards.find((c) => c.isDefault) ?? cards[0];

  async function handleTopUp() {
    const dollars = Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(dollars) || dollars <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }
    if (!defaultCard) {
      setError("Add a card before adding funds.");
      return;
    }
    setToppingUp(true);
    setError(null);
    setBanner(null);
    try {
      const out = await topUp(Math.round(dollars * 100), token, defaultCard.id);
      setBalanceCents(out.balanceCents);
      setBanner(`Added ${formatMoney(Math.round(dollars * 100))} ✓`);
      setAmount("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add funds.");
    } finally {
      setToppingUp(false);
    }
  }

  async function removeCard(id: string) {
    setError(null);
    try {
      await deletePaymentMethod(id, token);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the card.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Credits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          {loading ? (
            <ActivityIndicator color={colors.bg} style={{ alignSelf: "flex-start", marginTop: 8 }} />
          ) : (
            <Text style={styles.balanceAmount}>{formatMoney(balanceCents)}</Text>
          )}
        </View>

        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {/* Add funds */}
        <Text style={styles.sectionLabel}>ADD FUNDS</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((a) => (
            <Pressable
              key={a}
              style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
              onPress={() => setAmount(String(a / 100))}
              accessibilityRole="button"
            >
              <Text style={styles.quickChipText}>{formatMoney(a)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.amountRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="$ amount"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            accessibilityLabel="Amount to add"
          />
          <Pressable
            onPress={handleTopUp}
            disabled={toppingUp || !amount.trim()}
            style={({ pressed }) => [
              styles.addBtn,
              (toppingUp || !amount.trim()) && styles.addBtnDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add funds"
          >
            {toppingUp ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : (
              <Text style={styles.addBtnText}>Add funds</Text>
            )}
          </Pressable>
        </View>
        {defaultCard ? (
          <Text style={styles.chargeNote}>
            Charged to {defaultCard.brand} ••{defaultCard.last4}
          </Text>
        ) : (
          <Text style={styles.chargeNote}>Add a card below to add funds.</Text>
        )}

        {/* Payment methods */}
        <Text style={styles.sectionLabel}>PAYMENT METHODS</Text>
        {cards.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={22} color={colors.textMuted} />
            <Text style={styles.emptyText}>No cards yet</Text>
          </View>
        ) : (
          cards.map((c) => (
            <View key={c.id} style={styles.cardRow}>
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
              {confirmDelete === c.id ? (
                <View style={styles.confirmRow}>
                  <Pressable onPress={() => removeCard(c.id)} hitSlop={6}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(null)} hitSlop={6}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDelete(c.id)} hitSlop={8} accessibilityLabel="Remove card">
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))
        )}

        {addingCard ? (
          <AddCardForm
            token={token}
            onCancel={() => setAddingCard(false)}
            onAdded={async () => {
              setAddingCard(false);
              await load();
            }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addCardRow, pressed && styles.pressed]}
            onPress={() => setAddingCard(true)}
            accessibilityRole="button"
            accessibilityLabel="Add card"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addCardText}>Add card</Text>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Recent activity */}
        {txns.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
            {txns.map((t) => {
              const positive = t.amountCents >= 0;
              return (
                <View key={t.id} style={styles.txnRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnDesc} numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text style={styles.txnDate}>{formatDate(t.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txnAmount, positive ? styles.txnIn : styles.txnOut]}>
                    {positive ? "+" : "−"}
                    {formatMoney(Math.abs(t.amountCents))}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        <Text style={styles.note}>
          Simulated payments (Stripe test mode) — no real money moves yet. Use a
          test card like 4242 4242 4242 4242.
        </Text>
      </ScrollView>
    </View>
  );
}

/** Inline form to add a (test) card. */
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
      <TextInput
        style={styles.input}
        value={number}
        onChangeText={setNumber}
        placeholder="4242 4242 4242 4242"
        placeholderTextColor={colors.placeholder}
        keyboardType="number-pad"
        accessibilityLabel="Card number"
      />
      <View style={styles.formRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={exp}
          onChangeText={setExp}
          placeholder="MM/YY"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Expiration"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={cvc}
          onChangeText={setCvc}
          placeholder="CVC"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          accessibilityLabel="CVC"
        />
      </View>
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={6}>
          <Text style={styles.actionText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Save card"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={styles.saveBtnText}>Save card</Text>
          )}
        </Pressable>
      </View>
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

  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    minHeight: 96,
  },
  balanceLabel: { fontFamily: fonts.body, fontSize: 12, color: "#B8C6BC", letterSpacing: 0.5 },
  balanceAmount: { fontFamily: fonts.wordmark, fontSize: 42, color: colors.bg, marginTop: 4 },

  banner: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
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

  quickRow: { flexDirection: "row", gap: spacing.sm },
  quickChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  quickChipText: { fontFamily: fonts.body, fontSize: 14, color: colors.primary },

  amountRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  amountInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  chargeNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  pressed: { opacity: 0.85 },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  cardExp: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  confirmRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },

  addCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
  },
  addCardText: { fontFamily: fonts.body, fontSize: 14, color: colors.primary },

  actionText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  deleteText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.danger },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.sm },

  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  txnDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  txnDate: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  txnAmount: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  txnIn: { color: colors.success },
  txnOut: { color: colors.text },

  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.lg,
  },

  // Add-card form
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
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
  formRow: { flexDirection: "row", gap: spacing.sm },
  formActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: spacing.md },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
});
