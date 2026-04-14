import React, { useEffect } from "react";
import { View, Text, FlatList, StyleSheet, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Plan } from "@/lib/store";
import { analyzeVastu, getVastuScoreColor } from "@/lib/vastu-engine";
import { formatCost, calculateCostEstimate } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

const ROOM_TYPE_COLORS: Record<string, string> = {
  bedroom: "#4F46E5",
  kitchen: "#F97316",
  bathroom: "#0EA5E9",
  living_room: "#7C3AED",
  office: "#059669",
  dining_room: "#EC4899",
};

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useDesignerStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { store.loadSavedPlans(); }, []);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Delete "${plan.name}"?`, "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await store.deletePlan(plan.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const renderPlan = ({ item, index }: { item: Plan; index: number }) => {
    const vastuScore = item.rooms.length > 0 ? analyzeVastu(item).score : null;
    const costEst = item.rooms.length > 0 ? calculateCostEstimate(item, item.costTier) : null;
    const scoreColor = vastuScore !== null ? getVastuScoreColor(vastuScore) : colors.muted;
    const updatedDate = new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    return (
      <ScalePress
        onPress={() => handleOpenPlan(item)}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        scale={0.98}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="layout" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {item.rooms.length} room{item.rooms.length !== 1 ? "s" : ""} · {item.totalArea} sqft · {updatedDate}
            </Text>
          </View>
          <ScalePress
            onPress={() => handleDelete(item)}
            style={styles.deleteBtn}
            hitSlop={12}
            scale={0.9}
          >
            <Feather name="trash-2" size={15} color={colors.muted} />
          </ScalePress>
        </View>

        {/* Stats chips */}
        {(vastuScore !== null || costEst) && (
          <View style={styles.chipsRow}>
            {vastuScore !== null && (
              <View style={[styles.chip, { backgroundColor: scoreColor + "15", borderColor: scoreColor + "35" }]}>
                <Feather name="compass" size={10} color={scoreColor} />
                <Text style={[styles.chipText, { color: scoreColor }]}>Vastu {vastuScore}</Text>
              </View>
            )}
            {costEst && (
              <View style={[styles.chip, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "30" }]}>
                <Feather name="trending-up" size={10} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]}>{formatCost(costEst.totalCost)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Room pills */}
        {item.rooms.length > 0 && (
          <View style={styles.pillsRow}>
            {item.rooms.slice(0, 6).map((room) => {
              const c = ROOM_TYPE_COLORS[room.type] || colors.primary;
              return (
                <View key={room.id} style={[styles.pill, { backgroundColor: c + "18" }]}>
                  <View style={[styles.pillDot, { backgroundColor: c }]} />
                  <Text style={[styles.pillText, { color: c }]}>{room.type.replace("_", " ")}</Text>
                </View>
              );
            })}
            {item.rooms.length > 6 && (
              <View style={[styles.pill, { backgroundColor: colors.mutedBg }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>+{item.rooms.length - 6}</Text>
              </View>
            )}
          </View>
        )}

        {/* Arrow */}
        <Feather name="chevron-right" size={16} color={colors.muted} style={styles.cardArrow} />
      </ScalePress>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Plans</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {store.savedPlans.length} saved plan{store.savedPlans.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <ScalePress
          onPress={handleNewPlan}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New Plan</Text>
        </ScalePress>
      </View>

      {store.savedPlans.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="layout" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved plans yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Create a floor plan in the Designer and save it to see it here.
          </Text>
          <ScalePress
            onPress={handleNewPlan}
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Create First Plan</Text>
          </ScalePress>
        </View>
      ) : (
        <FlatList
          data={store.savedPlans}
          renderItem={renderPlan}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },

  newBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  newBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  list: { padding: 16, gap: 10 },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  cardArrow: { position: "absolute", right: 16, top: "50%" as any },
  deleteBtn: { padding: 4 },

  chipsRow: { flexDirection: "row", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "600" },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", letterSpacing: -0.3 },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4,
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
