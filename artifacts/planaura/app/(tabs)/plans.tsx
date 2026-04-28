import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Platform,
  Alert, Animated, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Plan } from "@/lib/store";
import { analyzeVastu, getVastuScoreColor } from "@/lib/vastu-engine";
import { formatCost, calculateCostEstimate } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

const SKY = "#38BDF8";
const INDIGO = "#818CF8";

const ROOM_TYPE_COLORS: Record<string, string> = {
  bedroom: "#A5B4FC", kitchen: "#FDBA74", bathroom: "#6EE7B7",
  living_room: "#7DD3FC", office: "#C4B5FD", dining_room: "#FDE68A",
};

/* ── Deep Obsidian card with lift animation ── */
function ObsidianCard({ children, onPress, onDelete, index }: {
  children: React.ReactNode; onPress: () => void;
  onDelete: () => void; index: number;
}) {
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const borderAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 110, friction: 10,
      delay: index * 55, useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(borderAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: false }).start();
  };
  const handlePressOut = () => {
    Animated.spring(borderAnim, { toValue: 0, tension: 200, friction: 10, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.08)", "rgba(56,189,248,0.5)"],
  });

  const cardBg = isDark ? "rgba(15,23,42,0.4)" : "rgba(255,255,255,0.9)";

  return (
    <Animated.View style={{
      opacity: scaleAnim,
      transform: [
        { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        { scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
      ],
    }}>
      <ScalePress
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        scale={0.98}
      >
        <Animated.View style={[
          styles.card,
          { borderColor },
          isDark && { backgroundColor: cardBg },
          !isDark && { backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.08)" },
        ]}>
          {isDark && isIOS && (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          {/* Sky blue left accent */}
          <View style={[styles.cardAccent, { backgroundColor: SKY }]} />
          <View style={styles.cardContent}>
            {children}
          </View>
        </Animated.View>
      </ScalePress>
    </Animated.View>
  );
}

function SkeletonCard() {
  const isDark = useColorScheme() === "dark";
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });
  const bg = isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0";
  return (
    <Animated.View style={[styles.card, {
      backgroundColor: isDark ? "rgba(15,23,42,0.4)" : "#FFFFFF",
      borderColor: "rgba(255,255,255,0.08)", opacity,
    }]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: bg }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 14, width: "55%", borderRadius: 7, backgroundColor: bg }} />
          <View style={{ height: 10, width: "40%", borderRadius: 5, backgroundColor: bg }} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useDesignerStore();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const [loading, setLoading] = useState(true);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { store.loadSavedPlans().then(() => setLoading(false)); }, []);

  const handleOpenPlan = (plan: Plan) => {
    store.loadPlan(plan); Haptics.selectionAsync();
    router.push("/(tabs)/designer");
  };
  const handleNewPlan = () => {
    store.createNewPlan("New Floor Plan");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/designer");
  };
  const handleDelete = (plan: Plan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(`Delete "${plan.name}"?`, "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await store.deletePlan(plan.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0D1322" : colors.background }]}>
      {/* Ambient glow */}
      {isDark && <View style={styles.glow} pointerEvents="none" />}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        {isIOS && isDark && (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        )}
        {(!isIOS || !isDark) && (
          <View style={[StyleSheet.absoluteFill, {
            backgroundColor: isDark ? "rgba(13,19,34,0.85)" : colors.card,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : colors.border,
          }]} />
        )}
        <View style={styles.headerInner}>
          <View>
            <Text style={[styles.headerLabel, { color: isDark ? "rgba(56,189,248,0.7)" : colors.primary }]}>
              SPATIAL PLANS
            </Text>
            <Text style={[styles.headerTitle, { color: isDark ? "#FFFFFF" : colors.foreground }]}>
              My Plans
            </Text>
            <Text style={[styles.headerSub, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
              {store.savedPlans.length} saved plan{store.savedPlans.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <ScalePress onPress={handleNewPlan} scale={0.96}>
            <LinearGradient colors={[SKY, "#0284C7"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newBtn}>
              <Feather name="plus" size={16} color="#00354A" />
              <Text style={styles.newBtnText}>New Plan</Text>
            </LinearGradient>
          </ScalePress>
        </View>
      </View>

      {loading ? (
        <View style={styles.list}>{[0,1,2].map(i => <SkeletonCard key={i} />)}</View>
      ) : store.savedPlans.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, {
            backgroundColor: isDark ? "rgba(56,189,248,0.1)" : colors.primaryMuted,
            borderWidth: 1, borderColor: isDark ? "rgba(56,189,248,0.2)" : colors.primary + "30",
          }]}>
            <Feather name="layout" size={38} color={SKY} />
          </View>
          <Text style={[styles.emptyTitle, { color: isDark ? "#FFFFFF" : colors.foreground }]}>
            No saved plans yet
          </Text>
          <Text style={[styles.emptySub, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
            Create a floor plan in the Designer and save it to see it here.
          </Text>
          <ScalePress onPress={handleNewPlan} scale={0.97}>
            <LinearGradient colors={[SKY, INDIGO]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyBtn}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Create First Plan</Text>
            </LinearGradient>
          </ScalePress>
        </View>
      ) : (
        <FlatList
          data={store.savedPlans}
          renderItem={({ item, index }) => {
            const vastuScore = item.rooms.length > 0 ? analyzeVastu(item).score : null;
            const costEst = item.rooms.length > 0 ? calculateCostEstimate(item, item.costTier) : null;
            const scoreColor = vastuScore !== null ? getVastuScoreColor(vastuScore) : colors.muted;
            const updatedDate = new Date(item.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            return (
              <ObsidianCard index={index} onPress={() => handleOpenPlan(item)} onDelete={() => handleDelete(item)}>
                <View style={styles.cardTop}>
                  <View style={[styles.cardIcon, { backgroundColor: isDark ? "rgba(56,189,248,0.12)" : colors.primaryMuted }]}>
                    <Feather name="layout" size={20} color={SKY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: isDark ? "#FFFFFF" : colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cardMeta, { color: isDark ? "rgba(255,255,255,0.4)" : colors.mutedForeground }]}>
                      {item.rooms.length} rooms · {item.totalArea} sqft · {updatedDate}
                    </Text>
                  </View>
                  <ScalePress onPress={() => handleDelete(item)} style={styles.deleteBtn} scale={0.88}>
                    <Feather name="trash-2" size={15} color={isDark ? "rgba(255,255,255,0.25)" : colors.muted} />
                  </ScalePress>
                </View>
                {(vastuScore !== null || costEst) && (
                  <View style={styles.chipsRow}>
                    {vastuScore !== null && (
                      <View style={[styles.chip, { backgroundColor: scoreColor + "18", borderColor: scoreColor + "35" }]}>
                        <Feather name="compass" size={10} color={scoreColor} />
                        <Text style={[styles.chipText, { color: scoreColor }]}>Vastu {vastuScore}</Text>
                      </View>
                    )}
                    {costEst && (
                      <View style={[styles.chip, { backgroundColor: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.25)" }]}>
                        <Feather name="trending-up" size={10} color={SKY} />
                        <Text style={[styles.chipText, { color: SKY }]}>{formatCost(costEst.totalCost)}</Text>
                      </View>
                    )}
                  </View>
                )}
                {item.rooms.length > 0 && (
                  <View style={styles.pillsRow}>
                    {item.rooms.slice(0, 6).map((room) => {
                      const c = ROOM_TYPE_COLORS[room.type] || SKY;
                      return (
                        <View key={room.id} style={[styles.pill, { backgroundColor: c + "18" }]}>
                          <View style={[styles.pillDot, { backgroundColor: c }]} />
                          <Text style={[styles.pillText, { color: c }]}>{room.type.replace("_", " ")}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </ObsidianCard>
            );
          }}
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
  glow: {
    position: "absolute", top: -60, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#38BDF8", opacity: 0.04,
  },
  header: { overflow: "hidden", zIndex: 10 },
  headerInner: {
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  headerLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 2 },
  newBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    shadowColor: SKY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  newBtnText: { color: "#00354A", fontSize: 14, fontWeight: "800" },
  list: { padding: 16, gap: 10 },

  card: {
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  cardAccent: { position: "absolute", left: 0, top: 16, bottom: 16, width: 2, borderRadius: 1 },
  cardContent: { padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  cardName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  deleteBtn: { padding: 4 },
  chipsRow: { flexDirection: "row", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", letterSpacing: -0.3 },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 15, borderRadius: 16, marginTop: 4,
    shadowColor: SKY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
