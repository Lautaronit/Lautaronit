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
import { Ionicons } from "@expo/vector-icons";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchTo(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
    setEmail("");
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
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder={isSignup ? "Password (min. 8 characters)" : "Password"}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPassword}
            accessibilityLabel="Password"
            onSubmitEditing={handleSubmit}
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

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
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
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
