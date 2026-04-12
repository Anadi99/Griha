import React, { useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore } from "@/lib/store";

const FEATURES = [
  { icon: "floor-plan", label: "Canvas Designer", desc: "Grid-based drag-and-place room layout builder", color: "#4F46E5" },
  { icon: "compass-outline", label: "Vastu Analysis", desc: "Real-time energy scoring and placement advice", color: "#7C3AED" },
  { icon: "currency-inr", label: "Cost Estimation", desc: "Detailed construction cost breakdown by tier", color: "#10B981" },
  { icon: "store-outline", label: "Marketplace", desc: "Connect with architects, contractors & suppliers", color: "#F97316" },
];

function FeatureCard({ icon, label, desc, color, delay }: { icon: string; label: string; desc: string; color: string; delay: number }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.featureIcon, { backgroundColor: color + "18" }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.featureLabel, { color: colors.foreground }]}>{label}</Text>
          <Text style={[styles.featureDesc, { color: colors.muted }]}>{desc}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const store = useDesignerStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    store.loadSavedPlans();
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(ctaAnim, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    if (!store.currentPlan) {
      store.createNewPlan("My Floor Plan");
    }
    router.push("/(tabs)/designer");
  };

  const savedCount = store.savedPlans.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.heroBg, { backgroundColor: colors.primary }]} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
          <View style={[styles.logoBox, { backgroundColor: "#fff2", borderColor: "#ffffff40" }]}>
            <MaterialCommunityIcons name="floor-plan" size={32} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>PlanAura</Text>
          <Text style={styles.heroSub}>AI-Assisted Floor Plan & Vastu Design</Text>
          {savedCount > 0 && (
            <View style={[styles.savedBadge, { backgroundColor: "#ffffff25" }]}>
              <Text style={styles.savedBadgeText}>{savedCount} saved plan{savedCount > 1 ? "s" : ""}</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.body}>
          <Animated.View style={{ opacity: ctaAnim }}>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [styles.ctaBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="edit-3" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>
                {store.currentPlan ? "Continue Designing" : "Start Designing"}
              </Text>
            </Pressable>
          </Animated.View>

          {savedCount > 0 && (
            <Pressable
              onPress={() => router.push("/(tabs)/plans")}
              style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialCommunityIcons name="folder-outline" size={18} color={colors.primary} />
              <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>My Saved Plans</Text>
            </Pressable>
          )}

          <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Features</Text>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.label} {...f} delay={i * 80} />
          ))}

          <View style={[styles.statsRow, { marginTop: 8 }]}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>6</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Room Types</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.accent }]}>Vastu</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Smart Analysis</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: "#10B981" }]}>3</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Cost Tiers</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingBottom: 100 },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle: { fontSize: 36, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 8 },
  heroSub: { fontSize: 15, color: "#ffffffCC", textAlign: "center", lineHeight: 22 },
  savedBadge: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  savedBadgeText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  body: { paddingHorizontal: 16 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16, marginBottom: 12 },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 28 },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  sectionHeading: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  featureCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  featureDesc: { fontSize: 12, lineHeight: 16 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
