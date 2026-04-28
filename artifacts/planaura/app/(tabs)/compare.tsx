import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Animated, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Plan } from "@/lib/store";
import { analyzeVastu } from "@/lib/vastu-engine";
import { calculateCostEstimate, formatCost } from "@/lib/cost-calculator";
import { analyzeSunlight } from "@/lib/sunlight-engine";
import { analyzeVentilation } from "@/lib/ventilation-engine";
import { ScalePress } from "@/components/ScalePress";

interface PlanMetrics { plan: Plan; vastu: number; cost: number; sunlight: number; ventilation: number; area: number; }

function getMetrics(plan: Plan): PlanMetrics {
  return {
    plan,
    vastu: analyzeVastu(plan).score,
    cost: calculateCostEstimate(plan, plan.costTier).totalCost,
    sunlight: analyzeSunlight(plan.rooms, plan.openings ?? [], 10).overallScore,
    ventilation: analyzeVentilation(plan.rooms, plan.openings ?? []).overallScore,
    area: plan.totalArea,
  };
}

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: value / 100, tension: 80, friction: 12, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={styles.scoreBarRow}>
      <Text style={[styles.scoreBarLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.scoreBarTrack, { backgroundColor: colors.mutedBg }]}>
        <Animated.View style={[styles.scoreBarFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Text style={[styles.scoreBarValue, { color }]}>{value}</Text>
    </View>
  );
}

function MetricRow({ label, aVal, bVal, unit, lowerIsBetter, icon }: { label: string; aVal: number; bVal: number; unit: string; lowerIsBetter?: boolean; icon: string }) {
  const colors = useColors();
  const aWins = lowerIsBetter ? aVal < bVal : aVal > bVal;
  const bWins = lowerIsBetter ? bVal < aVal : bVal > aVal;
  const tie = aVal === bVal;
  return (
    <View style={[styles.metricRow, { borderBottomColor: colors.border }]}>
      <Feather name={icon as any} size={13} color={colors.mutedForeground} style={{ width: 20 }} />
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.metricVal, aWins && !tie && { backgroundColor: "#16A34A18" }]}>
        <Text style={[styles.metricValText, { color: aWins && !tie ? "#16A34A" : colors.foreground }]}>
          {unit === "₹" ? formatCost(aVal) : `${aVal}${unit}`}
        </Text>
        {aWins && !tie && <Feather name="chevron-up" size={11} color="#16A34A" />}
      </View>
      <View style={[styles.metricVal, bWins && !tie && { backgroundColor: "#16A34A18" }]}>
        <Text style={[styles.metricValText, { color: bWins && !tie ? "#16A34A" : colors.foreground }]}>
          {unit === "₹" ? formatCost(bVal) : `${bVal}${unit}`}
        </Text>
        {bWins && !tie && <Feather name="chevron-up" size={11} color="#16A34A" />}
      </View>
    </View>
  );
}

export default function CompareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const store = useDesignerStore();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [planA, setPlanA] = useState<Plan | null>(null);
  const [planB, setPlanB] = useState<Plan | null>(null);
  const [picking, setPicking] = useState<"A" | "B" | null>(null);

  useEffect(() => { store.loadSavedPlans(); }, []);

  const mA = planA ? getMetrics(planA) : null;
  const mB = planB ? getMetrics(planB) : null;

  const winner = mA && mB ? (() => {
    const as = mA.vastu + mA.sunlight + mA.ventilation - mA.cost / 100000;
    const bs = mB.vastu + mB.sunlight + mB.ventilation - mB.cost / 100000;
    return as > bs ? "A" : bs > as ? "B" : "tie";
  })() : null;

  const PlanSlot = ({ slot }: { slot: "A" | "B" }) => {
    const sel = slot === "A" ? planA : planB;
    return (
      <ScalePress onPress={() => setPicking(slot)} scale={0.97}
        style={[styles.planSlot, { backgroundColor: sel ? colors.card : colors.mutedBg, borderColor: sel ? colors.primary : colors.border, borderStyle: sel ? "solid" : "dashed" }]}>
        {sel ? (
          <View style={styles.planSlotFilled}>
            <View style={[styles.planSlotIcon, { backgroundColor: colors.primaryMuted }]}><Feather name="layout" size={16} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planSlotName, { color: colors.foreground }]} numberOfLines={1}>{sel.name}</Text>
              <Text style={[styles.planSlotMeta, { color: colors.mutedForeground }]}>{sel.rooms.length} rooms · {sel.totalArea} sqft</Text>
            </View>
            <View style={[styles.slotBadge, { backgroundColor: colors.primary }]}><Text style={styles.slotBadgeText}>Plan {slot}</Text></View>
          </View>
        ) : (
          <View style={styles.planSlotEmpty}>
            <Feather name="plus-circle" size={20} color={colors.muted} />
            <Text style={[styles.planSlotEmptyText, { color: colors.muted }]}>Select Plan {slot}</Text>
          </View>
        )}
      </ScalePress>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }, isIOS ? {} : { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {isIOS && <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Compare</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Side-by-side plan analysis</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.slotsRow}>
          <View style={{ flex: 1 }}><PlanSlot slot="A" /></View>
          <View style={[styles.vsCircle, { backgroundColor: colors.primary }]}><Text style={styles.vsText}>VS</Text></View>
          <View style={{ flex: 1 }}><PlanSlot slot="B" /></View>
        </View>

        {picking && (
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Plan {picking}</Text>
              <ScalePress onPress={() => setPicking(null)} scale={0.9}><Feather name="x" size={18} color={colors.muted} /></ScalePress>
            </View>
            {store.savedPlans.length === 0 ? (
              <Text style={[styles.noPlans, { color: colors.mutedForeground }]}>No saved plans yet. Save plans from the Designer first.</Text>
            ) : store.savedPlans.map((p) => (
              <ScalePress key={p.id} onPress={() => { if (picking === "A") setPlanA(p); else setPlanB(p); setPicking(null); Haptics.selectionAsync(); }}
                style={[styles.pickerItem, { borderBottomColor: colors.border }]} scale={0.98}>
                <Feather name="layout" size={15} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemName, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.pickerItemMeta, { color: colors.mutedForeground }]}>{p.rooms.length} rooms · {p.totalArea} sqft</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.muted} />
              </ScalePress>
            ))}
          </View>
        )}

        {mA && mB && (
          <>
            {winner !== "tie" && (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.winnerBanner}>
                <Feather name="award" size={18} color="#fff" />
                <Text style={styles.winnerText}>Plan {winner} is recommended — better overall score</Text>
              </LinearGradient>
            )}

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Score Overview</Text>
              <View style={styles.scoreBarsGroup}>
                <Text style={[styles.scoreBarsLabel, { color: colors.primary }]}>Plan A — {mA.plan.name}</Text>
                <ScoreBar value={mA.vastu} color="#38BDF8" label="Vastu" />
                <ScoreBar value={mA.sunlight} color="#D97706" label="Sunlight" />
                <ScoreBar value={mA.ventilation} color="#38BDF8" label="Airflow" />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreBarsGroup}>
                <Text style={[styles.scoreBarsLabel, { color: "#6366F1" }]}>Plan B — {mB.plan.name}</Text>
                <ScoreBar value={mB.vastu} color="#38BDF8" label="Vastu" />
                <ScoreBar value={mB.sunlight} color="#D97706" label="Sunlight" />
                <ScoreBar value={mB.ventilation} color="#38BDF8" label="Airflow" />
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.tableHeader}>
                <View style={{ flex: 2 }} />
                <Text style={[styles.tableCol, { color: colors.primary }]}>Plan A</Text>
                <Text style={[styles.tableCol, { color: "#6366F1" }]}>Plan B</Text>
              </View>
              <MetricRow label="Vastu Score" icon="compass" aVal={mA.vastu} bVal={mB.vastu} unit="/100" />
              <MetricRow label="Sunlight" icon="sun" aVal={mA.sunlight} bVal={mB.sunlight} unit="/100" />
              <MetricRow label="Airflow" icon="wind" aVal={mA.ventilation} bVal={mB.ventilation} unit="/100" />
              <MetricRow label="Total Area" icon="maximize-2" aVal={mA.area} bVal={mB.area} unit=" sqft" />
              <MetricRow label="Est. Cost" icon="trending-up" aVal={mA.cost} bVal={mB.cost} unit="₹" lowerIsBetter />
            </View>
          </>
        )}

        {!mA && !mB && (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bar-chart-2" size={36} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Select two plans to compare</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Save at least 2 plans from the Designer, then select them above.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1},header:{overflow:"hidden"},headerInner:{paddingHorizontal:20,paddingBottom:14},headerTitle:{fontSize:28,fontWeight:"800",letterSpacing:-0.6},headerSub:{fontSize:13,marginTop:2},content:{padding:16,gap:14},
  slotsRow:{flexDirection:"row",alignItems:"center",gap:8},planSlot:{flex:1,borderRadius:16,borderWidth:1.5,padding:12,minHeight:72,justifyContent:"center"},planSlotFilled:{flexDirection:"row",alignItems:"center",gap:10},planSlotIcon:{width:36,height:36,borderRadius:10,alignItems:"center",justifyContent:"center"},planSlotName:{fontSize:13,fontWeight:"700"},planSlotMeta:{fontSize:11,marginTop:2},slotBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:8},slotBadgeText:{color:"#fff",fontSize:10,fontWeight:"800"},planSlotEmpty:{alignItems:"center",gap:6},planSlotEmptyText:{fontSize:12,fontWeight:"600"},vsCircle:{width:32,height:32,borderRadius:16,alignItems:"center",justifyContent:"center"},vsText:{color:"#fff",fontSize:11,fontWeight:"900"},
  pickerCard:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,overflow:"hidden"},pickerHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:14,paddingBottom:10},pickerTitle:{fontSize:15,fontWeight:"700"},noPlans:{padding:16,fontSize:13,textAlign:"center"},pickerItem:{flexDirection:"row",alignItems:"center",gap:10,padding:14,borderBottomWidth:StyleSheet.hairlineWidth},pickerItemName:{fontSize:14,fontWeight:"600"},pickerItemMeta:{fontSize:12,marginTop:1},
  winnerBanner:{flexDirection:"row",alignItems:"center",gap:10,padding:14,borderRadius:16},winnerText:{flex:1,color:"#fff",fontSize:14,fontWeight:"700"},
  section:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:16,gap:12},sectionTitle:{fontSize:15,fontWeight:"800",letterSpacing:-0.3},scoreBarsGroup:{gap:8},scoreBarsLabel:{fontSize:12,fontWeight:"700"},scoreBarRow:{flexDirection:"row",alignItems:"center",gap:8},scoreBarLabel:{width:56,fontSize:11,fontWeight:"600"},scoreBarTrack:{flex:1,height:6,borderRadius:3,overflow:"hidden"},scoreBarFill:{height:"100%",borderRadius:3},scoreBarValue:{width:28,fontSize:11,fontWeight:"800",textAlign:"right"},divider:{height:StyleSheet.hairlineWidth},
  tableHeader:{flexDirection:"row",paddingBottom:8},tableCol:{flex:1,fontSize:12,fontWeight:"800",textAlign:"center"},metricRow:{flexDirection:"row",alignItems:"center",paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,gap:8},metricLabel:{flex:2,fontSize:12,fontWeight:"600"},metricVal:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:3,paddingVertical:4,borderRadius:8},metricValText:{fontSize:12,fontWeight:"700"},
  emptyState:{borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:32,alignItems:"center",gap:10},emptyTitle:{fontSize:17,fontWeight:"700",textAlign:"center"},emptySub:{fontSize:13,textAlign:"center",lineHeight:19},
});
