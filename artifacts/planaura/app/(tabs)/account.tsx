import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Switch, Alert, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";
import { ONBOARDING_KEY } from "@/app/onboarding";

function SettingRow({ icon, label, value, onPress, danger, toggle, toggleValue, onToggle }: {
  icon: string; label: string; value?: string;
  onPress?: () => void; danger?: boolean;
  toggle?: boolean; toggleValue?: boolean; onToggle?: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <ScalePress onPress={onPress} scale={0.98} disabled={toggle}>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: danger ? colors.destructiveMuted : colors.primaryMuted }]}>
          <Feather name={icon as any} size={15} color={danger ? colors.destructive : colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {toggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        ) : (
          <View style={styles.rowRight}>
            {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
            {onPress && <Feather name="chevron-right" size={14} color={colors.muted} />}
          </View>
        )}
      </View>
    </ScalePress>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const store = useDesignerStore();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [notifications, setNotifications] = useState(false);
  const [haptics, setHaptics] = useState(true);

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all saved plans and reset the app. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Done", "All data cleared. Restart the app.");
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    Haptics.selectionAsync();
    Alert.alert("Done", "Onboarding will show on next app launch.");
  };

  const planCount = store.savedPlans.length;
  const totalArea = store.savedPlans.reduce((s, p) => s + p.totalArea, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 },
        isIOS ? {} : { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {isIOS && <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Account</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Settings & preferences</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.primaryMuted, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Feather name="user" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>Guest User</Text>
            <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>
              {planCount} plan{planCount !== 1 ? "s" : ""} · {totalArea} sqft designed
            </Text>
          </View>
          <View style={[styles.v2Badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.v2BadgeText}>v2 Login</Text>
          </View>
        </View>

        <Section title="APP">
          <SettingRow icon="bell" label="Notifications"
            toggle toggleValue={notifications} onToggle={setNotifications} />
          <SettingRow icon="zap" label="Haptic Feedback"
            toggle toggleValue={haptics} onToggle={setHaptics} />
          <SettingRow icon="moon" label="Appearance" value="System" />
        </Section>

        <Section title="PLANS">
          <SettingRow icon="folder" label="Saved Plans" value={`${planCount} plans`} />
          <SettingRow icon="maximize-2" label="Total Area Designed" value={`${totalArea} sqft`} />
          <SettingRow icon="download" label="Export All Plans" onPress={() =>
            Alert.alert("Coming in v2", "Bulk export will be available with cloud sync.")} />
        </Section>

        <Section title="ABOUT">
          <SettingRow icon="info" label="App Version" value="1.0.0" />
          <SettingRow icon="map-pin" label="Location Data" value="10 cities" />
          <SettingRow icon="shield" label="Privacy Policy" onPress={() =>
            Alert.alert("Privacy", "Griha stores all data locally on your device. Nothing is uploaded.")} />
          <SettingRow icon="file-text" label="Terms of Use" onPress={() =>
            Alert.alert("Terms", "Griha is provided as-is for personal use.")} />
        </Section>

        <Section title="DEVELOPER">
          <SettingRow icon="refresh-cw" label="Reset Onboarding" onPress={handleResetOnboarding} />
          <SettingRow icon="trash-2" label="Clear All Data" onPress={handleClearData} danger />
        </Section>

        <Text style={[styles.footer, { color: colors.muted }]}>
          Griha · गृह · Home, by design.{"\n"}Built with ♥ for homeowners everywhere.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { overflow: "hidden" },
  headerInner: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 2 },
  content: { padding: 16, gap: 20 },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  profileName: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  profileSub: { fontSize: 13, marginTop: 3 },
  v2Badge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  v2BadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 13 },

  footer: { fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
});
