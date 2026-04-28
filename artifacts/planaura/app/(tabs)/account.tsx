import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Switch, Alert, useColorScheme, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";
import { ONBOARDING_KEY } from "@/app/onboarding";

const { width: SW } = Dimensions.get("window");
const SKY = "#38BDF8";
const INDIGO = "#818CF8";

function SettingRow({ icon, label, value, onPress, danger, muted, toggle, toggleValue, onToggle }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  danger?: boolean; muted?: boolean; toggle?: boolean;
  toggleValue?: boolean; onToggle?: (v: boolean) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const iconColor = danger ? "#FF6B6B" : isDark ? SKY : "#0284C7";
  const labelColor = danger ? "#FF6B6B" : muted
    ? (isDark ? "rgba(148,163,184,0.7)" : "#64748B")
    : (isDark ? "#FFFFFF" : "#0F172A");

  return (
    <ScalePress onPress={onPress} scale={0.98} disabled={toggle}>
      <View style={[styles.row, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }]}>
        <View style={[styles.rowIcon, {
          backgroundColor: danger
            ? "rgba(255,107,107,0.12)"
            : isDark ? "rgba(56,189,248,0.10)" : "rgba(2,132,199,0.08)",
        }]}>
          <Feather name={icon as any} size={15} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {toggle ? (
          <Switch value={toggleValue} onValueChange={onToggle}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: SKY }}
            thumbColor="#fff" />
        ) : (
          <View style={styles.rowRight}>
            {value && <Text style={[styles.rowValue, { color: isDark ? "rgba(255,255,255,0.35)" : "#94A3B8" }]}>{value}</Text>}
            {onPress && <Feather name="chevron-right" size={14} color={isDark ? "rgba(255,255,255,0.2)" : "#CBD5E1"} />}
          </View>
        )}
      </View>
    </ScalePress>
  );
}

function GlassSection({ title, children }: { title: string; children: React.ReactNode }) {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8" }]}>
        {title}
      </Text>
      <View style={[styles.sectionCard, {
        borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        backgroundColor: isDark ? "rgba(15,23,42,0.5)" : "#FFFFFF",
        overflow: "hidden",
      }]}>
        {isDark && isIOS && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
        {children}
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const store = useDesignerStore();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [notifications, setNotifications] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const planCount = store.savedPlans.length;
  const totalArea = store.savedPlans.reduce((s, p) => s + p.totalArea, 0);

  const handleClearData = () => {
    Alert.alert("Clear All Data", "This will delete all saved plans. Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        await AsyncStorage.clear();
        Alert.alert("Done", "All data cleared.");
      }},
    ]);
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    Haptics.selectionAsync();
    Alert.alert("Done", "Onboarding will show on next launch.");
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#080E1D" : "#F8FAFC" }]}>
      {/* Smoky radial gradient background */}
      {isDark && (
        <>
          <View style={styles.bgGradientTop} pointerEvents="none" />
          <View style={styles.bgGradientBottom} pointerEvents="none" />
        </>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        {isDark && isIOS && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
        {(!isDark || !isIOS) && (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: isDark ? "rgba(8,14,29,0.9)" : "#F8FAFC",
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
          }]} />
        )}
        <View style={styles.headerInner}>
          <Text style={[styles.headerLabel, { color: isDark ? "rgba(129,140,248,0.7)" : "#6366F1" }]}>
            PROFILE
          </Text>
          <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Account</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card — Indigo Halo ── */}
        <View style={[styles.profileCard, {
          backgroundColor: isDark ? "rgba(15,23,42,0.6)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
        }]}>
          {isDark && isIOS && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}

          {/* Avatar with Indigo Halo */}
          <View style={styles.avatarWrap}>
            <View style={styles.indigoHalo} />
            <LinearGradient
              colors={[INDIGO, SKY]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Feather name="user" size={28} color="#fff" />
            </LinearGradient>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
              Guest User
            </Text>
            <Text style={[styles.profileStats, { color: isDark ? "rgba(255,255,255,0.45)" : "#64748B" }]}>
              {planCount} plan{planCount !== 1 ? "s" : ""} · {totalArea} sqft designed
            </Text>
          </View>

          <View style={[styles.v2Badge, { backgroundColor: isDark ? "rgba(56,189,248,0.12)" : "#E0F2FE", borderColor: isDark ? "rgba(56,189,248,0.25)" : "#BAE6FD" }]}>
            <Text style={[styles.v2BadgeText, { color: SKY }]}>v2 Login</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: planCount.toString(), label: "Plans", color: SKY },
            { value: totalArea.toString(), label: "sqft", color: INDIGO },
            { value: "1.0", label: "Version", color: "#34D399" },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, {
              backgroundColor: isDark ? "rgba(15,23,42,0.5)" : "#FFFFFF",
              borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
            }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8" }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <GlassSection title="APP">
          <SettingRow icon="bell" label="Notifications" toggle toggleValue={notifications} onToggle={setNotifications} />
          <SettingRow icon="zap" label="Haptic Feedback" toggle toggleValue={haptics} onToggle={setHaptics} />
          <SettingRow icon="moon" label="Appearance" value="System" />
        </GlassSection>

        <GlassSection title="PLANS">
          <SettingRow icon="folder" label="Saved Plans" value={`${planCount} plans`} />
          <SettingRow icon="maximize-2" label="Total Area Designed" value={`${totalArea} sqft`} />
          <SettingRow icon="download" label="Export All Plans" muted onPress={() =>
            Alert.alert("Coming in v2", "Bulk export available with cloud sync.")} />
        </GlassSection>

        <GlassSection title="ABOUT">
          <SettingRow icon="info" label="App Version" value="1.0.0" />
          <SettingRow icon="map-pin" label="Location Data" value="10 cities" />
          <SettingRow icon="shield" label="Privacy Policy" muted onPress={() =>
            Alert.alert("Privacy", "Griha stores all data locally. Nothing is uploaded.")} />
          <SettingRow icon="file-text" label="Terms of Use" muted onPress={() =>
            Alert.alert("Terms", "Griha is provided as-is for personal use.")} />
        </GlassSection>

        <GlassSection title="DEVELOPER">
          <SettingRow icon="refresh-cw" label="Reset Onboarding" onPress={handleResetOnboarding} />
          <SettingRow icon="trash-2" label="Clear All Data" onPress={handleClearData} danger />
        </GlassSection>

        <Text style={[styles.footer, { color: isDark ? "rgba(255,255,255,0.18)" : "#94A3B8" }]}>
          Griha · गृह · Home, by design.{"\n"}Built with ♥ for homeowners everywhere.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgGradientTop: {
    position: "absolute", top: -100, left: -100,
    width: SW * 0.8, height: SW * 0.8, borderRadius: SW * 0.4,
    backgroundColor: INDIGO, opacity: 0.06,
  },
  bgGradientBottom: {
    position: "absolute", bottom: -80, right: -80,
    width: SW * 0.6, height: SW * 0.6, borderRadius: SW * 0.3,
    backgroundColor: SKY, opacity: 0.04,
  },
  header: { overflow: "hidden", zIndex: 10 },
  headerInner: { paddingHorizontal: 20, paddingBottom: 14 },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  content: { padding: 16, gap: 16 },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 24, borderWidth: 1, padding: 18, overflow: "hidden",
  },
  avatarWrap: { position: "relative", width: 60, height: 60 },
  indigoHalo: {
    position: "absolute", inset: -4,
    borderRadius: 34, borderWidth: 1.5,
    borderColor: INDIGO + "50",
    shadowColor: INDIGO, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
  },
  avatar: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  profileStats: { fontSize: 13, marginTop: 3 },
  v2Badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  v2BadgeText: { fontSize: 11, fontWeight: "800" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 3 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.8 },
  statLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },

  section: { gap: 7 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 18, borderWidth: 1 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 13 },

  footer: { fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
});
