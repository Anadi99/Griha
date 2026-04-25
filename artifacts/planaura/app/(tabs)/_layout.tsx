import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: SW } = Dimensions.get("window");

// With 8 tabs, each tab needs at least 72px to breathe.
// Total = 8 × 72 = 576px. On screens < 576px the bar scrolls.
const TAB_MIN_WIDTH = 72;
const TAB_COUNT = 9;
const TAB_BAR_HEIGHT_IOS = 88;
const TAB_BAR_HEIGHT_ANDROID = 68;
const TAB_BAR_HEIGHT_WEB = 84;

export default function TabLayout() {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const barHeight = isWeb
    ? TAB_BAR_HEIGHT_WEB
    : isIOS
    ? TAB_BAR_HEIGHT_IOS
    : TAB_BAR_HEIGHT_ANDROID;

  // Each tab width — distribute evenly if screen is wide enough, else fixed min
  const tabWidth = Math.max(TAB_MIN_WIDTH, SW / TAB_COUNT);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarScrollEnabled: true,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          height: barHeight,
          paddingBottom: isIOS ? 28 : 10,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          width: tabWidth,
          paddingHorizontal: 4,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "extraLight"}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                },
              ]}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "Inter_600SemiBold",
          marginBottom: 2,
          letterSpacing: 0.1,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="designer"
        options={{
          title: "Designer",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="floor-plan" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ color }) => (
            <Feather name="folder" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <Feather name="camera" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sketch"
        options={{
          title: "Sketch",
          tabBarIcon: ({ color }) => (
            <Feather name="pen-tool" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: "Generate",
          tabBarIcon: ({ color }) => (
            <Feather name="cpu" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: "Compare",
          tabBarIcon: ({ color }) => (
            <Feather name="columns" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
