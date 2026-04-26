/**
 * Toast — Phase 4 global notification system
 * Slides from top, auto-dismisses, supports success/error/info variants
 * Usage: const toast = useToast(); toast.show("Plan saved", "success");
 */
import React, {
  createContext, useContext, useRef, useState, useCallback, useEffect,
} from "react";
import {
  Animated, Text, StyleSheet, Platform, View, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";

/* ── Types ── */
type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

/* ── Context ── */
const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/* ── Config ── */
const VARIANT_CONFIG: Record<ToastVariant, { icon: string; color: string; bg: string; darkBg: string }> = {
  success: { icon: "check-circle", color: "#16A34A", bg: "#F0FDF4",  darkBg: "#0F2D1A" },
  error:   { icon: "x-circle",     color: "#DC2626", bg: "#FEF2F2",  darkBg: "#2D1515" },
  info:    { icon: "info", color: "#8B5E3C", bg: "#F5EDE3", darkBg: "#2D1F12" },
};

const DURATION = 2600;
const SLIDE_DISTANCE = -80;

/* ── Single toast ── */
function ToastBubble({
  item, onDone,
}: {
  item: ToastItem;
  onDone: (id: number) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const translateY = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = VARIANT_CONFIG[item.variant];

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0, tension: 180, friction: 14, useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 160, useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SLIDE_DISTANCE, duration: 260, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }),
      ]).start(() => onDone(item.id));
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  const bg = isDark ? cfg.darkBg : cfg.bg;
  const border = cfg.color + "30";

  const Inner = (
    <View style={[styles.inner, { borderColor: border }]}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + "18" }]}>
        <Feather name={cfg.icon as any} size={15} color={cfg.color} />
      </View>
      <Text style={[styles.message, { color: cfg.color }]} numberOfLines={2}>
        {item.message}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[styles.bubble, { transform: [{ translateY }], opacity }]}>
      {isIOS ? (
        <BlurView intensity={75} tint={isDark ? "dark" : "extraLight"}
          style={[styles.blurWrap, { borderColor: border }]}>
          {Inner}
        </BlurView>
      ) : (
        <View style={[styles.blurWrap, { backgroundColor: bg, borderColor: border }]}>
          {Inner}
        </View>
      )}
    </Animated.View>
  );
}

/* ── Provider ── */
let _idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View
        style={[styles.container, { top: insets.top + 8 }]}
        pointerEvents="none"
      >
        {toasts.map((t) => (
          <ToastBubble key={t.id} item={t} onDone={remove} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", left: 16, right: 16,
    zIndex: 9999, alignItems: "center", gap: 8,
  },
  bubble: {
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 10,
  },
  blurWrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  message: {
    flex: 1, fontSize: 14, fontWeight: "700", letterSpacing: -0.2,
  },
});
