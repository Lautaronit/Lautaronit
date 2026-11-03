/**
 * App.tsx
 * -----------------------------------------------------------------------------
 * Raíz de la app On It. Carga las fuentes, resuelve si hay sesión guardada y
 * muestra el login o la home según corresponda.
 */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Fraunces_500Medium_Italic } from "@expo-google-fonts/fraunces";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { getToken, clearToken } from "./src/storage";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import AuthedApp from "./src/AuthedApp";

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium_Italic,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
  });

  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Al abrir: ¿hay sesión guardada?
  useEffect(() => {
    getToken()
      .then((t) => setToken(t))
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = useCallback(async () => {
    await clearToken();
    setToken(null);
  }, []);

  if (!fontsLoaded || checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {token ? (
        <AuthedApp token={token} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoggedIn={setToken} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
