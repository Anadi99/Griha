import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ScalePress } from "@/components/ScalePress";

const { width: SW } = Dimensions.get("window");
export const ONBOARDING_KEY = "planaura_onboarded_v1";

const SKY = "#38BDF8";
const INDIGO = "#818CF8";

const SLIDES = [
  {
    icon: "layout" as const,
    accent: SKY,
    leakColor: INDIGO,
    tag: "Canvas Designer",
    title: "Design Your\nDream Space",
    subtitle: "Draw floor plans with a professional canvas. Drag, resize, and arrange rooms with precision.",
  },
  {
    icon: "compass" as const,
    accent: INDIGO,
    leakColor: SKY,
    tag: "Spatial Intelligence",
    title: "Vastu Energy\nAnalysis",
    subtitle: "Get real-time Vastu scores and placement guidance. Optimize your space for positive energy flow.",
  },
  {
    icon: "cpu" as const,
    accent: "#34D399",
    leakColor: INDIGO,
    tag: "AI Powered",
    title: "Instant AI\nInsights",
    subtitle: "Chat with Griha AI, scan rooms with your camera, and generate layouts from your requirements.",
  },
];

function Dot({ active, color }: { active: boolean; color: string }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.spring(anim, { toValue: active ? 1 : 0, tension: 200, friction: 10, useNativeDriver: false }).start();
  }, [active]);
  return (
    <Animated.View style={{
      height: 4, borderRadius: 2, backgroundColor: color,
      width: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 24] }),
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    }} />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  // Separate animations for content and light leak
  const contentAnim = useRef(new Animated.Value(1)).current;
  const leakAnim = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(0)).current;

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const isIOS = Platform.OS === "ios";

  const goTo = (i: number) => {
    // Fade out content + slide up
    Animated.parallel([
      Animated.timing(contentAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIndex(i);
      slideY.setValue(20);
      // Fade in new content + fade in light leak
      Animated.parallel([
        Animated.spring(contentAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.timing(leakAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    });
    Haptics.selectionAsync();
  };

  const handleNext = () => { if (isLast) handleFinish(); else goTo(index + 1); };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.root}>
      {/* Pitch black base */}
      <View style={StyleSheet.absoluteFill} />

      {/* Indigo light leak — fades in after first tap */}
      <Animated.View style={[styles.lightLeak, {
        backgroundColor: slide.leakColor,
        opacity: leakAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
      }]} pointerEvents="none" />

      {/* Secondary glow bottom-right */}
      <Animated.View style={[styles.lightLeakBR, {
        backgroundColor: slide.accent,
        opacity: leakAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
      }]} pointerEvents="none" />

      {/* Skip */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <ScalePress onPress={handleFinish} style={styles.skipBtn} scale={0.94}>
          <Text style={styles.skipText}>Skip</Text>
        </ScalePress>
      </View>

      {/* Slide content */}
      <Animated.View style={[
        styles.slideContent,
        { opacity: contentAnim, transform: [{ translateY: slideY }] },
      ]}>
        {/* Icon card — glass */}
        <View style={styles.iconWrap}>
          {isIOS ? (
            <BlurView intensity={20} tint="dark" style={[styles.iconCard, { borderColor: slide.accent + "25" }]}>
              <View style={[styles.iconInner, { backgroundColor: slide.accent + "15" }]}>
                <Feather name={slide.icon} size={48} color={slide.accent} />
              </View>
            </BlurView>
          ) : (
            <View style={[styles.iconCard, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: slide.accent + "25" }]}>
              <View style={[styles.iconInner, { backgroundColor: slide.accent + "15" }]}>
                <Feather name={slide.icon} size={48} color={slide.accent} />
              </View>
            </View>
          )}
          {/* Glow behind icon */}
          <View style={[styles.iconGlow, { backgroundColor: slide.accent }]} />
        </View>

        {/* Tag pill */}
        <View style={[styles.tag, { backgroundColor: slide.accent + "12", borderColor: slide.accent + "30" }]}>
          <View style={[styles.tagDot, { backgroundColor: slide.accent }]} />
          <Text style={[styles.tagText, { color: slide.accent }]}>{slide.tag}</Text>
        </View>

        {/* Title — large bold white */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Subtitle — muted slate */}
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </Animated.View>

      {/* Bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 28 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <ScalePress key={i} onPress={() => goTo(i)} scale={0.9}>
              <Dot active={i === index} color={slide.accent} />
            </ScalePress>
          ))}
        </View>

        {/* CTA — Sky to Indigo gradient */}
        <ScalePress onPress={handleNext} scale={0.97}>
          <LinearGradient
            colors={[SKY, INDIGO]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{isLast ? "Start Designing" : "Continue"}</Text>
            <Feather name={isLast ? "arrow-right" : "chevron-right"} size={18} color="#fff" />
          </LinearGradient>
        </ScalePress>

        <Text style={styles.pageText}>{index + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },

  lightLeak: {
    position: "absolute", top: -SW * 0.3, left: -SW * 0.2,
    width: SW * 1.2, height: SW * 1.2, borderRadius: SW * 0.6,
  },
  lightLeakBR: {
    position: "absolute", bottom: -SW * 0.2, right: -SW * 0.2,
    width: SW * 0.8, height: SW * 0.8, borderRadius: SW * 0.4,
  },

  topBar: { paddingHorizontal: 24, alignItems: "flex-end" },
  skipBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  skipText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.35)", letterSpacing: 0.2 },

  slideContent: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 18,
  },

  iconWrap: { position: "relative", marginBottom: 8 },
  iconCard: {
    width: 140, height: 140, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, overflow: "hidden",
  },
  iconInner: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  iconGlow: {
    position: "absolute", bottom: -20, left: "50%", marginLeft: -30,
    width: 60, height: 20, borderRadius: 30, opacity: 0.3,
  },

  tag: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },

  // Large bold white — SF Pro feel
  title: {
    fontSize: 40, fontWeight: "800", textAlign: "center",
    letterSpacing: -1.5, lineHeight: 48, color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16, textAlign: "center", lineHeight: 26,
    color: "rgba(148,163,184,0.85)", maxWidth: 300,
  },

  bottom: { paddingHorizontal: 24, gap: 18, alignItems: "center" },
  dots: { flexDirection: "row", gap: 8, alignItems: "center" },

  cta: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 17, paddingHorizontal: 40,
    borderRadius: 16, width: SW - 48, justifyContent: "center",
    shadowColor: SKY, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  pageText: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.2)" },
});
