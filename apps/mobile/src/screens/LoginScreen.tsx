/**
 * LoginScreen.tsx
 * -----------------------------------------------------------------------------
 * Pantalla de autenticación con dos modos: iniciar sesión y crear cuenta
 * (Sign up). Mantiene la identidad: fondo crema, wordmark "On It" en cursiva, y
 * el botón principal en verde (el naranja se reserva para la flecha de la home).
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
import { login, register } from "../api";
import { saveToken } from "../storage";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  onLoggedIn: (token: string) => void;
}

type Mode = "login" | "signup";

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("demo@onit.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    // Al pasar a registro, limpiamos el email demo; al volver, lo reponemos.
    setEmail(next === "signup" ? "" : "demo@onit.app");
    setName("");
  }

  async function handleSubmit() {
    if (loading) return;
    const mail = email.trim();
    if (!mail || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = isSignup
        ? await register({ email: mail, password, name: name.trim() || undefined })
        : await login(mail, password);
      await saveToken(res.token);
      onLoggedIn(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
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
          {isSignup ? "Create your account." : "Ask for anything.\nWe're on it."}
        </Text>
      </View>

      <View style={styles.form}>
        {isSignup ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name (optional)"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="words"
            accessibilityLabel="Name"
          />
        ) : null}
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
          placeholder={isSignup ? "Password (min. 8 characters)" : "Password"}
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          accessibilityLabel="Password"
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={isSignup ? "Create account" : "Log in"}
        >
          {loading ? (
            <ActivityIndicator color={colors.accentText} />
          ) : (
            <Text style={styles.buttonText}>{isSignup ? "Create account" : "Log in"}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => switchTo(isSignup ? "login" : "signup")}
          style={styles.switchRow}
          accessibilityRole="button"
          accessibilityLabel={isSignup ? "Go to log in" : "Go to sign up"}
          hitSlop={8}
        >
          <Text style={styles.switchText}>
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Text style={styles.switchLink}>{isSignup ? "Log in" : "Sign up"}</Text>
          </Text>
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
  switchRow: { alignItems: "center", paddingVertical: spacing.md },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  switchLink: { fontFamily: fonts.bodyMedium, color: colors.primary },
});
