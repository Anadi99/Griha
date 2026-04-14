import React, { useState } from "react";
import { View, Text, FlatList, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  getTopRatedArchitects,
  getTopRatedContractors,
  MOCK_MATERIALS,
  Architect,
  Contractor,
  Material,
} from "@/lib/marketplace";
import { formatCost } from "@/lib/cost-calculator";
import { ScalePress } from "@/components/ScalePress";

type Tab = "architects" | "contractors" | "materials";

const TABS: Array<{ key: Tab; label: string; icon: "pen-tool" | "tool" | "package" }> = [
  { key: "architects", label: "Architects", icon: "pen-tool" },
  { key: "contractors", label: "Contractors", icon: "tool" },
  { key: "materials", label: "Materials", icon: "package" },
];

function StarRating({ rating }: { rating: number }) {
  const colors = useColors();
  return (
    <View style={styles.starRow}>
      <Feather name="star" size={11} color="#F59E0B" />
      <Text style={[styles.starText, { color: colors.foreground }]}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function InitialsAvatar({ initials, color }: { initials: string; color: string }) {
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

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("architects");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const architects = getTopRatedArchitects(5);
  const contractors = getTopRatedContractors(5);

  const renderArchitect = ({ item }: { item: Architect }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <InitialsAvatar initials={item.avatar} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
            {item.verified && <Feather name="check-circle" size={13} color="#3B82F6" />}
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

      <ScalePress
        onPress={() => Haptics.selectionAsync()}
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
      >
        <Feather name="message-square" size={14} color="#fff" />
        <Text style={styles.actionBtnText}>Contact</Text>
      </ScalePress>
    </View>
  );

  const renderContractor = ({ item }: { item: Contractor }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentMuted }]}>
          <Feather name="tool" size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            {item.verified && <Feather name="check-circle" size={13} color="#3B82F6" />}
          </View>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>{item.specialization.join(" · ")}</Text>
        </View>
        <StarRating rating={item.rating} />
      </View>

      <View style={styles.chipsRow}>
        <Chip text={`${item.completedProjects} projects`} color={colors.mutedForeground} bg={colors.mutedBg} />
        <Chip text={item.location} color={colors.mutedForeground} bg={colors.mutedBg} />
        <Chip text={formatCost(item.averageProjectCost)} color={colors.accent} bg={colors.accentMuted} />
      </View>

      <ScalePress
        onPress={() => Haptics.selectionAsync()}
        style={[styles.actionBtn, { backgroundColor: colors.accent }]}
      >
        <Feather name="send" size={14} color="#fff" />
        <Text style={styles.actionBtnText}>Get Quote</Text>
      </ScalePress>
    </View>
  );

  const renderMaterial = ({ item }: { item: Material }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconBox, { backgroundColor: colors.successMuted }]}>
          <Feather name="package" size={20} color={colors.success} />
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
          color={item.inStock ? colors.success : colors.destructive}
          bg={item.inStock ? colors.successMuted : colors.destructiveMuted}
        />
        <Chip
          text={`₹${item.pricePerUnit.toLocaleString("en-IN")}/${item.unit}`}
          color={colors.success} bg={colors.successMuted}
        />
      </View>

      <ScalePress
        onPress={() => Haptics.selectionAsync()}
        style={[styles.actionBtn, { backgroundColor: colors.success }]}
      >
        <Feather name="shopping-cart" size={14} color="#fff" />
        <Text style={styles.actionBtnText}>Add to Quote</Text>
      </ScalePress>
    </View>
  );

  const data: any[] = activeTab === "architects" ? architects : activeTab === "contractors" ? contractors : MOCK_MATERIALS;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Marketplace</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Connect with professionals & suppliers</Text>
      </View>

      {/* Pill tab bar */}
      <View style={[styles.tabBarWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.tabBar, { backgroundColor: colors.mutedBg }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <ScalePress
                key={tab.key}
                onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
                style={[
                  styles.tabPill,
                  isActive && [styles.tabPillActive, { backgroundColor: colors.card }],
                ]}
                scale={0.97}
              >
                <Feather name={tab.icon} size={14} color={isActive ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                  {tab.label}
                </Text>
              </ScalePress>
            );
          })}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={
          activeTab === "architects" ? renderArchitect
          : activeTab === "contractors" ? renderContractor
          : renderMaterial
        }
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, marginTop: 2 },

  tabBarWrapper: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  tabBar: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tabPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabPillActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  list: { padding: 16, gap: 12 },

  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
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
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 11, borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
