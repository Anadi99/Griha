import React, { useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

interface ScalePressProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children: React.ReactNode;
}

export function ScalePress({ children, style, scale = 0.96, onPress, onPressIn, onPressOut, disabled, ...rest }: ScalePressProps) {
  const anim = useRef(new Animated.Value(1)).current;

  const handleIn = (e: any) => {
    Animated.spring(anim, { toValue: scale, useNativeDriver: true, tension: 300, friction: 10 }).start();
    onPressIn?.(e);
  };
  const handleOut = (e: any) => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
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
      <Animated.View style={[style, { transform: [{ scale: disabled ? 1 : anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
