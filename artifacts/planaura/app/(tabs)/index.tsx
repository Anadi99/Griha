import React, { useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform,
  Animated, Dimensions, useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";

const { width: SW } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "layout" as const,
    label: "Canvas Designer",
    desc: "Draw rooms by dragging on a precision grid",
    color: "#8B5E3C",
    bg: "#F5EDE3",
    darkBg: "#2D1F12",
  },
  {
    icon: "compass" as const,
    label: "Vastu Analysis",
    desc: "Real-time energy scoring & placement advice",
    color: "#6366F1",
    bg: "#EEF2FF",
    darkBg: "#1E1B4B",
  },
  {
    icon: "trending-up" as const,
    label: "Cost Estimate",
    desc: "3-tier construction cost breakdown",
    color: "#34D399",
    bg: "#ECFDF5",
    darkBg: "#0F2D1A",
  },
  {
    icon: "users" as const,
    label: "Marketplace",
    desc: "Architects, contractors & materials",
    color: "#FB923C",
    bg: "#FFF7ED",
    darkBg: "#2D1A05",
  },
];

function FeatureCard({
  icon, label, desc, color, bg, darkBg, index,
}: typeof FEATURES[0] & { index: number }) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, tension: 80, friction: 10,
      delay: 400 + index * 70, useNativeDriver: true,
    }).start();
  }, []);

  const cardBg = isDark ? darkBg : bg;

  return (
    <Animated.View style={[
      styles.featureCard,
      { backgroundColor: cardBg, borderColor: color + "20" },
      {
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      },
    ]}>
      <View style={[styles.featureIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.featureLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{desc}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const store = useDesignerStore();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const heroAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    store.loadSavedPlans();
    Animated.stagger(80, [
      Animated.spring(heroAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
      Animated.spring(bodyAnim, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    if (!store.currentPlan) store.createNewPlan("My Floor Plan");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/designer");
  };

  const savedCount = store.savedPlans.length;
  const hasCurrent = !!store.currentPlan;

  const fadeUp = (anim: Animated.Value, offset = 24) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={{ paddingTop: topPad }}>
          <LinearGradient
            colors={isDark
              ? ["#1A0505", "#0A0A0A"]
              : ["#FFF5F5", "#FAFAFA"]}
            style={styles.heroGradient}
          >
            {/* Decorative circles */}
            <View style={[styles.decCircle1, { backgroundColor: colors.primary + "12" }]} pointerEvents="none" />
            <View style={[styles.decCircle2, { backgroundColor: colors.primary + "08" }]} pointerEvents="none" />

            <Animated.View style={[styles.heroContent, fadeUp(heroAnim, 32)]}>
              {/* Logo mark */}
              <View style={[styles.logoMark, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                <Feather name="layout" size={26} color="#fff" />
              </View>

              <Text style={[styles.heroTitle, { color: colors.foreground }]}>PlanAura</Text>
              <Text style={[styles.heroTagline, { color: colors.mutedForeground }]}>
                Design spaces with{"\n"}energy intelligence
              </Text>

              {savedCount > 0 && (
                <View style={[styles.savedBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "25" }]}>
                  <Feather name="folder" size={11} color={colors.primary} />
                  <Text style={[styles.savedBadgeText, { color: colors.primary }]}>
                    {savedCount} saved plan{savedCount > 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ── Body ── */}
        <Animated.View style={[styles.body, fadeUp(bodyAnim, 20)]}>

          {/* CTAs */}
          <View style={styles.ctaGroup}>
            <ScalePress onPress={handleStart} scale={0.97}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.ctaPrimary}
              >
                <Feather name={hasCurrent ? "play" : "edit-3"} size={18} color="#fff" />
                <Text style={styles.ctaPrimaryText}>
                  {hasCurrent ? "Continue Designing" : "Start Designing"}
                </Text>
              </LinearGradient>
            </ScalePress>

            {savedCount > 0 && (
              <ScalePress
                onPress={() => router.push("/(tabs)/plans")}
                style={[styles.ctaSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
                scale={0.97}
              >
                <Feather name="folder" size={16} color={colors.primary} />
                <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>My Saved Plans</Text>
              </ScalePress>
            )}
          </View>

          {/* Stats strip */}
          {isIOS ? (
            <BlurView
              intensity={60} tint={isDark ? "dark" : "extraLight"}
              style={[styles.statsStrip, { borderColor: colors.border }]}
            >
              <StatsContent colors={colors} />
            </BlurView>
          ) : (
            <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <StatsContent colors={colors} />
            </View>
          )}

          {/* Features */}
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>What you can do</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.label} {...f} index={i} />
            ))}
          </View>

          {/* Tip card */}
          <View style={[styles.tipCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "25" }]}>
            <View style={[styles.tipIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={13} color={colors.primary} />
            </View>
            <Text style={[styles.tipText, { color: colors.primary }]}>
              Switch to <Text style={{ fontWeight: "800" }}>Draw mode</Text> on the Designer tab and drag to create rooms instantly.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function StatsContent({ colors }: { colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {  const STATS = [
    { value: "6", label: "Room Types", color: colors.primary },
    { value: "∞", label: "Undo Steps", color: "#6366F1" },
    { value: "3", label: "Cost Tiers", color: "#34D399" },
  ];
  return (
    <>
      {STATS.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
          {i < STATS.length - 1 && (
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  heroGradient: { paddingBottom: 36, overflow: "hidden" },
  decCircle1: {
    position: "absolute", width: SW * 0.9, height: SW * 0.9,
    borderRadius: SW * 0.45, top: -SW * 0.35, right: -SW * 0.25,
  },
  decCircle2: {
    position: "absolute", width: SW * 0.6, height: SW * 0.6,
    borderRadius: SW * 0.3, bottom: -SW * 0.1, left: -SW * 0.15,
  },
  heroContent: { alignItems: "center", paddingTop: 28, paddingHorizontal: 24, gap: 10 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  heroTitle: { fontSize: 40, fontWeight: "800", letterSpacing: -1.5, lineHeight: 46 },
  heroTagline: { fontSize: 16, textAlign: "center", lineHeight: 23, letterSpacing: -0.2 },
  savedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 4,
  },
  savedBadgeText: { fontSize: 13, fontWeight: "600" },

  body: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  ctaGroup: { gap: 10 },
  ctaPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 16,
    shadowColor: "#8B5E3C", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 6,
  },
  ctaPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  ctaSecondary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5,
  },  ctaSecondaryText: { fontSize: 15, fontWeight: "700" },

  statsStrip: {
    flexDirection: "row", borderRadius: 18, borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 3 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 14 },

  sectionLabel: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4, marginBottom: -2 },

  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  featureCard: {
    width: "47%", flexGrow: 1, padding: 16,
    borderRadius: 18, borderWidth: 1, gap: 8,
  },
  featureIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  featureLabel: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  featureDesc: { fontSize: 12, lineHeight: 17 },

  tipCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  tipIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
