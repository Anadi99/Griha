import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Plan } from "@/lib/store";
import { analyzeVastu } from "@/lib/vastu-engine";
import { formatCost, calculateCostEstimate } from "@/lib/cost-calculator";

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useDesignerStore();
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    store.loadSavedPlans();
  }, []);

  const handleOpenPlan = (plan: Plan) => {
    store.loadPlan(plan);
    Haptics.selectionAsync();
    router.push("/(tabs)/designer");
  };

  const handleNewPlan = () => {
    store.createNewPlan("New Floor Plan");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/designer");
  };

  const handleDelete = (plan: Plan) => {
    Alert.alert("Delete Plan", `Are you sure you want to delete "${plan.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await store.deletePlan(plan.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const renderPlan = ({ item }: { item: Plan }) => {
    const vastuScore = item.rooms.length > 0 ? analyzeVastu(item).score : 0;
    const costEst = item.rooms.length > 0 ? calculateCostEstimate(item, item.costTier) : null;
    const scoreColor = vastuScore >= 80 ? "#10B981" : vastuScore >= 50 ? "#F59E0B" : "#EF4444";

    return (
      <Pressable
        onPress={() => handleOpenPlan(item)}
        style={({ pressed }) => [styles.planCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={styles.planCardTop}>
          <View style={[styles.planIcon, { backgroundColor: colors.primary + "18" }]}>
            <MaterialCommunityIcons name="floor-plan" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.planMeta, { color: colors.muted }]}>
              {item.rooms.length} room{item.rooms.length !== 1 ? "s" : ""} · {item.totalArea} sqft
            </Text>
          </View>
          <Pressable onPress={() => handleDelete(item)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Feather name="trash-2" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {item.rooms.length > 0 && (
          <View style={styles.planCardStats}>
            <View style={[styles.statChip, { backgroundColor: scoreColor + "15", borderColor: scoreColor + "40" }]}>
              <Text style={[styles.statChipText, { color: scoreColor }]}>Vastu {vastuScore}</Text>
            </View>
            {costEst && (
              <View style={[styles.statChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                <Text style={[styles.statChipText, { color: colors.primary }]}>{formatCost(costEst.totalCost)}</Text>
              </View>
            )}
            <View style={[styles.statChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.statChipText, { color: colors.muted }]}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
            </View>
          </View>
        )}

        <View style={styles.roomPillRow}>
          {item.rooms.slice(0, 5).map((room) => {
            const c = (colors as any)[room.type] || colors.primary;
            return (
              <View key={room.id} style={[styles.roomPill, { backgroundColor: c + "20", borderColor: c + "40" }]}>
                <Text style={[styles.roomPillText, { color: c }]}>{room.type.replace("_", " ")}</Text>
              </View>
            );
          })}
          {item.rooms.length > 5 && (
            <View style={[styles.roomPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.roomPillText, { color: colors.muted }]}>+{item.rooms.length - 5}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Plans</Text>
        <Pressable
          onPress={handleNewPlan}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {store.savedPlans.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="floor-plan" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved plans yet</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>Create a floor plan and save it here for future reference</Text>
          <Pressable
            onPress={handleNewPlan}
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Create First Plan</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={store.savedPlans}
          renderItem={renderPlan}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  newBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  planCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  planCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  planIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  planName: { fontSize: 16, fontWeight: "700" },
  planMeta: { fontSize: 12, marginTop: 2 },
  planCardStats: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statChipText: { fontSize: 12, fontWeight: "600" },
  roomPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roomPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  roomPillText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
});
