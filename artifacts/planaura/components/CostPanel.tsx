import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { calculateCostEstimate, formatCost, getCostTierLabel, getCostTierDescription } from "@/lib/cost-calculator";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const TIERS: Array<"basic" | "standard" | "premium"> = ["basic", "standard", "premium"];
const TIER_ICONS: Record<string, string> = {
  basic: "home-outline",
  standard: "home",
  premium: "home-city",
};

export function CostPanel() {
  const colors = useColors();
  const store = useDesignerStore();
  const [selectedTier, setSelectedTier] = useState<"basic" | "standard" | "premium">("standard");

  if (!store.currentPlan) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>No plan loaded</Text>
      </View>
    );
  }

  if (store.currentPlan.rooms.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="currency-inr" size={40} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Add rooms first</Text>
        <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Cost estimation will appear once you add rooms</Text>
      </View>
    );
  }

  const estimate = calculateCostEstimate(store.currentPlan, selectedTier);

  const breakdownItems = [
    { label: "Structure", value: estimate.breakdown.structure, pct: 50, color: colors.primary },
    { label: "Interiors", value: estimate.breakdown.interiors, pct: 20, color: colors.accent },
    { label: "Electrical", value: estimate.breakdown.electrical, pct: 15, color: "#F59E0B" },
    { label: "Plumbing", value: estimate.breakdown.plumbing, pct: 15, color: "#10B981" },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.card }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.tierRow}>
        {TIERS.map((tier) => {
          const isActive = selectedTier === tier;
          return (
            <Pressable
              key={tier}
              onPress={() => setSelectedTier(tier)}
              style={({ pressed }) => [
                styles.tierBtn,
                {
                  backgroundColor: isActive ? colors.primary : colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={TIER_ICONS[tier] as any}
                size={16}
                color={isActive ? colors.primaryForeground : colors.muted}
              />
              <Text style={[styles.tierLabel, { color: isActive ? colors.primaryForeground : colors.muted }]}>
                {getCostTierLabel(tier)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.tierDesc, { color: colors.muted }]}>{getCostTierDescription(selectedTier)}</Text>

      <View style={[styles.totalCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
        <Text style={[styles.totalLabel, { color: colors.muted }]}>Total Estimated Cost</Text>
        <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCost(estimate.totalCost)}</Text>
        <View style={styles.areaRow}>
          <Text style={[styles.areaMeta, { color: colors.muted }]}>{estimate.totalArea} sqft</Text>
          <Text style={[styles.areaMeta, { color: colors.muted }]}>·</Text>
          <Text style={[styles.areaMeta, { color: colors.muted }]}>₹{estimate.ratePerSqft.toLocaleString("en-IN")}/sqft</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cost Breakdown</Text>
      {breakdownItems.map((item) => (
        <View key={item.label} style={styles.breakdownRow}>
          <View style={styles.breakdownInfo}>
            <Text style={[styles.breakdownLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{formatCost(item.value)}</Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
          </View>
          <Text style={[styles.pctLabel, { color: colors.muted }]}>{item.pct}%</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
  emptyText: { fontSize: 14 },
  tierRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tierBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  tierLabel: { fontSize: 12, fontWeight: "700" },
  tierDesc: { fontSize: 12, marginBottom: 16, textAlign: "center" },
  totalCard: { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: "center", marginBottom: 24 },
  totalLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  totalValue: { fontSize: 32, fontWeight: "800", marginBottom: 6 },
  areaRow: { flexDirection: "row", gap: 8 },
  areaMeta: { fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 14 },
  breakdownRow: { marginBottom: 14 },
  breakdownInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  breakdownLabel: { fontSize: 13 },
  breakdownValue: { fontSize: 13, fontWeight: "600" },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 4 },
  pctLabel: { fontSize: 11, textAlign: "right" },
});
