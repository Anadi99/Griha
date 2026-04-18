import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Animated } from "react-native";import { Feather } from "@expo/vector-icons";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { calculateCostEstimate, formatCost, getCostTierLabel, getCostTierDescription } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

const TIERS: Array<"basic" | "standard" | "premium"> = ["basic", "standard", "premium"];

const TIER_META: Record<string, { icon: string; color: string }> = {
  basic:    { icon: "home", color: "#737373" },
  standard: { icon: "home", color: "#E02020" },
  premium:  { icon: "star", color: "#D97706" },
};

const BREAKDOWN_CONFIG = [
  { key: "structure",  label: "Structure",  pct: 50, icon: "layers"  as const },
  { key: "interiors",  label: "Interiors",  pct: 20, icon: "grid"    as const },
  { key: "electrical", label: "Electrical", pct: 15, icon: "zap"     as const },
  { key: "plumbing",   label: "Plumbing",   pct: 15, icon: "droplet" as const },
];
const BREAKDOWN_COLORS = ["#E02020", "#7C3AED", "#D97706", "#0284C7"];

/* ── Animated progress bar ─────────────────────────── */
function AnimBar({ pct, color, value }: { pct: number; color: string; value: number }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(0);

  useEffect(() => {
    if (prevValue.current !== value) {
      Animated.timing(anim, { toValue: pct, duration: 500, useNativeDriver: false }).start();
      prevValue.current = value;
    } else {
      anim.setValue(pct);
    }
  }, [value]);

  return (
    <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
      <Animated.View
        style={[styles.barFill, {
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
        }]}
      />
    </View>
  );
}

/* ── Animated cost number ──────────────────────────── */
function AnimCost({ value, color, style }: { value: number; color: string; style?: any }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const startTime = performance.now();
    const duration = 400;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <Text style={[style, { color }]}>{formatCost(display)}</Text>;
}

/* ── Main panel ────────────────────────────────────── */
export function CostPanel() {
  const colors = useColors();
  const store = useDesignerStore();
  const [tier, setTier] = useState<"basic" | "standard" | "premium">("standard");
  const flashAnim = useRef(new Animated.Value(1)).current;
  const prevTotal = useRef(0);

  const hasRooms = store.currentPlan && store.currentPlan.rooms.length > 0;

  useEffect(() => {
    if (!hasRooms) return;
    const est = calculateCostEstimate(store.currentPlan!, tier);
    if (prevTotal.current !== 0 && prevTotal.current !== est.totalCost) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
        Animated.spring(flashAnim, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
      ]).start();
    }
    prevTotal.current = est.totalCost;
  }, [store.currentPlan?.rooms.length, store.currentPlan?.totalArea, tier]);

  if (!hasRooms) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.successMuted }]}>
          <Feather name="trending-up" size={32} color={colors.success} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Add rooms first</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Cost estimation updates in real-time as you design.
        </Text>
      </View>
    );
  }

  const est = calculateCostEstimate(store.currentPlan!, tier);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Tier tabs */}
      <View style={[styles.tierBar, { backgroundColor: colors.mutedBg }]}>
        {TIERS.map((t) => {
          const isActive = tier === t;
          const meta = TIER_META[t];
          return (
            <ScalePress key={t} onPress={() => setTier(t)}
              style={[styles.tierBtn, isActive && [styles.tierBtnActive, { backgroundColor: colors.card }]]}
              scale={0.94}>
              <Feather name={meta.icon as any} size={14} color={isActive ? meta.color : colors.muted} />
              <Text style={[styles.tierLabel, { color: isActive ? colors.foreground : colors.muted }]}>
                {getCostTierLabel(t)}
              </Text>
            </ScalePress>
          );
        })}
      </View>
      <Text style={[styles.tierDesc, { color: colors.mutedForeground }]}>{getCostTierDescription(tier)}</Text>

      {/* Total cost card */}
      <Animated.View style={[styles.totalCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "28", transform: [{ scale: flashAnim }] }]}>
        <View style={[styles.liveChip, { backgroundColor: colors.primary }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Estimated Cost</Text>
        <AnimCost value={est.totalCost} color={colors.primary} style={styles.totalValue} />
        <View style={styles.totalMeta}>
          <View style={[styles.metaChip, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="maximize-2" size={10} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>{est.totalArea} sqft</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.metaText, { color: colors.primary }]}>₹{est.ratePerSqft.toLocaleString("en-IN")}/sqft</Text>
          </View>
        </View>
      </Animated.View>

      {/* Breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cost Breakdown</Text>
      {BREAKDOWN_CONFIG.map((item, i) => {
        const val = (est.breakdown as any)[item.key] ?? 0;
        const color = BREAKDOWN_COLORS[i];
        return (
          <View key={item.key} style={[styles.bCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.bHead}>
              <View style={[styles.bIcon, { backgroundColor: color + "18" }]}>
                <Feather name={item.icon} size={14} color={color} />
              </View>
              <Text style={[styles.bLabel, { color: colors.foreground }]}>{item.label}</Text>
              <AnimCost value={val} color={color} style={styles.bValue} />
              <Text style={[styles.bPct, { color: color }]}>{item.pct}%</Text>
            </View>
            <AnimBar pct={item.pct} color={color} value={val} />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 10 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  tierBar: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tierBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  tierBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tierLabel: { fontSize: 12, fontWeight: "600" },
  tierDesc: { fontSize: 12, textAlign: "center", marginTop: -2 },

  totalCard: { borderRadius: 18, borderWidth: 1, alignItems: "center", paddingVertical: 18, paddingHorizontal: 16, gap: 6 },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  totalLabel: { fontSize: 12, fontWeight: "500" },
  totalValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  totalMeta: { flexDirection: "row", gap: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 12, fontWeight: "600" },

  sectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },

  bCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  bHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  bIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  bValue: { fontSize: 13, fontWeight: "700" },
  bPct: { fontSize: 12, fontWeight: "700", minWidth: 34, textAlign: "right" },

  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
});
