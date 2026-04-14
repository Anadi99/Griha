import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { calculateCostEstimate, formatCost, getCostTierLabel, getCostTierDescription } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

const TIERS: Array<"basic" | "standard" | "premium"> = ["basic", "standard", "premium"];

const TIER_META: Record<string, { icon: string; color: string }> = {
  basic: { icon: "home", color: "#64748B" },
  standard: { icon: "home", color: "#4F46E5" },
  premium: { icon: "star", color: "#F59E0B" },
};

export function CostPanel() {
  const colors = useColors();
  const store = useDesignerStore();
  const [tier, setTier] = useState<"basic" | "standard" | "premium">("standard");

  if (!store.currentPlan || store.currentPlan.rooms.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.successMuted }]}>
          <Feather name="trending-up" size={32} color={colors.success} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Add rooms first</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Cost estimation will appear once you add rooms.</Text>
      </View>
    );
  }

  const est = calculateCostEstimate(store.currentPlan, tier);

  const breakdown = [
    { label: "Structure", value: est.breakdown.structure, pct: 50, color: colors.primary },
    { label: "Interiors", value: est.breakdown.interiors, pct: 20, color: colors.accent },
    { label: "Electrical", value: est.breakdown.electrical, pct: 15, color: "#F59E0B" },
    { label: "Plumbing", value: est.breakdown.plumbing, pct: 15, color: "#0EA5E9" },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Tier selector */}
      <View style={[styles.tierSelector, { backgroundColor: colors.mutedBg }]}>
        {TIERS.map((t) => {
          const isActive = tier === t;
          const meta = TIER_META[t];
          return (
            <ScalePress
              key={t}
              onPress={() => setTier(t)}
              style={[styles.tierBtn, isActive && [styles.tierBtnActive, { backgroundColor: colors.card }]]}
              scale={0.95}
            >
              <Feather name={meta.icon as any} size={14} color={isActive ? meta.color : colors.muted} />
              <Text style={[styles.tierBtnText, { color: isActive ? colors.foreground : colors.muted }]}>
                {getCostTierLabel(t)}
              </Text>
            </ScalePress>
          );
        })}
      </View>
      <Text style={[styles.tierDesc, { color: colors.mutedForeground }]}>{getCostTierDescription(tier)}</Text>

      {/* Total card */}
      <View style={[styles.totalCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "30" }]}>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Estimated Cost</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCost(est.totalCost)}</Text>
        <View style={styles.totalMeta}>
          <View style={[styles.metaChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.metaChipText, { color: colors.primary }]}>{est.totalArea} sqft</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.metaChipText, { color: colors.primary }]}>₹{est.ratePerSqft.toLocaleString("en-IN")}/sqft</Text>
          </View>
        </View>
      </View>

      {/* Breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cost Breakdown</Text>
      <View style={styles.breakdownList}>
        {breakdown.map((item) => (
          <View key={item.label} style={[styles.bRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.bDot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.bTopRow}>
                <Text style={[styles.bLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.bValue, { color: colors.foreground }]}>{formatCost(item.value)}</Text>
              </View>
              <View style={[styles.bTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.bFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
              </View>
            </View>
            <Text style={[styles.bPct, { color: item.color }]}>{item.pct}%</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 12 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  tierSelector: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tierBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  tierBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tierBtnText: { fontSize: 13, fontWeight: "600" },

  tierDesc: { fontSize: 12, textAlign: "center", marginTop: -4 },

  totalCard: { borderRadius: 16, padding: 18, borderWidth: 1, alignItems: "center", gap: 6 },
  totalLabel: { fontSize: 12, fontWeight: "500" },
  totalValue: { fontSize: 34, fontWeight: "800", letterSpacing: -1 },
  totalMeta: { flexDirection: "row", gap: 8 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaChipText: { fontSize: 12, fontWeight: "600" },

  sectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },

  breakdownList: { gap: 8 },
  bRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  bDot: { width: 8, height: 8, borderRadius: 4 },
  bTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  bLabel: { fontSize: 13, fontWeight: "600" },
  bValue: { fontSize: 13, fontWeight: "600" },
  bTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  bFill: { height: "100%", borderRadius: 3 },
  bPct: { fontSize: 12, fontWeight: "700", minWidth: 32, textAlign: "right" },
});
