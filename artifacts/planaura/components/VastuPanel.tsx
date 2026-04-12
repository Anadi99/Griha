import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { analyzeVastu, getVastuScoreColor, getVastuScoreStatus } from "@/lib/vastu-engine";

export function VastuPanel() {
  const colors = useColors();
  const store = useDesignerStore();

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
        <MaterialCommunityIcons name="compass-outline" size={40} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Add rooms to analyze</Text>
        <Text style={[styles.emptyText, { color: colors.muted }]}>Vastu analysis will appear here once you add rooms to your floor plan</Text>
      </View>
    );
  }

  const analysis = analyzeVastu(store.currentPlan);
  const scoreColor = getVastuScoreColor(analysis.score);
  const scoreStatus = getVastuScoreStatus(analysis.score);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.card }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.scoreSection}>
        <View style={[styles.scoreCircleOuter, { borderColor: scoreColor + "33" }]}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor, backgroundColor: scoreColor + "15" }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{analysis.score}</Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>/100</Text>
          </View>
        </View>
        <Text style={[styles.scoreStatus, { color: scoreColor }]}>{scoreStatus}</Text>
        <Text style={[styles.scoreSubtitle, { color: colors.muted }]}>Vastu Energy Score</Text>
      </View>

      {analysis.positives.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Good Placements</Text>
          {analysis.positives.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
              <Feather name="check-circle" size={14} color="#10B981" />
              <Text style={[styles.itemText, { color: colors.foreground }]}>{item.message}</Text>
            </View>
          ))}
        </View>
      )}

      {analysis.issues.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Issues ({analysis.issues.length})</Text>
          {analysis.issues.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemText, { color: colors.foreground }]}>{item.message}</Text>
                <Text style={[styles.itemMeta, { color: "#EF4444" }]}>Severity: {item.severity}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {analysis.suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suggestions</Text>
          {analysis.suggestions.map((item) => (
            <View key={item.id} style={[styles.item, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={14} color="#F59E0B" />
              <Text style={[styles.itemText, { color: colors.foreground }]}>{item.message}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  scoreSection: { alignItems: "center", marginBottom: 24 },
  scoreCircleOuter: { width: 130, height: 130, borderRadius: 65, borderWidth: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  scoreCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreNumber: { fontSize: 36, fontWeight: "800" },
  scoreLabel: { fontSize: 12, fontWeight: "600", marginTop: -4 },
  scoreStatus: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  scoreSubtitle: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 18 },
  itemMeta: { fontSize: 11, marginTop: 3, textTransform: "capitalize" },
});
