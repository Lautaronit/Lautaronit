/**
 * HomeScreen.tsx
 * -----------------------------------------------------------------------------
 * The main screen. On entry you see the wordmark and the input box (the star).
 * When you send an order, the screen turns into a chat: your message + the
 * response card with the order.
 *
 * The ☰ button (top-left) opens Settings.
 */

import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createOrder, getPreferences, type CreateOrderResponse } from "../api";
import { colors, fonts, formatMoney, radius, spacing } from "../theme";

interface Props {
  token: string;
  onOpenMenu: () => void;
}

interface Message {
  id: string;
  role: "user" | "bot";
  text?: string;
  order?: CreateOrderResponse;
}

export default function HomeScreen({ token, onOpenMenu }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [usualOrder, setUsualOrder] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // Traemos "lo de siempre" (Preferences) para ofrecer el atajo en la home.
  useEffect(() => {
    getPreferences(token)
      .then((p) => setUsualOrder(p.usualOrder))
      .catch(() => setUsualOrder(null));
  }, [token]);

  /** Envía un pedido a partir de un texto (lo usan el input y el atajo). */
  async function sendText(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: `u${Date.now()}`, role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    scrollToEnd();

    try {
      const order = await createOrder(text, token);
      setMessages((m) => [...m, { id: `b${Date.now()}`, role: "bot", order }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setMessages((m) => [...m, { id: `b${Date.now()}`, role: "bot", text: msg }]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void sendText(text);
  }

  function scrollToEnd() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  const empty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          hitSlop={8}
        >
          <Ionicons name="menu" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {empty ? (
          <View style={styles.hero}>
            <Text style={styles.wordmark}>On It</Text>
            <Text style={styles.slogan}>
              Ask for anything.{"\n"}We're on it.
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) =>
              m.role === "user" ? (
                <View key={m.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              ) : m.order ? (
                <OrderCard key={m.id} order={m.order} />
              ) : (
                <View key={m.id} style={styles.botBubble}>
                  <Text style={styles.botText}>{m.text}</Text>
                </View>
              ),
            )}
            {sending ? (
              <View style={styles.botBubble}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <View style={styles.inputWrap}>
        {empty && usualOrder && !sending ? (
          <Pressable
            style={({ pressed }) => [styles.usualChip, pressed && styles.usualChipPressed]}
            onPress={() => sendText(usualOrder)}
            accessibilityRole="button"
            accessibilityLabel="Order the usual"
          >
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={styles.usualText} numberOfLines={1}>
              Order the usual
            </Text>
            <Text style={styles.usualPreview} numberOfLines={1}>
              {usualOrder}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="What do you want to order?"
            placeholderTextColor={colors.placeholder}
            multiline
            accessibilityLabel="Write your order"
          />
          <View style={styles.inputActions}>
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                (sending || !input.trim()) && styles.sendBtnDisabled,
                pressed && styles.sendBtnPressed,
              ]}
              onPress={send}
              disabled={sending || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send order"
            >
              <Ionicons name="arrow-up" size={22} color={colors.accentText} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function OrderCard({ order }: { order: CreateOrderResponse }) {
  const { result } = order;
  const ok = result.status === "confirmed";
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={ok ? "checkmark-circle" : "close-circle"}
          size={20}
          color={ok ? colors.success : colors.danger}
        />
        <Text style={styles.cardStatus}>
          {ok ? "Order confirmed" : "Couldn't confirm"}
        </Text>
      </View>

      {result.lines.map((l) => (
        <View key={l.sku} style={styles.cardLine}>
          <Text style={styles.cardLineQty}>{l.quantity}×</Text>
          <Text style={styles.cardLineName}>{l.name}</Text>
          <Text style={styles.cardLinePrice}>{formatMoney(l.lineTotalCents)}</Text>
        </View>
      ))}

      <View style={styles.cardFooter}>
        <Text style={styles.cardTotalLabel}>Total</Text>
        <Text style={styles.cardTotal}>{formatMoney(result.totalCents)}</Text>
      </View>

      {ok && result.estimatedDeliveryMinutes ? (
        <Text style={styles.cardEta}>
          Estimated delivery: {result.estimatedDeliveryMinutes} min
        </Text>
      ) : null}
      {!ok && result.message ? (
        <Text style={styles.cardError}>{result.message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 52,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  body: { flex: 1 },

  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  wordmark: { fontFamily: fonts.wordmark, fontSize: 60, color: colors.primary },
  slogan: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  chat: { flex: 1 },
  chatContent: { padding: spacing.md, gap: spacing.sm },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  userText: { fontFamily: fonts.body, fontSize: 15, color: colors.accentText },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: "85%",
  },
  botText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },

  card: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxWidth: "90%",
    gap: 6,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  cardStatus: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text },
  cardLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardLineQty: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  cardLineName: { fontFamily: fonts.body, fontSize: 14, color: colors.text, flex: 1 },
  cardLinePrice: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  cardTotalLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  cardTotal: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  cardEta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardError: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: 2 },

  inputWrap: { padding: spacing.md },
  usualChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: spacing.sm,
  },
  usualChipPressed: { opacity: 0.7 },
  usualText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  usualPreview: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  inputBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 84,
    justifyContent: "space-between",
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  inputActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.sm },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnPressed: { opacity: 0.85 },
});
