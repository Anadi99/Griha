import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, Platform,
  Animated, useColorScheme, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  getTopRatedArchitects, getTopRatedContractors, MOCK_MATERIALS,
  Architect, Contractor, Material,
} from "@/lib/marketplace";
import { formatCost } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

type Tab = "architects" | "contractors" | "materials";

const TABS: Array<{ key: Tab; label: string; icon: "pen-tool" | "tool" | "package" }> = [
  { key: "architects",  label: "Architects",  icon: "pen-tool" },
  { key: "contractors", label: "Contractors", icon: "tool" },
  { key: "materials",   label: "Materials",   icon: "package" },
];

function SkeletonCard() {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });
  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity }]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mutedBg }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 14, width: "55%", borderRadius: 7, backgroundColor: colors.mutedBg }} />
          <View style={{ height: 10, width: "40%", borderRadius: 5, backgroundColor: colors.mutedBg }} />
        </View>
      </View>
      <View style={{ height: 42, borderRadius: 12, backgroundColor: colors.mutedBg }} />
    </Animated.View>
  );
}

function AnimCard({ children, index }: { children: React.ReactNode; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 100, friction: 12, delay: index * 55, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [
        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
}

function StarRating({ rating }: { rating: number }) {
  const colors = useColors();
  return (
    <View style={styles.starRow}>
      <Feather name="star" size={11} color="#D97706" />
      <Text style={[styles.starText, { color: colors.foreground }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
      <Text style={[styles.avatarText, { color }]}>{initials}</Text>
    </View>
  );
}

function Chip({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

function ComingSoonBanner() {
  const colors = useColors();
  return (
    <View style={[styles.comingSoon, { backgroundColor: colors.primaryMuted, borderColor: colors.primary + "25" }]}>
      <Feather name="zap" size={13} color={colors.primary} />
      <Text style={[styles.comingSoonText, { color: colors.primary }]}>
        <Text style={{ fontWeight: "800" }}>v2 feature:</Text> Direct contact, quotes & purchases coming soon.
      </Text>
    </View>
  );
}

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const [activeTab, setActiveTab] = useState<Tab>("architects");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const architects  = getTopRatedArchitects(5);
  const contractors = getTopRatedContractors(5);

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return;
    setLoading(true);
    Haptics.selectionAsync();
    setTimeout(() => { setActiveTab(tab); setLoading(false); }, 100);
  };

  const handleContact = () => {
    Alert.alert("Coming in v2", "Direct contact and quote requests will be available in the next version.", [{ text: "Got it" }]);
  };

  const renderArchitect = ({ item, index }: { item: Architect; index: number }) => (
    <AnimCard index={index}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHead}>
          <Avatar initials={item.avatar} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              {item.verified && <Feather name="check-circle" size={13} color="#2563EB" />}
            </View>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{item.specialization.join(" · ")}</Text>
          </View>
          <StarRating rating={item.rating} />
        </View>
        <View style={styles.chipsRow}>
          <Chip text={`${item.experience}y exp`} color={colors.mutedForeground} bg={colors.mutedBg} />
          <Chip text={item.location} color={colors.mutedForeground} bg={colors.mutedBg} />
          <Chip text={`₹${item.hourlyRate.toLocaleString("en-IN")}/hr`} color={colors.primary} bg={colors.primaryMuted} />
        </View>
        <ScalePress onPress={handleContact} scale={0.97}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
            <Feather name="message-square" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Contact</Text>
          </LinearGradient>
        </ScalePress>
      </View>
    </AnimCard>
  );

  const renderContractor = ({ item, index }: { item: Contractor; index: number }) => (
    <AnimCard index={index}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHead}>
          <View style={[styles.iconBox, { backgroundColor: "#7C3AED18" }]}>
            <Feather name="tool" size={20} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              {item.verified && <Feather name="check-circle" size={13} color="#2563EB" />}
            </View>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{item.specialization.join(" · ")}</Text>
          </View>
          <StarRating rating={item.rating} />
        </View>
        <View style={styles.chipsRow}>
          <Chip text={`${item.completedProjects} projects`} color={colors.mutedForeground} bg={colors.mutedBg} />
          <Chip text={item.location} color={colors.mutedForeground} bg={colors.mutedBg} />
          <Chip text={formatCost(item.averageProjectCost)} color="#7C3AED" bg="#7C3AED15" />
        </View>
        <ScalePress onPress={handleContact} scale={0.97}>
          <LinearGradient colors={["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
            <Feather name="send" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Get Quote</Text>
          </LinearGradient>
        </ScalePress>
      </View>
    </AnimCard>
  );

  const renderMaterial = ({ item, index }: { item: Material; index: number }) => (
    <AnimCard index={index}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHead}>
          <View style={[styles.iconBox, { backgroundColor: "#05966918" }]}>
            <Feather name="package" size={20} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{item.category} · {item.supplier}</Text>
          </View>
          <StarRating rating={item.rating} />
        </View>
        <Text style={[styles.materialDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
        <View style={styles.chipsRow}>
          <Chip
            text={item.inStock ? "In Stock" : "Out of Stock"}
            color={item.inStock ? "#059669" : colors.destructive}
            bg={item.inStock ? "#05966915" : colors.destructiveMuted}
          />
          <Chip text={`₹${item.pricePerUnit.toLocaleString("en-IN")}/${item.unit}`} color="#059669" bg="#05966915" />
        </View>
        <ScalePress onPress={handleContact} scale={0.97}>
          <LinearGradient colors={["#059669", "#047857"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
            <Feather name="shopping-cart" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Add to Quote</Text>
          </LinearGradient>
        </ScalePress>
      </View>
    </AnimCard>
  );

  const data: any[] = activeTab === "architects" ? architects
    : activeTab === "contractors" ? contractors : MOCK_MATERIALS;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 },
        isIOS ? {} : { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        {isIOS && <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Professionals & suppliers</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBarWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.mutedBg }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <ScalePress key={tab.key} onPress={() => switchTab(tab.key)} scale={0.95}
                style={[styles.tabPill, isActive && [styles.tabPillActive, { backgroundColor: colors.card }]]}>
                <Feather name={tab.icon} size={13} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                  {tab.label}
                </Text>
              </ScalePress>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={[styles.list, { gap: 12 }]}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ComingSoonBanner />}
          renderItem={
            activeTab === "architects" ? renderArchitect as any
            : activeTab === "contractors" ? renderContractor as any
            : renderMaterial as any
          }
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { overflow: "hidden", borderBottomWidth: StyleSheet.hairlineWidth },
  headerInner: { paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 2 },

  tabBarWrapper: { paddingHorizontal: 16, paddingVertical: 10 },
  tabBar: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tabPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  tabPillActive: {
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  tabLabel: { fontSize: 12, fontWeight: "600" },

  list: { padding: 16, gap: 12 },

  comingSoon: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 4,
  },
  comingSoonText: { flex: 1, fontSize: 13, lineHeight: 19 },

  card: {
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "800" },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3, flexShrink: 1 },
  name: { fontSize: 15, fontWeight: "700", flexShrink: 1, letterSpacing: -0.2 },
  sub: { fontSize: 12, lineHeight: 17 },
  materialDesc: { fontSize: 13, lineHeight: 19 },

  starRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  starText: { fontSize: 13, fontWeight: "700" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 12, fontWeight: "600" },

  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
    shadowColor: "#E02020", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
