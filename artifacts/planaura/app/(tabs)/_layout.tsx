/**
 * Tab Layout — 5-tab premium nav bar
 * Center Home button elevated + animated
 * Sliding indicator animation
 * Hidden tabs: scan, sketch, insights, generate, compare (accessible from Home)
 */
import { BlurView } from "expo-blur";
import { Tabs, usePathname } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import {
  Platform, StyleSheet, View, Text, Animated,
  useColorScheme, TouchableOpacity, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: SW } = Dimensions.get("window");

const TABS = [
  { name: "marketplace", label: "Explore",  icon: "compass"    as const },
  { name: "plans",       label: "Plans",    icon: "folder"     as const },
  { name: "index",       label: "Home",     icon: "home"       as const, isCenter: true },
  { name: "designer",    label: "Design",   icon: "edit-2"     as const },
  { name: "account",     label: "Account",  icon: "user"       as const },
];

const BAR_HEIGHT_IOS = 84;
const BAR_HEIGHT_ANDROID = 68;
const CENTER_SIZE = 58;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const botPad = insets.bottom;
  const barHeight = isIOS ? BAR_HEIGHT_IOS : BAR_HEIGHT_ANDROID;

  // Sliding indicator animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(TABS.map(() => new Animated.Value(1))).current;

  // Find active tab index among our 5 visible tabs
  const pathname = state.routes[state.index]?.name ?? "index";
  const activeIdx = TABS.findIndex((t) => t.name === pathname);
  const safeActiveIdx = activeIdx === -1 ? 2 : activeIdx; // default to Home

  useEffect(() => {
    const tabW = SW / TABS.length;
    Animated.spring(slideAnim, {
      toValue: safeActiveIdx * tabW + tabW / 2 - 16,
      tension: 180, friction: 14, useNativeDriver: true,
    }).start();

    // Scale active tab icon
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === safeActiveIdx ? 1.15 : 1,
        tension: 200, friction: 10, useNativeDriver: true,
      }).start();
    });
  }, [safeActiveIdx]);

  const handlePress = (tabName: string, idx: number) => {
    const route = state.routes.find((r: any) => r.name === tabName);
    if (!route) return;
    const isFocused = state.index === state.routes.indexOf(route);
    if (!isFocused) {
      navigation.navigate(tabName);
    }
  };

  return (
    <View style={[
      styles.barContainer,
      { height: barHeight + botPad, paddingBottom: botPad },
    ]}>
      {/* Blur / solid background */}
      {isIOS ? (
        <BlurView
          intensity={85}
          tint={isDark ? "dark" : "extraLight"}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      )}

      {/* Top border */}
      <View style={[styles.topBorder, { backgroundColor: colors.border }]} />

      {/* Sliding indicator */}
      <Animated.View style={[
        styles.indicator,
        { backgroundColor: colors.primary, transform: [{ translateX: slideAnim }] },
      ]} />

      {/* Tab buttons */}
      <View style={styles.tabRow}>
        {TABS.map((tab, idx) => {
          const isActive = idx === safeActiveIdx;
          const isCenter = tab.isCenter;

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerTabWrap}
                onPress={() => handlePress(tab.name, idx)}
                activeOpacity={0.85}
              >
                <Animated.View style={[
                  styles.centerBtn,
                  { backgroundColor: colors.primary, transform: [{ scale: scaleAnims[idx] }] },
                ]}>
                  <Feather name={tab.icon} size={24} color="#fff" />
                </Animated.View>
                <Text style={[styles.centerLabel, { color: isActive ? colors.primary : colors.muted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => handlePress(tab.name, idx)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnims[idx] }] }}>
                <Feather
                  name={tab.icon}
                  size={21}
                  color={isActive ? colors.primary : colors.muted}
                />
              </Animated.View>
              <Text style={[
                styles.tabLabel,
                { color: isActive ? colors.primary : colors.muted },
                isActive && styles.tabLabelActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Visible tabs */}
      <Tabs.Screen name="index" />
      <Tabs.Screen name="designer" />
      <Tabs.Screen name="plans" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="account" />

      {/* Hidden tabs — accessible from Home screen feature grid */}
      <Tabs.Screen name="scan"        options={{ href: null }} />
      <Tabs.Screen name="insights"    options={{ href: null }} />
      <Tabs.Screen name="generate"    options={{ href: null }} />
      <Tabs.Screen name="compare"     options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    overflow: "hidden",
  },
  topBorder: {
    height: StyleSheet.hairlineWidth,
    position: "absolute", top: 0, left: 0, right: 0,
  },
  indicator: {
    position: "absolute",
    top: 0,
    width: 32, height: 3,
    borderRadius: 2,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingHorizontal: 4,
    flex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  centerTabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    paddingBottom: 4,
    marginTop: -18,  // lifts the center button above the bar
  },
  centerBtn: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5E3C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
});
