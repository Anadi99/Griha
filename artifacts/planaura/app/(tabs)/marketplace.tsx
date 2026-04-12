import React, { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
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

type Tab = "architects" | "contractors" | "materials";

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "architects", label: "Architects", icon: "pencil-ruler" },
  { key: "contractors", label: "Contractors", icon: "hard-hat" },
  { key: "materials", label: "Materials", icon: "package-variant" },
];

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Feather name="star" size={12} color={color} />
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function AvatarPlaceholder({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color + "20", borderColor: color + "40" }]}>
      <Text style={[styles.avatarText, { color }]}>{initials}</Text>
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
      <View style={styles.cardTop}>
        <AvatarPlaceholder initials={item.avatar} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.personName, { color: colors.foreground }]}>{item.name}</Text>
            {item.verified && <MaterialCommunityIcons name="check-decagram" size={14} color="#3B82F6" />}
          </View>
          <Text style={[styles.personMeta, { color: colors.muted }]}>{item.specialization.join(" · ")}</Text>
        </View>
        <StarRating rating={item.rating} color="#F59E0B" />
      </View>
      <View style={styles.detailRow}>
        <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="briefcase" size={11} color={colors.muted} />
          <Text style={[styles.chipText, { color: colors.muted }]}>{item.experience}y exp</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.muted} />
          <Text style={[styles.chipText, { color: colors.muted }]}>{item.location}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.chipText, { color: colors.primary, fontWeight: "700" }]}>₹{item.hourlyRate.toLocaleString("en-IN")}/hr</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.contactBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        onPress={() => Haptics.selectionAsync()}
      >
        <Feather name="message-square" size={14} color="#fff" />
        <Text style={styles.contactBtnText}>Contact</Text>
      </Pressable>
    </View>
  );

  const renderContractor = ({ item }: { item: Contractor }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.contractorIcon, { backgroundColor: colors.accent + "18" }]}>
          <MaterialCommunityIcons name="hard-hat" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
            {item.verified && <MaterialCommunityIcons name="check-decagram" size={14} color="#3B82F6" />}
          </View>
          <Text style={[styles.personMeta, { color: colors.muted }]}>{item.specialization.join(" · ")}</Text>
        </View>
        <StarRating rating={item.rating} color="#F59E0B" />
      </View>
      <View style={styles.detailRow}>
        <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="check-circle" size={11} color={colors.muted} />
          <Text style={[styles.chipText, { color: colors.muted }]}>{item.completedProjects} projects</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="map-marker-outline" size={11} color={colors.muted} />
          <Text style={[styles.chipText, { color: colors.muted }]}>{item.location}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
          <Text style={[styles.chipText, { color: colors.accent, fontWeight: "700" }]}>{formatCost(item.averageProjectCost)}</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.contactBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
        onPress={() => Haptics.selectionAsync()}
      >
        <Feather name="message-square" size={14} color="#fff" />
        <Text style={styles.contactBtnText}>Get Quote</Text>
      </Pressable>
    </View>
  );

  const renderMaterial = ({ item }: { item: Material }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.materialIcon, { backgroundColor: "#10B98118" }]}>
          <MaterialCommunityIcons name="package-variant" size={22} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.personName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.personMeta, { color: colors.muted }]}>{item.category} · {item.supplier}</Text>
        </View>
        <StarRating rating={item.rating} color="#F59E0B" />
      </View>
      <Text style={[styles.materialDesc, { color: colors.muted }]}>{item.description}</Text>
      <View style={styles.detailRow}>
        <View style={[styles.chip, { backgroundColor: item.inStock ? "#10B98115" : "#EF444415", borderColor: item.inStock ? "#10B98130" : "#EF444430" }]}>
          <Text style={[styles.chipText, { color: item.inStock ? "#10B981" : "#EF4444", fontWeight: "700" }]}>
            {item.inStock ? "In Stock" : "Out of Stock"}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
          <Text style={[styles.chipText, { color: "#10B981", fontWeight: "700" }]}>₹{item.pricePerUnit.toLocaleString("en-IN")}/{item.unit}</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.contactBtn, { backgroundColor: "#10B981", opacity: pressed ? 0.85 : 1 }]}
        onPress={() => Haptics.selectionAsync()}
      >
        <MaterialCommunityIcons name="cart-plus" size={14} color="#fff" />
        <Text style={styles.contactBtnText}>Add to Quote</Text>
      </Pressable>
    </View>
  );

  const data: any[] = activeTab === "architects" ? architects : activeTab === "contractors" ? contractors : MOCK_MATERIALS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Marketplace</Text>
        <Text style={[styles.headerSub, { color: colors.muted }]}>Find professionals & materials</Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
              style={[styles.tab, isActive && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            >
              <MaterialCommunityIcons name={tab.icon as any} size={16} color={isActive ? colors.primary : colors.muted} />
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.muted }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === "architects" ? renderArchitect : activeTab === "contractors" ? renderContractor : renderMaterial}
        contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub: { fontSize: 13, marginTop: 2 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800" },
  contractorIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  materialIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  personName: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  personMeta: { fontSize: 12 },
  materialDesc: { fontSize: 12, lineHeight: 18 },
  detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "500" },
  contactBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 12 },
  contactBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
