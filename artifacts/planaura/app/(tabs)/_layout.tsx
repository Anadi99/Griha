/**
 * Griha — Magnetic Dock Tab Bar
 * Obsidian Ocean design system
 * Floating pill, scale animation, sky blue active state
 */
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import {
  Platform, StyleSheet, View, Text, Animated,
  TouchableOpacity, Dimensions, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const { width: SW } = Dimensions.get("window");

const TABS = [
  { name: "index",       label: "Home",    icon: "home"       as const },
  { name: "designer",    label: "Design",  icon: "edit-2"     as const },
  { name: "plans",       label: "Plans",   icon: "folder"     as const },
  { name: "marketplace", label: "Explore", icon: "compass"    as const },
  { name: "account",     label: "Account", icon: "user"       as const },
];

const SKY = "#38BDF8";
const INACTIVE = "rgba(255,255,255,0.35)";
const DOCK_BG_IOS = undefined; // BlurView handles it
const DOCK_BG_ANDROID = "rgba(13,19,34,0.92)";

function MagneticDock({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";

  // Scale animations per tab
  const scaleAnims = useRef(TABS.map((_, i) =>
    new Animated.Value(i === 0 ? 1.2 : 1)
  )).current;

  const activeIdx = (() => {
    const name = state.routes[state.index]?.name;
    const idx = TABS.findIndex((t) => t.name === name);
    return idx === -1 ? 0 : idx;
  })();

  useEffect(() => {
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIdx ? 1.22 : 1,
        tension: 220, friction: 10, useNativeDriver: true,
      }).start();
    });
  }, [activeIdx]);

  const handlePress = (name: string) => {
    const route = state.routes.find((r: any) => r.name === name);
    if (!route) return;
    if (state.routes[state.index]?.name !== name) {
      navigation.navigate(name);
    }
  };

  const botPad = insets.bottom;

  return (
    <View style={[styles.dockOuter, { paddingBottom: botPad + 8 }]}>
      {/* Ambient glow behind dock */}
      <View style={styles.dockGlow} pointerEvents="none" />

      {/* Dock pill */}
      <View style={styles.dockPill}>
        {isIOS ? (
          <BlurView
            intensity={60}
            tint="dark"
            style={[StyleSheet.absoluteFill, styles.dockBlur]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: DOCK_BG_ANDROID, borderRadius: 999 }]} />
        )}

        {/* Border */}
        <View style={[StyleSheet.absoluteFill, styles.dockBorder]} pointerEvents="none" />

        {/* Tabs */}
        <View style={styles.dockRow}>
          {TABS.map((tab, idx) => {
            const isActive = idx === activeIdx;
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => handlePress(tab.name)}
                style={styles.dockItem}
                activeOpacity={0.7}
              >
                <Animated.View style={[
                  styles.dockIconWrap,
                  isActive && styles.dockIconActive,
                  { transform: [{ scale: scaleAnims[idx] }] },
                ]}>
                  <Feather
                    name={tab.icon}
                    size={22}
                    color={isActive ? SKY : INACTIVE}
                  />
                </Animated.View>
                <Text style={[
                  styles.dockLabel,
                  { color: isActive ? SKY : "rgba(255,255,255,0.3)" },
                  isActive && styles.dockLabelActive,
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <MagneticDock {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="designer" />
      <Tabs.Screen name="plans" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="account" />
      {/* Hidden */}
      <Tabs.Screen name="scan"     options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="generate" options={{ href: null }} />
      <Tabs.Screen name="compare"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockOuter: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dockGlow: {
    position: "absolute", bottom: 0, left: "10%", right: "10%", height: 80,
    backgroundColor: SKY,
    opacity: 0.06,
    borderRadius: 999,
    transform: [{ scaleX: 1.4 }],
  },
  dockPill: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  dockBlur: { borderRadius: 999 },
  dockBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  dockRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dockItem: {
    flex: 1, alignItems: "center", gap: 3,
  },
  dockIconWrap: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
    borderRadius: 12,
  },
  dockIconActive: {
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  dockLabel: {
    fontSize: 10, fontWeight: "600", letterSpacing: 0.2,
  },
  dockLabelActive: {
    fontWeight: "700",
  },
});
