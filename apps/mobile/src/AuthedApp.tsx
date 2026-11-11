/**
 * AuthedApp.tsx
 * -----------------------------------------------------------------------------
 * Navegación simple para la parte logueada: Home ⇄ Settings ⇄ cada sección.
 * Un router por estado, liviano. Cada cambio de pantalla entra con una
 * transición suave (fade + leve deslizamiento) para una sensación premium.
 */

import { useState, type ReactNode } from "react";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import CreditsScreen from "./screens/CreditsScreen";
import OrderHistoryScreen from "./screens/OrderHistoryScreen";
import ScheduledOrdersScreen from "./screens/ScheduledOrdersScreen";
import AddressesScreen from "./screens/AddressesScreen";
import PaymentMethodsScreen from "./screens/PaymentMethodsScreen";
import PreferencesScreen from "./screens/PreferencesScreen";
import BasketScreen from "./screens/BasketScreen";
import { FadeInUp } from "./components/Motion";

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

  let content: ReactNode;

  if (screen === "settings") {
    content = (
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
  } else if (screen === "basket") {
    content = <BasketScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "addresses") {
    content = <AddressesScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "payments") {
    content = <PaymentMethodsScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "preferences") {
    content = <PreferencesScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "credits") {
    content = <CreditsScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "history") {
    content = <OrderHistoryScreen token={token} onBack={() => setScreen("settings")} />;
  } else if (screen === "scheduled") {
    content = <ScheduledOrdersScreen token={token} onBack={() => setScreen("settings")} />;
  } else {
    content = (
      <HomeScreen
        token={token}
        onOpenMenu={() => setScreen("settings")}
        onOpenCredits={() => setScreen("credits")}
      />
    );
  }

  // `key={screen}` remonta el contenido en cada cambio -> la transición se dispara.
  return (
    <FadeInUp key={screen} style={{ flex: 1 }} distance={10} duration={320}>
      {content}
    </FadeInUp>
  );
}
