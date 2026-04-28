import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform,
  Switch, Alert, useColorScheme, Dimensions, TouchableOpacity,
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
const GOLD = "#FBBF24";

/* ── Subscription tiers ── */
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    color: "rgba(255,255,255,0.15)",
    border: "rgba(255,255,255,0.10)",
    badge: null,
    features: [
      "3 saved plans",
      "Basic canvas (50 rooms max)",
      "Vastu analysis",
      "Cost estimation",
      "Room scan (3/month)",
    ],
    locked: [
      "AI chat assistant",
      "Unlimited plans",
      "Export as PDF",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹299",
    period: "/month",
    color: "rgba(56,189,248,0.12)",
    border: SKY + "40",
    badge: "POPULAR",
    badgeColor: SKY,
    features: [
      "Unlimited saved plans",
      "Full canvas (unlimited rooms)",
      "AI Vastu chat (100 msgs/month)",
      "AI room scan (unlimited)",
      "Sunlight & ventilation analysis",
      "BOQ estimation",
      "Export as PNG",
      "Compare mode",
      "Email support",
    ],
    locked: [
      "PDF export",
      "Priority support",
      "Custom branding",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: "₹799",
    period: "/month",
    color: "rgba(251,191,36,0.08)",
    border: GOLD + "40",
    badge: "BEST VALUE",
    badgeColor: GOLD,
    features: [
      "Everything in Pro",
      "Unlimited AI chat",
      "PDF export with full report",
      "AI layout generator (unlimited)",
      "Priority support (24h response)",
      "Custom plan branding",
      "Early access to new features",
      "Community Hub access",
      "Dedicated account manager",
    ],
    locked: [],
  },
];

/* ── Row component ── */
function Row({ icon, label, value, onPress, danger, muted, toggle, toggleValue, onToggle, accent }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  danger?: boolean; muted?: boolean; toggle?: boolean;
  toggleValue?: boolean; onToggle?: (v: boolean) => void; accent?: string;
}) {
  const isDark = useColorScheme() === "dark";
  const iconColor = danger ? "#FF6B6B" : accent ?? (isDark ? SKY : "#0284C7");
  const labelColor = danger ? "#FF6B6B"
    : muted ? (isDark ? "rgba(148,163,184,0.7)" : "#64748B")
    : (isDark ? "#FFFFFF" : "#0F172A");

  return (
    <ScalePress onPress={onPress} scale={0.98} disabled={toggle || !onPress}>
      <View style={[styles.row, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }]}>
        <View style={[styles.rowIcon, {
          backgroundColor: danger ? "rgba(255,107,107,0.12)"
            : accent ? accent + "18"
            : isDark ? "rgba(56,189,248,0.10)" : "rgba(2,132,199,0.08)",
        }]}>
          <Feather name={icon as any} size={15} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {toggle ? (
          <Switch value={toggleValue} onValueChange={onToggle}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: SKY }} thumbColor="#fff" />
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

/* ── Glass section ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8" }]}>{title}</Text>
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
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [showPlans, setShowPlans] = useState(false);
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [language, setLanguage] = useState("English");

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

  const currentPlan = PLANS.find(p => p.id === selectedPlan) ?? PLANS[0];

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#080E1D" : "#F8FAFC" }]}>
      {isDark && (
        <>
          <View style={styles.bgTop} pointerEvents="none" />
          <View style={styles.bgBottom} pointerEvents="none" />
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
          <Text style={[styles.headerLabel, { color: isDark ? "rgba(129,140,248,0.7)" : "#6366F1" }]}>PROFILE</Text>
          <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Account</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}>

        {/* ── Profile card ── */}
        <View style={[styles.profileCard, {
          backgroundColor: isDark ? "rgba(15,23,42,0.6)" : "#FFFFFF",
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
        }]}>
          {isDark && isIOS && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
          <View style={styles.avatarWrap}>
            <View style={styles.indigoHalo} />
            <LinearGradient colors={[INDIGO, SKY]} style={styles.avatar}>
              <Feather name="user" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Guest User</Text>
            <Text style={[styles.profileStats, { color: isDark ? "rgba(255,255,255,0.45)" : "#64748B" }]}>
              {planCount} plan{planCount !== 1 ? "s" : ""} · {totalArea} sqft designed
            </Text>
          </View>
          <View style={[styles.planBadge, {
            backgroundColor: selectedPlan === "elite" ? GOLD + "18" : selectedPlan === "pro" ? SKY + "18" : "rgba(255,255,255,0.08)",
            borderColor: selectedPlan === "elite" ? GOLD + "40" : selectedPlan === "pro" ? SKY + "40" : "rgba(255,255,255,0.12)",
          }]}>
            <Text style={[styles.planBadgeText, {
              color: selectedPlan === "elite" ? GOLD : selectedPlan === "pro" ? SKY : "rgba(255,255,255,0.5)",
            }]}>
              {currentPlan.name.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Stats */}
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

        {/* ── Subscription Plans ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8" }]}>GRIHA SUBSCRIPTION</Text>
            <ScalePress onPress={() => setShowPlans(!showPlans)} scale={0.95}>
              <Text style={[styles.seeAll, { color: SKY }]}>{showPlans ? "Hide" : "View Plans"}</Text>
            </ScalePress>
          </View>

          {/* Current plan summary */}
          <View style={[styles.currentPlanCard, {
            backgroundColor: isDark ? "rgba(15,23,42,0.5)" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
          }]}>
            <View style={styles.currentPlanLeft}>
              <Text style={[styles.currentPlanName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                {currentPlan.name} Plan
              </Text>
              <Text style={[styles.currentPlanPrice, { color: isDark ? "rgba(255,255,255,0.4)" : "#64748B" }]}>
                {currentPlan.price}{currentPlan.period}
              </Text>
            </View>
            <ScalePress onPress={() => setShowPlans(true)} scale={0.96}>
              <LinearGradient colors={[SKY, INDIGO]} style={styles.upgradeBtn}>
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </LinearGradient>
            </ScalePress>
          </View>

          {/* Plan cards */}
          {showPlans && (
            <View style={styles.plansGrid}>
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <ScalePress key={plan.id} onPress={() => {
                    setSelectedPlan(plan.id);
                    Haptics.selectionAsync();
                    if (plan.id !== "free") {
                      Alert.alert(`Upgrade to ${plan.name}`, `${plan.price}${plan.period}\n\nIn-app purchases coming in v2.`, [{ text: "OK" }]);
                    }
                  }} scale={0.97}>
                    <View style={[styles.planCard, {
                      backgroundColor: plan.color,
                      borderColor: isSelected ? (plan.badgeColor ?? SKY) : plan.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    }]}>
                      {plan.badge && (
                        <View style={[styles.planBadgeTag, { backgroundColor: (plan.badgeColor ?? SKY) + "20", borderColor: (plan.badgeColor ?? SKY) + "40" }]}>
                          <Text style={[styles.planBadgeTagText, { color: plan.badgeColor ?? SKY }]}>{plan.badge}</Text>
                        </View>
                      )}
                      <Text style={[styles.planName, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>{plan.name}</Text>
                      <View style={styles.planPriceRow}>
                        <Text style={[styles.planPrice, { color: plan.badgeColor ?? SKY }]}>{plan.price}</Text>
                        <Text style={[styles.planPeriod, { color: isDark ? "rgba(255,255,255,0.4)" : "#64748B" }]}>{plan.period}</Text>
                      </View>
                      {plan.features.slice(0, 4).map((f) => (
                        <View key={f} style={styles.featureRow}>
                          <Feather name="check" size={11} color={plan.badgeColor ?? SKY} />
                          <Text style={[styles.featureText, { color: isDark ? "rgba(255,255,255,0.7)" : "#374151" }]}>{f}</Text>
                        </View>
                      ))}
                      {plan.features.length > 4 && (
                        <Text style={[styles.moreFeatures, { color: plan.badgeColor ?? SKY }]}>+{plan.features.length - 4} more</Text>
                      )}
                    </View>
                  </ScalePress>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Account Settings ── */}
        <Section title="ACCOUNT">
          <Row icon="user" label="Public Profile" value="Set up" onPress={() => Alert.alert("Coming in v2", "Public profile with portfolio coming soon.")} />
          <Row icon="at-sign" label="Username" value="@guest" onPress={() => Alert.alert("Coming in v2", "Username setup available with login.")} />
          <Row icon="lock" label="Change Password" muted onPress={() => Alert.alert("Coming in v2", "Password management coming with auth.")} />
        </Section>

        {/* ── Appearance ── */}
        <Section title="APPEARANCE">
          <View style={[styles.row, { borderBottomColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }]}>
            <View style={[styles.rowIcon, { backgroundColor: isDark ? "rgba(56,189,248,0.10)" : "rgba(2,132,199,0.08)" }]}>
              <Feather name="moon" size={15} color={SKY} />
            </View>
            <Text style={[styles.rowLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>Theme</Text>
            <View style={styles.themeToggle}>
              {(["light", "system", "dark"] as const).map((t) => (
                <ScalePress key={t} onPress={() => { setTheme(t); Haptics.selectionAsync(); }} scale={0.9}
                  style={[styles.themeBtn, theme === t && { backgroundColor: SKY }]}>
                  <Text style={[styles.themeBtnText, { color: theme === t ? "#00354A" : isDark ? "rgba(255,255,255,0.4)" : "#94A3B8" }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </ScalePress>
              ))}
            </View>
          </View>
          <Row icon="globe" label="Language" value={language} onPress={() => {
            Alert.alert("Language", "Select language", [
              { text: "English", onPress: () => setLanguage("English") },
              { text: "हिंदी", onPress: () => setLanguage("हिंदी") },
              { text: "தமிழ்", onPress: () => setLanguage("தமிழ்") },
              { text: "తెలుగు", onPress: () => setLanguage("తెలుగు") },
              { text: "मराठी", onPress: () => setLanguage("मराठी") },
              { text: "Cancel", style: "cancel" },
            ]);
          }} />
        </Section>

        {/* ── App Settings ── */}
        <Section title="APP">
          <Row icon="bell" label="Notifications" toggle toggleValue={notifications} onToggle={setNotifications} />
          <Row icon="zap" label="Haptic Feedback" toggle toggleValue={haptics} onToggle={setHaptics} />
        </Section>

        {/* ── Community & Support ── */}
        <Section title="COMMUNITY & SUPPORT">
          <Row icon="users" label="Community Hub" value="Join" accent={INDIGO}
            onPress={() => Alert.alert("Community Hub", "Connect with architects, designers and homeowners.\n\nLaunching with v2.")} />
          <Row icon="message-circle" label="Customer Support" accent={SKY}
            onPress={() => Alert.alert("Support", "For help, email: support@griha.app\n\nAI support chat coming in v2.")} />
          <Row icon="star" label="Rate Griha" accent={GOLD}
            onPress={() => Alert.alert("Rate Us", "Enjoying Griha? Leave us a review on the App Store / Play Store.")} />
          <Row icon="message-square" label="Send Feedback" muted
            onPress={() => Alert.alert("Feedback", "We'd love to hear from you!\n\nEmail: feedback@griha.app")} />
        </Section>

        {/* ── About ── */}
        <Section title="ABOUT">
          <Row icon="info" label="App Version" value="1.0.0 (Beta)" />
          <Row icon="map-pin" label="Location Data" value="10 cities" />
          <Row icon="cpu" label="AI Model" value="Gemini 1.5 Flash" />
          <Row icon="shield" label="Privacy Policy" muted
            onPress={() => Alert.alert("Privacy", "Griha stores all data locally on your device. Nothing is uploaded to any server without your consent.")} />
          <Row icon="file-text" label="Terms of Use" muted
            onPress={() => Alert.alert("Terms", "Griha is provided as-is for personal use. Commercial use requires a Pro or Elite subscription.")} />
          <Row icon="heart" label="Open Source Credits" muted
            onPress={() => Alert.alert("Credits", "Built with Expo, React Native, Zustand, Google Gemini, and ♥")} />
        </Section>

        {/* ── Plans ── */}
        <Section title="PLANS">
          <Row icon="folder" label="Saved Plans" value={`${planCount} plans`} />
          <Row icon="maximize-2" label="Total Area Designed" value={`${totalArea} sqft`} />
          <Row icon="download" label="Export All Plans" muted
            onPress={() => Alert.alert("Coming in v2", "Bulk export available with Pro subscription.")} />
        </Section>

        {/* ── Developer ── */}
        <Section title="DEVELOPER">
          <Row icon="refresh-cw" label="Reset Onboarding" onPress={handleResetOnboarding} />
          <Row icon="trash-2" label="Clear All Data" onPress={handleClearData} danger />
        </Section>

        <Text style={[styles.footer, { color: isDark ? "rgba(255,255,255,0.15)" : "#94A3B8" }]}>
          Griha · गृह · Home, by design.{"\n"}v1.0.0 Beta · Built with ♥ for homeowners everywhere.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgTop: { position: "absolute", top: -100, left: -100, width: SW * 0.8, height: SW * 0.8, borderRadius: SW * 0.4, backgroundColor: INDIGO, opacity: 0.06 },
  bgBottom: { position: "absolute", bottom: -80, right: -80, width: SW * 0.6, height: SW * 0.6, borderRadius: SW * 0.3, backgroundColor: SKY, opacity: 0.04 },
  header: { overflow: "hidden", zIndex: 10 },
  headerInner: { paddingHorizontal: 20, paddingBottom: 14 },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  content: { padding: 16, gap: 16 },

  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 24, borderWidth: 1, padding: 18, overflow: "hidden" },
  avatarWrap: { position: "relative", width: 60, height: 60 },
  indigoHalo: { position: "absolute", inset: -4, borderRadius: 34, borderWidth: 1.5, borderColor: INDIGO + "50", shadowColor: INDIGO, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4 },
  avatar: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  profileStats: { fontSize: 13, marginTop: 3 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  planBadgeText: { fontSize: 11, fontWeight: "800" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 3 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.8 },
  statLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },

  section: { gap: 7 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  seeAll: { fontSize: 12, fontWeight: "700" },
  sectionCard: { borderRadius: 18, borderWidth: 1 },

  currentPlanCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  currentPlanLeft: { gap: 2 },
  currentPlanName: { fontSize: 15, fontWeight: "700" },
  currentPlanPrice: { fontSize: 13 },
  upgradeBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  plansGrid: { gap: 10, marginTop: 4 },
  planCard: { borderRadius: 20, padding: 16, gap: 8, overflow: "hidden" },
  planBadgeTag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 2 },
  planBadgeTagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  planPrice: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  planPeriod: { fontSize: 13 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  featureText: { fontSize: 13, flex: 1 },
  moreFeatures: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 13 },

  themeToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 2, gap: 2 },
  themeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  themeBtnText: { fontSize: 11, fontWeight: "700" },

  footer: { fontSize: 12, textAlign: "center", lineHeight: 20, marginTop: 8 },
});
