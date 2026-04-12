import React, { useState, useRef } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Room } from "@/lib/store";
import { FloorPlanCanvas } from "@/components/FloorPlanCanvas";
import { RoomPropertiesPanel } from "@/components/RoomPropertiesPanel";
import { VastuPanel } from "@/components/VastuPanel";
import { CostPanel } from "@/components/CostPanel";
import { analyzeVastu } from "@/lib/vastu-engine";

type PanelTab = "properties" | "vastu" | "cost";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; icon: string; desc: string }> = [
  { type: "bedroom", label: "Bedroom", icon: "bed-double-outline", desc: "SW · W · NW ideal" },
  { type: "living_room", label: "Living Room", icon: "sofa-outline", desc: "N · E · NE ideal" },
  { type: "kitchen", label: "Kitchen", icon: "chef-hat", desc: "SE · S ideal" },
  { type: "bathroom", label: "Bathroom", icon: "shower", desc: "NW · N ideal" },
  { type: "office", label: "Office", icon: "desk", desc: "N · E · NE ideal" },
  { type: "dining_room", label: "Dining", icon: "silverware-fork-knife", desc: "W · E ideal" },
];

export default function DesignerScreen() {
  const colors = useColors();
  const store = useDesignerStore();
  const insets = useSafeAreaInsets();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("properties");
  const [canvasHeight, setCanvasHeight] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  React.useEffect(() => {
    if (!store.currentPlan) {
      store.createNewPlan("My Floor Plan");
    }
  }, []);

  const handleAddRoom = (type: Room["type"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const offset = store.currentPlan?.rooms.length ?? 0;
    store.addRoom({
      type,
      x: (offset * 2) % 20,
      y: (offset * 2) % 20,
      width: type === "living_room" ? 16 : type === "bathroom" ? 8 : 12,
      height: type === "living_room" ? 14 : type === "bathroom" ? 8 : 12,
      direction: "N",
      area: type === "living_room" ? 224 : type === "bathroom" ? 64 : 144,
    });
    store.calculateDirections();
    setShowAddModal(false);
  };

  const handleRoomSelect = (roomId: string | null) => {
    store.selectRoom(roomId);
    if (roomId) {
      setActiveTab("properties");
      setShowBottomPanel(true);
      Haptics.selectionAsync();
    }
  };

  const handleZoom = (dir: "in" | "out") => {
    const newZoom = dir === "in" ? store.zoom * 1.25 : store.zoom / 1.25;
    store.setZoom(newZoom);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    await store.savePlan();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const vastuScore = store.currentPlan ? analyzeVastu(store.currentPlan).score : 0;
  const roomCount = store.currentPlan?.rooms.length ?? 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <View>
          <Text style={[styles.planName, { color: colors.foreground }]} numberOfLines={1}>
            {store.currentPlan?.name ?? "Floor Plan"}
          </Text>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerMetaText, { color: colors.muted }]}>{roomCount} room{roomCount !== 1 ? "s" : ""}</Text>
            {roomCount > 0 && (
              <>
                <Text style={[styles.headerMetaText, { color: colors.muted }]}>·</Text>
                <Text style={[styles.headerMetaText, { color: colors.muted }]}>{store.currentPlan?.totalArea} sqft</Text>
                {vastuScore > 0 && (
                  <>
                    <Text style={[styles.headerMetaText, { color: colors.muted }]}>·</Text>
                    <Text style={[styles.headerMetaText, { color: getScoreColor(vastuScore), fontWeight: "700" }]}>
                      Vastu {vastuScore}
                    </Text>
                  </>
                )}
              </>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleSave} style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
            <Feather name="save" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => { setShowAddModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View
        style={styles.canvas}
        onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}
      >
        <FloorPlanCanvas
          width={0}
          height={canvasHeight}
          onRoomSelect={handleRoomSelect}
        />

        <View style={styles.zoomControls}>
          <Pressable onPress={() => handleZoom("in")} style={[styles.zoomBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zoom-in" size={16} color={colors.foreground} />
          </Pressable>
          <View style={[styles.zoomDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.zoomText, { color: colors.foreground }]}>{Math.round(store.zoom * 100)}%</Text>
          </View>
          <Pressable onPress={() => handleZoom("out")} style={[styles.zoomBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zoom-out" size={16} color={colors.foreground} />
          </Pressable>
        </View>

        {store.selectedRoomId && (
          <View style={[styles.floatingDelete]}>
            <Pressable
              onPress={() => { store.deleteRoom(store.selectedRoomId!); store.selectRoom(null); setShowBottomPanel(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={({ pressed }) => [styles.deleteFloatBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="trash-2" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 4 }]}>
        <Pressable onPress={() => { setActiveTab("vastu"); setShowBottomPanel(true); }} style={({ pressed }) => [styles.bottomBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons name="compass-outline" size={20} color={activeTab === "vastu" && showBottomPanel ? colors.primary : colors.muted} />
          <Text style={[styles.bottomBtnText, { color: activeTab === "vastu" && showBottomPanel ? colors.primary : colors.muted }]}>Vastu</Text>
        </Pressable>
        <Pressable onPress={() => { setActiveTab("cost"); setShowBottomPanel(true); }} style={({ pressed }) => [styles.bottomBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <MaterialCommunityIcons name="currency-inr" size={20} color={activeTab === "cost" && showBottomPanel ? colors.primary : colors.muted} />
          <Text style={[styles.bottomBtnText, { color: activeTab === "cost" && showBottomPanel ? colors.primary : colors.muted }]}>Cost</Text>
        </Pressable>
        <Pressable onPress={() => setShowBottomPanel(false)} style={({ pressed }) => [styles.bottomBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="grid" size={20} color={!showBottomPanel ? colors.primary : colors.muted} />
          <Text style={[styles.bottomBtnText, { color: !showBottomPanel ? colors.primary : colors.muted }]}>Canvas</Text>
        </Pressable>
        {store.selectedRoomId && (
          <Pressable onPress={() => { setActiveTab("properties"); setShowBottomPanel(true); }} style={({ pressed }) => [styles.bottomBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Feather name="sliders" size={20} color={activeTab === "properties" && showBottomPanel ? colors.primary : colors.muted} />
            <Text style={[styles.bottomBtnText, { color: activeTab === "properties" && showBottomPanel ? colors.primary : colors.muted }]}>Edit</Text>
          </Pressable>
        )}
      </View>

      {showBottomPanel && (
        <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={[styles.panelTabBar, { borderBottomColor: colors.border }]}>
            {store.selectedRoomId && (
              <Pressable onPress={() => setActiveTab("properties")} style={[styles.panelTab, activeTab === "properties" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}>
                <Text style={[styles.panelTabText, { color: activeTab === "properties" ? colors.primary : colors.muted }]}>Edit Room</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setActiveTab("vastu")} style={[styles.panelTab, activeTab === "vastu" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}>
              <Text style={[styles.panelTabText, { color: activeTab === "vastu" ? colors.primary : colors.muted }]}>Vastu</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab("cost")} style={[styles.panelTab, activeTab === "cost" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}>
              <Text style={[styles.panelTabText, { color: activeTab === "cost" ? colors.primary : colors.muted }]}>Cost</Text>
            </Pressable>
            <Pressable onPress={() => setShowBottomPanel(false)} style={styles.closePanel}>
              <Feather name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.panelContent}>
            {activeTab === "properties" && <RoomPropertiesPanel onClose={() => setShowBottomPanel(false)} />}
            {activeTab === "vastu" && <VastuPanel />}
            {activeTab === "cost" && <CostPanel />}
          </View>
        </View>
      )}

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Room</Text>
            <Text style={[styles.modalSub, { color: colors.muted }]}>Select a room type to add to your plan</Text>
            <View style={styles.roomGrid}>
              {ROOM_TYPES.map((rt) => {
                const roomColor = (colors as any)[rt.type] || colors.primary;
                return (
                  <Pressable
                    key={rt.type}
                    onPress={() => handleAddRoom(rt.type)}
                    style={({ pressed }) => [styles.roomTypeBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View style={[styles.roomTypeIcon, { backgroundColor: roomColor + "18" }]}>
                      <MaterialCommunityIcons name={rt.icon as any} size={22} color={roomColor} />
                    </View>
                    <Text style={[styles.roomTypeName, { color: colors.foreground }]}>{rt.label}</Text>
                    <Text style={[styles.roomTypeDesc, { color: colors.muted }]}>{rt.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  planName: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerMetaText: { fontSize: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  canvas: { flex: 1, position: "relative" },
  zoomControls: { position: "absolute", right: 12, top: 12, gap: 4 },
  zoomBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  zoomDisplay: { height: 32, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  zoomText: { fontSize: 11, fontWeight: "600" },
  floatingDelete: { position: "absolute", right: 12, bottom: 12 },
  deleteFloatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  bottomBar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 8 },
  bottomBtn: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 6 },
  bottomBtnText: { fontSize: 10, fontWeight: "600" },
  bottomPanel: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: 380, zIndex: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  panelTabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4 },
  panelTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  panelTabActive: { borderBottomWidth: 2 },
  panelTabText: { fontSize: 13, fontWeight: "600" },
  closePanel: { paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  panelContent: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 20 },
  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roomTypeBtn: { width: "30%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  roomTypeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  roomTypeName: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  roomTypeDesc: { fontSize: 9, textAlign: "center", lineHeight: 13 },
});
