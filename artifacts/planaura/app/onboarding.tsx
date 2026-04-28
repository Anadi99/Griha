import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, Animated, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";

const { width: SW } = Dimensions.get("window");
export const ONBOARDING_KEY = "planaura_onboarded_v1";

const SLIDES = [
  {
    icon: "layout" as const,
    accent: "#38BDF8",
    title: "Design Your\nDream Space",
    subtitle: "Draw floor plans with a professional canvas. Drag, resize, and arrange rooms with precision.",
    tag: "Canvas Designer",
  },
  {
    icon: "compass" as const,
    accent: "#818CF8",
    title: "Vastu Energy\nAnalysis",
    subtitle: "Get real-time Vastu scores and placement guidance. Optimize your space for positive energy flow.",
    tag: "Spatial Intelligence",
  },
  {
    icon: "trending-up" as const,
    accent: "#34D399",
    title: "Instant Cost\nEstimates",
    subtitle: "See live construction cost breakdowns across 3 tiers — from economy to premium finishes.",
    tag: "Cost Planner",
  },
];

function Dot({ active, color }: { active: boolean; color: string }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(anim, { toValue: active ? 1 : 0, tension: 200, friction: 10, useNativeDriver: false }).start();
  }, [active]);
  return (
    <Animated.View style={{
      height: 6, borderRadius: 3,
      backgroundColor: color,
      width: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 22] }),
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    }} />
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setIndex(i);
      scrollRef.current?.scrollTo({ x: i * SW, animated: false });
      Animated.spring(fadeAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }).start();
    });
    Haptics.selectionAsync();
  };

  const handleNext = () => {
    if (isLast) handleFinish();
    else goTo(index + 1);
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const isIOS = Platform.OS === "ios";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background gradient blob */}
      <Animated.View style={[styles.blob, { backgroundColor: slide.accent, opacity: fadeAnim }]}
        pointerEvents="none" />

      {/* Skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <ScalePress onPress={handleFinish} style={styles.skipBtn} scale={0.94}>
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip</Text>
        </ScalePress>
      </View>

      {/* Slide content */}
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        {/* Icon card */}
        <View style={styles.iconWrap}>
          {isIOS ? (
            <BlurView intensity={60} tint="light" style={[styles.iconCard, { borderColor: colors.glassBorder }]}>
              <View style={[styles.iconInner, { backgroundColor: slide.accent + "18" }]}>
                <Feather name={slide.icon} size={44} color={slide.accent} />
              </View>
            </BlurView>
          ) : (
            <View style={[styles.iconCard, styles.iconCardAndroid, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <View style={[styles.iconInner, { backgroundColor: slide.accent + "18" }]}>
                <Feather name={slide.icon} size={44} color={slide.accent} />
              </View>
            </View>
          )}
        </View>

        {/* Tag */}
        <View style={[styles.tag, { backgroundColor: slide.accent + "15", borderColor: slide.accent + "30" }]}>
          <View style={[styles.tagDot, { backgroundColor: slide.accent }]} />
          <Text style={[styles.tagText, { color: slide.accent }]}>{slide.tag}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{slide.title}</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{slide.subtitle}</Text>
      </Animated.View>

      {/* Bottom area */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <ScalePress key={i} onPress={() => goTo(i)} scale={0.9}>
              <Dot active={i === index} color={slide.accent} />
            </ScalePress>
          ))}
        </View>

        {/* CTA */}
        <ScalePress onPress={handleNext} scale={0.97}>
          <LinearGradient
            colors={[slide.accent, slide.accent + "CC"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{isLast ? "Start Designing" : "Continue"}</Text>
            <Feather name={isLast ? "arrow-right" : "chevron-right"} size={18} color="#fff" />
          </LinearGradient>
        </ScalePress>

        {/* Page indicator text */}
        <Text style={[styles.pageText, { color: colors.muted }]}>
          {index + 1} of {SLIDES.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob: {
    position: "absolute", width: SW * 1.2, height: SW * 1.2,
    borderRadius: SW * 0.6, top: -SW * 0.4, left: -SW * 0.1,
    opacity: 0.08,
  },
  topBar: {
    paddingHorizontal: 24, alignItems: "flex-end",
  },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontSize: 15, fontWeight: "500" },

  slideContent: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 16,
  },

  iconWrap: { marginBottom: 8 },
  iconCard: {
    width: 140, height: 140, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  iconCardAndroid: {},
  iconInner: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },

  tag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  title: {
    fontSize: 38, fontWeight: "800", textAlign: "center",
    letterSpacing: -1.2, lineHeight: 46,
  },
  subtitle: {
    fontSize: 16, textAlign: "center", lineHeight: 24,
    maxWidth: 300,
  },

  bottom: { paddingHorizontal: 24, gap: 16, alignItems: "center" },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },

  cta: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: 18,
    shadowColor: "#38BDF8", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    width: SW - 48,
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  pageText: { fontSize: 12, fontWeight: "500" },
});
