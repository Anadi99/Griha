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
const SKY = "#38BDF8";
const INDIGO = "#818CF8";

const TOOLS = [
  { icon: "camera"      as const, label: "Room Scan",  desc: "AI photo analysis",           color: SKY,     route: "/(tabs)/scan"     },
  { icon: "sun"         as const, label: "Sunlight",   desc: "Light & airflow simulation",  color: "#FBBF24", route: "/(tabs)/insights" },
  { icon: "cpu"         as const, label: "Generate",   desc: "AI layout from requirements", color: INDIGO,  route: "/(tabs)/generate" },
  { icon: "columns"     as const, label: "Compare",    desc: "Side-by-side plan analysis",  color: "#34D399", route: "/(tabs)/compare"  },
  { icon: "bar-chart-2" as const, label: "Insights",   desc: "BOQ & location intel",        color: "#FB923C", route: "/(tabs)/insights" },
];

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  if (isDark && isIOS) {
    return (
      <BlurView intensity={40} tint="dark" style={[glassStyles.card, style]}>
        <View style={glassStyles.border} pointerEvents="none" />
        {children}
      </BlurView>
    );
  }
  return (
    <View style={[glassStyles.cardSolid, style, isDark && glassStyles.cardDark]}>
      {children}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden" },
  border: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cardSolid: { borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  cardDark: { backgroundColor: "rgba(21,27,43,0.85)", borderColor: "rgba(255,255,255,0.08)" },
});

function ToolCard({ icon, label, desc, color, route, index }: typeof TOOLS[0] & { index: number }) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const router = useRouter();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, tension: 80, friction: 10,
      delay: 200 + index * 55, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      width: "47%", flexGrow: 1,
    }}>
      <ScalePress onPress={() => { Haptics.selectionAsync(); router.push(route as any); }} scale={0.95}>
        <View style={[
          styles.toolCard,
          isDark
            ? { backgroundColor: "rgba(21,27,43,0.8)", borderColor: "rgba(255,255,255,0.07)" }
            : { backgroundColor: "#FFFFFF", borderColor: "#E2E8F0" },
        ]}>
          {/* Active indicator line */}
          <View style={[styles.toolAccent, { backgroundColor: color }]} />
          <View style={[styles.toolIcon, { backgroundColor: color + "18" }]}>
            <Feather name={icon} size={17} color={color} />
          </View>
          <Text style={[styles.toolLabel, { color: colors.foreground }]}>{label}</Text>
          <Text style={[styles.toolDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
      </ScalePress>
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
    Animated.stagger(100, [
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

  const fadeUp = (anim: Animated.Value, offset = 20) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
  });

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0D1322" : colors.background }]}>
      {/* Ambient glow blobs */}
      {isDark && (
        <>
          <View style={styles.glowTopRight} pointerEvents="none" />
          <View style={styles.glowBottomLeft} pointerEvents="none" />
        </>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { paddingTop: topPad + 16 }, fadeUp(heroAnim, 24)]}>
          <View>
            <Text style={[styles.appLabel, { color: isDark ? SKY : colors.primary }]}>
              SPATIAL DESIGN
            </Text>
            <Text style={[styles.appName, { color: colors.foreground }]}>Griha</Text>
          </View>
          {savedCount > 0 && (
            <View style={[styles.badge, { backgroundColor: isDark ? "rgba(56,189,248,0.12)" : colors.primaryMuted, borderColor: isDark ? "rgba(56,189,248,0.25)" : colors.primary + "30" }]}>
              <Feather name="folder" size={11} color={isDark ? SKY : colors.primary} />
              <Text style={[styles.badgeText, { color: isDark ? SKY : colors.primary }]}>
                {savedCount} plan{savedCount > 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── Hero metric card ── */}
        <Animated.View style={[styles.body, fadeUp(bodyAnim, 16)]}>
          <GlassCard style={styles.heroCard}>
            <View style={styles.heroCardInner}>
              <View>
                <Text style={[styles.metricLabel, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
                  VASTU SCORE
                </Text>
                <Text style={[styles.metricValue, { color: isDark ? "#FFFFFF" : colors.foreground }]}>
                  {store.currentPlan ? "—" : "—"}
                  <Text style={[styles.metricUnit, { color: isDark ? SKY + "80" : colors.primary + "80" }]}>/100</Text>
                </Text>
              </View>
              <ScalePress onPress={handleStart} scale={0.96}>
                <LinearGradient
                  colors={isDark ? [SKY, "#0284C7"] : [colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.ctaBtn}
                >
                  <Feather name={hasCurrent ? "play" : "edit-3"} size={16} color={isDark ? "#00354A" : "#fff"} />
                  <Text style={[styles.ctaBtnText, { color: isDark ? "#00354A" : "#fff" }]}>
                    {hasCurrent ? "Continue" : "Start Design"}
                  </Text>
                </LinearGradient>
              </ScalePress>
            </View>

            {/* Mini graph decoration */}
            <View style={styles.graphRow}>
              {[40, 55, 45, 70, 60, 80, 75, 90].map((h, i) => (
                <View key={i} style={[
                  styles.graphBar,
                  {
                    height: h * 0.5,
                    backgroundColor: i === 7
                      ? (isDark ? SKY : colors.primary)
                      : (isDark ? "rgba(56,189,248,0.2)" : colors.primary + "20"),
                  },
                ]} />
              ))}
            </View>
          </GlassCard>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            {[
              { value: savedCount.toString(), label: "Plans", color: isDark ? SKY : colors.primary },
              { value: "6",  label: "Room Types", color: isDark ? INDIGO : colors.accent },
              { value: "3",  label: "Cost Tiers",  color: isDark ? "#34D399" : colors.success },
            ].map((s, i) => (
              <GlassCard key={s.label} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
                  {s.label}
                </Text>
              </GlassCard>
            ))}
          </View>

          {/* ── Tools grid ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
              TOOLS
            </Text>
            <View style={[styles.sectionLine, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.border }]} />
          </View>
          <View style={styles.toolsGrid}>
            {TOOLS.map((t, i) => <ToolCard key={t.label} {...t} index={i} />)}
          </View>

          {/* ── AI tip card ── */}
          <GlassCard style={styles.tipCard}>
            <View style={styles.tipInner}>
              <View style={[styles.tipIcon, { backgroundColor: isDark ? "rgba(56,189,248,0.12)" : colors.primaryMuted }]}>
                <Feather name="cpu" size={14} color={isDark ? SKY : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: isDark ? SKY : colors.primary }]}>Griha AI</Text>
                <Text style={[styles.tipText, { color: isDark ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                  Open the Designer and tap <Text style={{ fontWeight: "700", color: isDark ? SKY : colors.primary }}>AI</Text> in the bottom bar to chat with your Vastu consultant.
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Ambient glow blobs
  glowTopRight: {
    position: "absolute", top: -80, right: -80,
    width: SW * 0.7, height: SW * 0.7,
    borderRadius: SW * 0.35,
    backgroundColor: "#38BDF8",
    opacity: 0.05,
  },
  glowBottomLeft: {
    position: "absolute", bottom: -80, left: -80,
    width: SW * 0.6, height: SW * 0.6,
    borderRadius: SW * 0.3,
    backgroundColor: "#818CF8",
    opacity: 0.05,
  },

  header: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 8,
  },
  appLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  appName: { fontSize: 32, fontWeight: "800", letterSpacing: -1, lineHeight: 36 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  body: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },

  heroCard: { padding: 20 },
  heroCardInner: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  metricLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 4 },
  metricValue: { fontSize: 40, fontWeight: "800", letterSpacing: -2, lineHeight: 44 },
  metricUnit: { fontSize: 20, fontWeight: "600" },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    shadowColor: "#38BDF8", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaBtnText: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  graphRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 32 },
  graphBar: { flex: 1, borderRadius: 3, minHeight: 4 },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, padding: 14, alignItems: "center", gap: 3 },
  statValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8 },
  statLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },

  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    padding: 14, borderRadius: 18, borderWidth: 1, gap: 7,
    overflow: "hidden",
  },
  toolAccent: { position: "absolute", left: 0, top: 12, bottom: 12, width: 2, borderRadius: 1 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toolLabel: { fontSize: 13, fontWeight: "700", letterSpacing: -0.2, paddingLeft: 6 },
  toolDesc: { fontSize: 11, lineHeight: 16, paddingLeft: 6 },

  tipCard: { padding: 14 },
  tipInner: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
  tipTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.2, marginBottom: 3 },
  tipText: { fontSize: 13, lineHeight: 18 },
});
