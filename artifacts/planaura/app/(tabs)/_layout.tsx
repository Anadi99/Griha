import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="designer">
        <Icon sf={{ default: "pencil", selected: "pencil.fill" }} />
        <Label>Designer</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Plans</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="marketplace">
        <Icon sf={{ default: "bag", selected: "bag.fill" }} />
        <Label>Marketplace</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" as const, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name={focused ? "home" : "home"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="designer"
        options={{
          title: "Designer",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="floor-plan" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ color }) => (
            <Feather name="folder" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Marketplace",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="store-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
