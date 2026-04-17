import React, { useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, Animated, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";
import { ScalePress } from "@/components/ScalePress";

const FEATURES = [
  { icon: "layout"      as const, label: "Canvas Designer", desc: "Draw rooms by dragging on a grid canvas", color: "#4F46E5" },
  { icon: "compass"     as const, label: "Vastu Analysis",  desc: "AI energy scoring with placement advice",  color: "#7C3AED" },
  { icon: "trending-up" as const, label: "Cost Estimate",   desc: "3-tier construction cost breakdown",       color: "#10B981" },
  { icon: "users"       as const, label: "Marketplace",     desc: "Architects, contractors & materials",      color: "#F97316" },
];

const STATS = [
  { value: "6", label: "Room Types", color: "#4F46E5" },
  { value: "∞", label: "Undo Steps", color: "#7C3AED" },
  { value: "3", label: "Cost Tiers", color: "#10B981" },
];

/* ── Staggered feature tile ────────────────────────── */
function FeatureTile({ icon, label, desc, color, index }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string; desc: string; color: string; index: number;
}) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 90, friction: 10, delay: 300 + index * 80, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.featureTile, { backgroundColor: colors.card, borderColor: colors.border,
      opacity: anim, transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
      ]}]}>
      <View style={[styles.featureTileIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.featureTileLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.featureTileDesc, { color: colors.mutedForeground }]}>{desc}</Text>
    </Animated.View>
  );
}

/* ── Home screen ───────────────────────────────────── */
export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const store = useDesignerStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const heroAnim  = useRef(new Animated.Value(0)).current;
  const ctaAnim   = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const tipAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    store.loadSavedPlans();
    Animated.stagger(100, [
      Animated.spring(heroAnim,  { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(ctaAnim,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.spring(tipAnim,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
  }, []);

  const handleStart = () => {
    if (!store.currentPlan) store.createNewPlan("My Floor Plan");
    router.push("/(tabs)/designer");
  };

  const savedCount = store.savedPlans.length;
  const hasCurrent = !!store.currentPlan;

  const fadeSlide = (anim: Animated.Value, offset = 20) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────── */}
        <View style={[styles.heroSection, { backgroundColor: colors.primary }]}>
          <View style={styles.gridOverlay} pointerEvents="none">
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={[styles.gridLine, { left: `${i * 14.3}%` as any, backgroundColor: "#ffffff08" }]} />
            ))}
          </View>
          <Animated.View style={[styles.heroContent, fadeSlide(heroAnim, 28)]}>
            <View style={[styles.logoRing, { borderColor: "#ffffff30", backgroundColor: "#ffffff15" }]}>
              <Feather name="layout" size={30} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>PlanAura</Text>
            <Text style={styles.heroSubtitle}>Design floor plans with Vastu{"\n"}energy analysis built in</Text>
            {savedCount > 0 && (
              <View style={[styles.heroBadge, { backgroundColor: "#ffffff18", borderColor: "#ffffff30" }]}>
                <Feather name="folder" size={12} color="#ffffffCC" />
                <Text style={styles.heroBadgeText}>{savedCount} plan{savedCount > 1 ? "s" : ""} saved</Text>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.body}>
          {/* ── CTAs ───────────────────────────────── */}
          <Animated.View style={[styles.ctaGroup, fadeSlide(ctaAnim, 16)]}>
            <ScalePress onPress={handleStart} style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}>
              <Feather name={hasCurrent ? "play" : "edit-3"} size={18} color="#fff" />
              <Text style={styles.ctaPrimaryText}>{hasCurrent ? "Continue Designing" : "Start Designing"}</Text>
            </ScalePress>
            {savedCount > 0 && (
              <ScalePress
                onPress={() => router.push("/(tabs)/plans")}
                style={[styles.ctaSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="folder" size={16} color={colors.primary} />
                <Text style={[styles.ctaSecondaryText, { color: colors.primary }]}>My Saved Plans</Text>
              </ScalePress>
            )}
          </Animated.View>

          {/* ── Feature tiles ──────────────────────── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What you can do</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <FeatureTile key={f.label} {...f} index={i} />
            ))}
          </View>

          {/* ── Stats strip ────────────────────────── */}
          <Animated.View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }, fadeSlide(statsAnim, 12)]}>
            {STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
                {i < STATS.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </Animated.View>

          {/* ── Quick tip ──────────────────────────── */}
          <Animated.View style={[styles.tipCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "30" }, fadeSlide(tipAnim, 10)]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.primary }]}>
              Switch to <Text style={{ fontWeight: "700" }}>Draw mode</Text> on the Designer tab and drag to create rooms directly on the canvas.
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  heroSection: { paddingBottom: 40, overflow: "hidden" },
  gridOverlay: { position: "absolute", inset: 0, flexDirection: "row" },
  gridLine: { position: "absolute", top: 0, bottom: 0, width: 1 },
  heroContent: { alignItems: "center", paddingTop: 32, paddingHorizontal: 24, gap: 8 },
  logoRing: { width: 76, height: 76, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heroTitle: { fontSize: 38, fontWeight: "800", color: "#fff", letterSpacing: -1, lineHeight: 44 },
  heroSubtitle: { fontSize: 15, color: "#ffffffBB", textAlign: "center", lineHeight: 22 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  heroBadgeText: { color: "#ffffffCC", fontSize: 13, fontWeight: "500" },

  body: { paddingHorizontal: 16, paddingTop: 24, gap: 16 },

  ctaGroup: { gap: 10 },
  ctaPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, borderRadius: 14, shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  ctaPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ctaSecondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  ctaSecondaryText: { fontSize: 15, fontWeight: "600" },

  sectionTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.3, marginBottom: -4 },

  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  featureTile: { width: "47%", flexGrow: 1, padding: 16, borderRadius: 16, borderWidth: 1, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  featureTileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureTileLabel: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  featureTileDesc: { fontSize: 12, lineHeight: 17 },

  statsStrip: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 3 },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  statDivider: { width: 1, marginVertical: 16 },

  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
