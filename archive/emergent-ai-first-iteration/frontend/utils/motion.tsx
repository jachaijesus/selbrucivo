import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native';

/**
 * FadeIn — ambient slow entrance.
 * Default duration is editorial-paced (480ms).
 */
export function FadeIn({ children, delay = 0, duration = 480, translateY = 8, style }: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  translateY?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(ty, { toValue: 0, duration, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [delay, duration, opacity, ty]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Fader — controlled opacity for ambient overlays.
 */
export function Fader({ visible, children, duration = 600, style }: {
  visible: boolean;
  children: ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration, useNativeDriver: true, easing: Easing.inOut(Easing.cubic) }).start();
  }, [visible, duration, opacity]);
  return <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[{ opacity }, style]}>{children}</Animated.View>;
}
