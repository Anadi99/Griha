/**
 * ScalePress — Phase 4 upgrade
 * Tighter spring, faster opacity, satisfying press feel
 */
import React, { useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

interface ScalePressProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children: React.ReactNode;
}

export function ScalePress({
  children, style, scale = 0.96,
  onPress, onPressIn, onPressOut, disabled, ...rest
}: ScalePressProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleIn = (e: any) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scale,
        useNativeDriver: true,
        tension: 400,   // snappier
        friction: 12,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.72,
        duration: 60,   // faster dim
        useNativeDriver: true,
      }),
    ]).start();
    onPressIn?.(e);
  };

  const handleOut = (e: any) => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 400,
        friction: 12,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      disabled={disabled}
      {...rest}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: disabled ? 1 : scaleAnim }],
            opacity: disabled ? 0.4 : opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
