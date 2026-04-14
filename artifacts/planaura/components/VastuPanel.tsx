import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { analyzeVastu, getVastuScoreColor, getVastuScoreStatus } from "@/lib/vastu-engine";

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const r = 44;
  const cx = 52;
  const cy = 52;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const dash = circ * pct;
  const gap = circ - dash;
  // Rotate so 0% is at bottom-left, 100% is bottom-right (half-circle open at bottom)
  // We use full circle but only show 75% of it
  const sweep = circ * 0.75;
  const dashFill = sweep * pct;

  return (
    <View style={{ width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
      <Svg width={104} height={104}>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color + "20"} strokeWidth={8}
          strokeDasharray={`${sweep} ${circ - sweep}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round"
        />
        {/* Fill */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dashFill} ${circ - dashFill}`}
          strokeDashoffset={-(circ * 0.125)}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
          <Text style={[styles.gaugeMax, { color: color + "AA" }]}>/100</Text>
        </View>
      </View>
    </View>
  );
}

function Item({ icon, message, meta, bg, border, iconColor }: {
  icon: string; message: string; meta?: string;
  bg: string; border: string; iconColor: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.item, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.itemIconBox, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon as any} size={13} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, { color: colors.foreground }]}>{message}</Text>
        {meta && <Text style={[styles.itemMeta, { color: iconColor }]}>{meta}</Text>}
      </View>
    </View>
  );
}

export function VastuPanel() {
  const colors = useColors();
  const store = useDesignerStore();

  if (!store.currentPlan || store.currentPlan.rooms.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
          <Feather name="compass" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No rooms to analyze</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add rooms to your floor plan to see Vastu analysis.</Text>
      </View>
    );
  }

  const analysis = analyzeVastu(store.currentPlan);
  const scoreColor = getVastuScoreColor(analysis.score);
  const scoreStatus = getVastuScoreStatus(analysis.score);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Score section */}
      <View style={[styles.scoreCard, { backgroundColor: scoreColor + "0F", borderColor: scoreColor + "25" }]}>
        <ScoreGauge score={analysis.score} color={scoreColor} />
        <View style={styles.scoreInfo}>
          <Text style={[styles.scoreStatus, { color: scoreColor }]}>{scoreStatus}</Text>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Vastu Energy Score</Text>
          <View style={styles.scoreStats}>
            <View style={[styles.scoreStat, { backgroundColor: "#10B98120" }]}>
              <Text style={[styles.scoreStatNum, { color: "#10B981" }]}>{analysis.positives.length}</Text>
              <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Good</Text>
            </View>
            <View style={[styles.scoreStat, { backgroundColor: "#EF444420" }]}>
              <Text style={[styles.scoreStatNum, { color: "#EF4444" }]}>{analysis.issues.length}</Text>
              <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Issues</Text>
            </View>
            <View style={[styles.scoreStat, { backgroundColor: "#F59E0B20" }]}>
              <Text style={[styles.scoreStatNum, { color: "#F59E0B" }]}>{analysis.suggestions.length}</Text>
              <Text style={[styles.scoreStatLabel, { color: colors.mutedForeground }]}>Tips</Text>
            </View>
          </View>
        </View>
      </View>

      {analysis.positives.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Good Placements</Text>
          {analysis.positives.map((i) => (
            <Item key={i.id} icon="check-circle" message={i.message}
              bg="#10B98108" border="#10B98120" iconColor="#10B981" />
          ))}
        </View>
      )}

      {analysis.issues.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Issues</Text>
          {analysis.issues.map((i) => (
            <Item key={i.id} icon="alert-circle" message={i.message}
              meta={`Severity: ${i.severity}`}
              bg="#EF444408" border="#EF444420" iconColor="#EF4444" />
          ))}
        </View>
      )}

      {analysis.suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suggestions</Text>
          {analysis.suggestions.map((i) => (
            <Item key={i.id} icon="info" message={i.message}
              bg="#F59E0B08" border="#F59E0B20" iconColor="#F59E0B" />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24, gap: 16 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  scoreCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  gaugeScore: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  gaugeMax: { fontSize: 11, fontWeight: "600", marginTop: -4 },
  scoreInfo: { flex: 1, gap: 2 },
  scoreStatus: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  scoreLabel: { fontSize: 12, marginBottom: 8 },
  scoreStats: { flexDirection: "row", gap: 8 },
  scoreStat: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 10, gap: 2 },
  scoreStatNum: { fontSize: 18, fontWeight: "800" },
  scoreStatLabel: { fontSize: 10, fontWeight: "600" },

  section: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2, marginBottom: 2 },

  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  itemIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  itemText: { fontSize: 13, lineHeight: 18, flex: 1 },
  itemMeta: { fontSize: 11, marginTop: 2, textTransform: "capitalize", fontWeight: "600" },
});
