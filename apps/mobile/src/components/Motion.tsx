/**
 * Motion.tsx
 * -----------------------------------------------------------------------------
 * Capa de animaciones reutilizable (sin dependencias extra: usa el Animated
 * nativo de React Native, que react-native-web traduce a CSS en la web).
 *
 * - FadeInUp: aparición suave (fade + leve deslizamiento) al montar. Con `delay`
 *   para escalonar varios elementos.
 * - PressScale: un Pressable que "se hunde" un poco al tocarlo (feedback premium).
 */

import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface FadeInUpProps {
  children: React.ReactNode;
  /** Retraso antes de animar, en ms (para escalonar). */
  delay?: number;
  /** Cuánto sube al aparecer, en px. */
  distance?: number;
  /** Duración de la animación, en ms. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Aparición suave: opacidad 0→1 y un leve translateY, con easing elegante. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 14,
  duration = 420,
  style,
}: FadeInUpProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [distance, 0],
  });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface PressScaleProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** A cuánto se encoge al presionar (1 = sin cambio). */
  scaleTo?: number;
}

/** Pressable con micro-interacción: escala suave al presionar. */
export function PressScale({
  children,
  style,
  scaleTo = 0.95,
  disabled,
  ...rest
}: PressScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => animateTo(1)}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
