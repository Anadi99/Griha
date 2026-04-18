import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Animated } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useDesignerStore } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { analyzeVastu, getVastuScoreColor, getVastuScoreStatus } from "@/lib/vastu-engine";

/* ── Arc math ──────────────────────────────────────── */
const CX = 90, CY = 90, R = 70, SW = 12;
const START_DEG = 135;   // bottom-left
const TOTAL_SWEEP = 270; // degrees clockwise

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcD(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg < 0.01) return "";
  const s = polarXY(cx, cy, r, startDeg);
  const e = polarXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

function scoreToDeg(score: number) {
  return START_DEG + (Math.min(100, Math.max(0, score)) / 100) * TOTAL_SWEEP;
}

/* ── Animated Arc Gauge ────────────────────────────── */
function ArcGauge({ score }: { score: number }) {
  const colors = useColors();
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    setAnimScore(0);
    let raf: number;
    const startTime = performance.now();
    const duration = 1100;
    const target = score;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setAnimScore(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const scoreColor = getVastuScoreColor(animScore);

  // Zone boundaries in degrees
  const redEnd   = scoreToDeg(40);
  const yelEnd   = scoreToDeg(70);
  const grnEnd   = scoreToDeg(100);
  const scoreEnd = scoreToDeg(animScore);

  // Track arcs (always visible, dimmed)
  const trackRed = arcD(CX, CY, R, START_DEG, redEnd);
  const trackYel = arcD(CX, CY, R, redEnd, yelEnd);
  const trackGrn = arcD(CX, CY, R, yelEnd, grnEnd);

  // Filled arcs (visible up to animScore)
  const fillRed = animScore > 0  ? arcD(CX, CY, R, START_DEG, Math.min(scoreEnd, redEnd)) : "";
  const fillYel = animScore > 40 ? arcD(CX, CY, R, redEnd, Math.min(scoreEnd, yelEnd)) : "";
  const fillGrn = animScore > 70 ? arcD(CX, CY, R, yelEnd, Math.min(scoreEnd, grnEnd)) : "";

  // Needle endpoint
  const needle = polarXY(CX, CY, R - SW / 2 - 4, scoreToDeg(animScore));

  return (
    <View style={styles.gaugeWrap}>
      <Svg width={180} height={180}>
        {/* Track — dim zones */}
        {trackRed && <Path d={trackRed} stroke="#EF444430" strokeWidth={SW} fill="none" strokeLinecap="round" />}
        {trackYel && <Path d={trackYel} stroke="#F59E0B28" strokeWidth={SW} fill="none" strokeLinecap="round" />}
        {trackGrn && <Path d={trackGrn} stroke="#10B98128" strokeWidth={SW} fill="none" strokeLinecap="round" />}

        {/* Filled zones */}
        {fillRed && <Path d={fillRed} stroke="#EF4444" strokeWidth={SW} fill="none" strokeLinecap="round" />}
        {fillYel && <Path d={fillYel} stroke="#F59E0B" strokeWidth={SW} fill="none" strokeLinecap="round" />}
        {fillGrn && <Path d={fillGrn} stroke="#10B981" strokeWidth={SW} fill="none" strokeLinecap="round" />}

        {/* Needle dot */}
        {animScore > 0 && (
          <Circle cx={needle.x} cy={needle.y} r={5} fill={scoreColor} stroke="#fff" strokeWidth={2} />
        )}

        {/* Center text */}
        <SvgText x={CX} y={CY - 8} textAnchor="middle" fontSize={36} fontWeight="800" fill={scoreColor}>{animScore}</SvgText>
        <SvgText x={CX} y={CY + 14} textAnchor="middle" fontSize={12} fill="#94A3B8">/ 100</SvgText>

        {/* Zone labels */}
        <SvgText x={22} y={150} textAnchor="middle" fontSize={9} fill="#EF4444" opacity={0.8}>Low</SvgText>
        <SvgText x={CX} y={168} textAnchor="middle" fontSize={9} fill="#F59E0B" opacity={0.8}>Medium</SvgText>
        <SvgText x={158} y={150} textAnchor="middle" fontSize={9} fill="#10B981" opacity={0.8}>High</SvgText>
      </Svg>
    </View>
  );
}

/* ── Stat badge ────────────────────────────────────── */
function StatBadge({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  const anim = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  }, [count]);

  return (
    <Animated.View style={[styles.statBadge, { backgroundColor: bg, transform: [{ scale: anim }] }]}>
      <Text style={[styles.statBadgeNum, { color }]}>{count}</Text>
      <Text style={[styles.statBadgeLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

/* ── Item row ──────────────────────────────────────── */
function Item({ icon, message, meta, bg, iconColor, index }: {
  icon: string; message: string; meta?: string;
  bg: string; iconColor: string; index: number;
}) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, delay: index * 60, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
    }}>
      <View style={[styles.item, { backgroundColor: bg }]}>
        <View style={[styles.itemIcon, { backgroundColor: iconColor + "22" }]}>
          <Feather name={icon as any} size={13} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemText, { color: colors.foreground }]}>{message}</Text>
          {meta && <Text style={[styles.itemMeta, { color: iconColor }]}>{meta}</Text>}
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Main panel ────────────────────────────────────── */
export function VastuPanel() {
  const colors = useColors();
  const store = useDesignerStore();

  if (!store.currentPlan || store.currentPlan.rooms.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIconBox, { backgroundColor: colors.primaryMuted }]}>
          <Feather name="compass" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No rooms to analyze</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Add rooms to your floor plan to see Vastu energy analysis.
        </Text>
      </View>
    );
  }

  const analysis = analyzeVastu(store.currentPlan);
  const scoreColor = getVastuScoreColor(analysis.score);
  const scoreStatus = getVastuScoreStatus(analysis.score);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Hero gauge card */}
      <View style={[styles.gaugeCard, { backgroundColor: scoreColor + "0C", borderColor: scoreColor + "28" }]}>
        <ArcGauge score={analysis.score} />
        <Text style={[styles.scoreStatus, { color: scoreColor }]}>{scoreStatus}</Text>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Vastu Energy Score</Text>

        <View style={styles.statsRow}>
          <StatBadge count={analysis.positives.length} label="Good" color="#10B981" bg="#10B98118" />
          <StatBadge count={analysis.issues.length} label="Issues" color="#EF4444" bg="#EF444418" />
          <StatBadge count={analysis.suggestions.length} label="Tips" color="#F59E0B" bg="#F59E0B18" />
        </View>
      </View>

      {analysis.positives.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionDot, { backgroundColor: "#10B981" }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Good Placements</Text>
          </View>
          {analysis.positives.map((item, i) => (
            <Item key={item.id} icon="check-circle" message={item.message}
              bg="#10B98108" iconColor="#10B981" index={i} />
          ))}
        </View>
      )}

      {analysis.issues.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionDot, { backgroundColor: "#EF4444" }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Issues</Text>
          </View>
          {analysis.issues.map((item, i) => (
            <Item key={item.id} icon="alert-circle" message={item.message}
              meta={`Severity: ${item.severity}`}
              bg="#EF444408" iconColor="#EF4444" index={i} />
          ))}
        </View>
      )}

      {analysis.suggestions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.sectionDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suggestions</Text>
          </View>
          {analysis.suggestions.map((item, i) => (
            <Item key={item.id} icon="info" message={item.message}
              bg="#F59E0B08" iconColor="#F59E0B" index={i} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 28, gap: 16 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  gaugeCard: { borderRadius: 20, borderWidth: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 12, gap: 4 },
  gaugeWrap: { alignItems: "center", justifyContent: "center" },
  scoreStatus: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, marginTop: 2 },
  scoreLabel: { fontSize: 12 },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  statBadge: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, gap: 2 },
  statBadgeNum: { fontSize: 20, fontWeight: "800" },
  statBadgeLabel: { fontSize: 10, fontWeight: "700", opacity: 0.8 },

  section: { gap: 6 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },

  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 16 },
  itemIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  itemText: { fontSize: 13, lineHeight: 18, flex: 1 },
  itemMeta: { fontSize: 11, marginTop: 3, textTransform: "capitalize", fontWeight: "600" },
});
