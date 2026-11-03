/**
 * AuthedApp.tsx
 * -----------------------------------------------------------------------------
 * Navegación simple para la parte logueada: Home ⇄ Settings ⇄ Credits.
 * Un router por estado, liviano, suficiente para este tramo (sin dependencias
 * de navegación extra).
 */

import { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import CreditsScreen from "./screens/CreditsScreen";
import OrderHistoryScreen from "./screens/OrderHistoryScreen";
import ScheduledOrdersScreen from "./screens/ScheduledOrdersScreen";
import AddressesScreen from "./screens/AddressesScreen";
import PaymentMethodsScreen from "./screens/PaymentMethodsScreen";
import PreferencesScreen from "./screens/PreferencesScreen";
import BasketScreen from "./screens/BasketScreen";

type Screen =
  | "home"
  | "settings"
  | "credits"
  | "history"
  | "scheduled"
  | "addresses"
  | "payments"
  | "preferences"
  | "basket";

interface Props {
  token: string;
  onLogout: () => void;
}

export default function AuthedApp({ token, onLogout }: Props) {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "settings") {
    return (
      <SettingsScreen
        token={token}
        onBack={() => setScreen("home")}
        onOpenCredits={() => setScreen("credits")}
        onOpenHistory={() => setScreen("history")}
        onOpenScheduled={() => setScreen("scheduled")}
        onOpenAddresses={() => setScreen("addresses")}
        onOpenPayments={() => setScreen("payments")}
        onOpenPreferences={() => setScreen("preferences")}
        onOpenBasket={() => setScreen("basket")}
        onLogout={onLogout}
      />
    );
  }

  if (screen === "basket") {
    return <BasketScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "addresses") {
    return <AddressesScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "payments") {
    return <PaymentMethodsScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "preferences") {
    return <PreferencesScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "credits") {
    return <CreditsScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "history") {
    return <OrderHistoryScreen token={token} onBack={() => setScreen("settings")} />;
  }

  if (screen === "scheduled") {
    return <ScheduledOrdersScreen token={token} onBack={() => setScreen("settings")} />;
  }

  return <HomeScreen token={token} onOpenMenu={() => setScreen("settings")} />;
}
