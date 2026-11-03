/**
 * LoginScreen.tsx
 * -----------------------------------------------------------------------------
 * Pantalla de inicio de sesión. Mantiene la identidad: fondo crema, wordmark
 * "On It" en cursiva, y el botón principal en verde (el naranja se reserva para
 * la flecha de enviar de la home).
 */

import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { login } from "../api";
import { saveToken } from "../storage";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  onLoggedIn: (token: string) => void;
}

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("demo@onit.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      await saveToken(res.token);
      onLoggedIn(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.wordmark}>On It</Text>
        <Text style={styles.slogan}>
          Ask for anything.{"\n"}We're on it.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          accessibilityLabel="Password"
          onSubmitEditing={handleLogin}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  wordmark: {
    fontFamily: fonts.wordmark,
    fontSize: 64,
    color: colors.primary,
  },
  slogan: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: spacing.md,
  },
  form: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.accentText,
  },
});
