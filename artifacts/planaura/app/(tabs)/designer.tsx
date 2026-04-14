import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Room } from "@/lib/store";
import { FloorPlanCanvas, ActiveTool } from "@/components/FloorPlanCanvas";
import { RoomPropertiesPanel } from "@/components/RoomPropertiesPanel";
import { VastuPanel } from "@/components/VastuPanel";
import { CostPanel } from "@/components/CostPanel";
import { analyzeVastu } from "@/lib/vastu-engine";

type PanelTab = "properties" | "vastu" | "cost";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; icon: string; shortLabel: string }> = [
  { type: "bedroom", label: "Bedroom", shortLabel: "Bed", icon: "bed-double-outline" },
  { type: "living_room", label: "Living Room", shortLabel: "Living", icon: "sofa-outline" },
  { type: "kitchen", label: "Kitchen", shortLabel: "Kitchen", icon: "chef-hat" },
  { type: "bathroom", label: "Bathroom", shortLabel: "Bath", icon: "shower" },
  { type: "office", label: "Office", shortLabel: "Office", icon: "desk" },
  { type: "dining_room", label: "Dining", shortLabel: "Dining", icon: "silverware-fork-knife" },
];

interface ToolBtnProps {
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  onPress: () => void;
  feather?: boolean;
}

function ToolBtn({ icon, label, active, disabled, color, onPress, feather }: ToolBtnProps) {
  const colors = useColors();
  const bg = active ? colors.primary : colors.card;
  const ic = active ? "#fff" : disabled ? colors.border : (color ?? colors.foreground);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.toolBtn,
        { backgroundColor: bg, borderColor: active ? colors.primary : colors.border, opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
      ]}
    >
      {feather
        ? <Feather name={icon as any} size={17} color={ic} />
        : <MaterialCommunityIcons name={icon as any} size={17} color={ic} />}
    </Pressable>
  );
}

export default function DesignerScreen() {
  const colors = useColors();
  const store = useDesignerStore();
  const insets = useSafeAreaInsets();

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [drawRoomType, setDrawRoomType] = useState<Room["type"]>("bedroom");
  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("properties");
  const [view3D, setView3D] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  React.useEffect(() => {
    if (!store.currentPlan) store.createNewPlan("My Floor Plan");
  }, []);

  const handleRoomSelect = useCallback(
    (roomId: string | null) => {
      store.selectRoom(roomId);
      if (roomId) {
        setPanelTab("properties");
        setShowPanel(true);
        Haptics.selectionAsync();
      } else {
        setShowPanel(false);
      }
    },
    [store]
  );

  const handleRoomDrawn = useCallback(
    (room: Omit<Room, "id">) => {
      store.addRoom(room);
      store.calculateDirections();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      store.selectRoom(null);
    },
    [store]
  );

  const setTool = (t: ActiveTool) => {
    setActiveTool(t);
    if (t !== "select") { store.selectRoom(null); setShowPanel(false); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = () => {
    if (!store.selectedRoomId) return;
    store.deleteRoom(store.selectedRoomId);
    store.selectRoom(null);
    setShowPanel(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleSave = async () => {
    await store.savePlan();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleZoom = (dir: "in" | "out") => {
    store.setZoom(dir === "in" ? store.zoom * 1.3 : store.zoom / 1.3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUndo = () => {
    if (store.canUndo()) { store.undo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };
  const handleRedo = () => {
    if (store.canRedo()) { store.redo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
  };

  const handle3D = () => {
    setView3D(!view3D);
    Alert.alert("3D View", "Full 3D rendering coming soon! Stay tuned.", [{ text: "OK" }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const vastuScore = store.currentPlan ? analyzeVastu(store.currentPlan).score : 0;
  const roomCount = store.currentPlan?.rooms.length ?? 0;
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const hasSelection = !!store.selectedRoomId;

  const scoreColor = vastuScore >= 80 ? "#10B981" : vastuScore >= 50 ? "#F59E0B" : "#EF4444";

  const drawTypeColor = (colors as any)[drawRoomType] || colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 6 }]}>
        <Pressable onPress={() => setShowRenameModal(true)} style={styles.headerName}>
          <Text style={[styles.planName, { color: colors.foreground }]} numberOfLines={1}>
            {store.currentPlan?.name ?? "Floor Plan"}
          </Text>
          <Feather name="edit-2" size={12} color={colors.muted} />
        </Pressable>

        <View style={styles.headerMeta}>
          <Text style={[styles.metaChip, { color: colors.muted }]}>{roomCount} rooms</Text>
          {roomCount > 0 && <Text style={[styles.metaChip, { color: colors.muted }]}>{store.currentPlan?.totalArea} sqft</Text>}
          {vastuScore > 0 && (
            <Text style={[styles.metaChip, { color: scoreColor, fontWeight: "700" }]}>⚡{vastuScore}</Text>
          )}
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="save" size={15} color="#fff" />
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      {/* ── Canvas area ────────────────────────────── */}
      <View style={styles.canvasArea}>
        <FloorPlanCanvas
          activeTool={activeTool}
          drawRoomType={drawRoomType}
          onRoomSelect={handleRoomSelect}
          onRoomDrawn={handleRoomDrawn}
        />

        {/* Left floating toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Tool group */}
          <ToolBtn icon="cursor-default-outline" label="Select" active={activeTool === "select"} onPress={() => setTool("select")} />
          <ToolBtn icon="pencil-outline" label="Draw" active={activeTool === "draw"} onPress={() => setTool("draw")} />
          <ToolBtn icon="hand-back-left-outline" label="Pan" active={activeTool === "pan"} onPress={() => setTool("pan")} />

          <View style={[styles.toolDivider, { backgroundColor: colors.border }]} />

          {/* History */}
          <ToolBtn icon="undo-variant" label="Undo" disabled={!canUndo} onPress={handleUndo} />
          <ToolBtn icon="redo-variant" label="Redo" disabled={!canRedo} onPress={handleRedo} />

          <View style={[styles.toolDivider, { backgroundColor: colors.border }]} />

          {/* Delete */}
          <ToolBtn icon="trash-can-outline" label="Delete" disabled={!hasSelection} color="#EF4444" onPress={handleDelete} />
        </View>

        {/* Room type strip — visible only in draw mode */}
        {activeTool === "draw" && (
          <View style={[styles.roomTypeStrip, { backgroundColor: colors.card + "F0", borderColor: colors.border }]}>
            {ROOM_TYPES.map((rt) => {
              const isActive = drawRoomType === rt.type;
              const c = (colors as any)[rt.type] || colors.primary;
              return (
                <Pressable
                  key={rt.type}
                  onPress={() => { setDrawRoomType(rt.type); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.rtBtn,
                    { backgroundColor: isActive ? c : colors.background, borderColor: isActive ? c : colors.border, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <MaterialCommunityIcons name={rt.icon as any} size={14} color={isActive ? "#fff" : c} />
                  <Text style={[styles.rtBtnText, { color: isActive ? "#fff" : c }]}>{rt.shortLabel}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Draw mode hint */}
        {activeTool === "draw" && (
          <View style={[styles.drawHint, { backgroundColor: drawTypeColor + "DD", borderColor: drawTypeColor }]}>
            <MaterialCommunityIcons name="gesture-tap-hold" size={14} color="#fff" />
            <Text style={styles.drawHintText}>Drag to draw {ROOM_TYPES.find(r => r.type === drawRoomType)?.label}</Text>
          </View>
        )}

        {/* Zoom cluster (right) */}
        <View style={[styles.zoomCluster, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => handleZoom("in")} style={styles.zoomBtn} hitSlop={6}>
            <Feather name="plus" size={15} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.zoomLabel, { color: colors.foreground }]}>{Math.round(store.zoom * 100)}%</Text>
          <Pressable onPress={() => handleZoom("out")} style={styles.zoomBtn} hitSlop={6}>
            <Feather name="minus" size={15} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* ── Bottom status bar ─────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 2 }]}>
        {/* 2D / 3D toggle */}
        <View style={[styles.viewToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Pressable
            onPress={() => { if (view3D) setView3D(false); }}
            style={[styles.viewToggleBtn, !view3D && [styles.viewToggleBtnActive, { backgroundColor: colors.primary }]]}
          >
            <Text style={[styles.viewToggleText, { color: !view3D ? "#fff" : colors.muted }]}>2D</Text>
          </Pressable>
          <Pressable
            onPress={handle3D}
            style={[styles.viewToggleBtn, view3D && [styles.viewToggleBtnActive, { backgroundColor: colors.accent }]]}
          >
            <Text style={[styles.viewToggleText, { color: view3D ? "#fff" : colors.muted }]}>3D</Text>
          </Pressable>
        </View>

        <View style={styles.barSpacer} />

        {/* Vastu button */}
        <Pressable
          onPress={() => { setPanelTab("vastu"); setShowPanel(true); Haptics.selectionAsync(); }}
          style={({ pressed }) => [
            styles.barBtn,
            { backgroundColor: panelTab === "vastu" && showPanel ? colors.primary + "22" : "transparent", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="compass-outline" size={19} color={panelTab === "vastu" && showPanel ? colors.primary : colors.muted} />
          <Text style={[styles.barBtnText, { color: panelTab === "vastu" && showPanel ? colors.primary : colors.muted }]}>Vastu</Text>
        </Pressable>

        {/* Cost button */}
        <Pressable
          onPress={() => { setPanelTab("cost"); setShowPanel(true); Haptics.selectionAsync(); }}
          style={({ pressed }) => [
            styles.barBtn,
            { backgroundColor: panelTab === "cost" && showPanel ? colors.primary + "22" : "transparent", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="currency-inr" size={19} color={panelTab === "cost" && showPanel ? colors.primary : colors.muted} />
          <Text style={[styles.barBtnText, { color: panelTab === "cost" && showPanel ? colors.primary : colors.muted }]}>Cost</Text>
        </Pressable>

        {/* Layers button */}
        <Pressable
          onPress={() => { setPanelTab("properties"); setShowPanel(true); Haptics.selectionAsync(); }}
          style={({ pressed }) => [
            styles.barBtn,
            { backgroundColor: panelTab === "properties" && showPanel ? colors.primary + "22" : "transparent", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="layers" size={19} color={panelTab === "properties" && showPanel ? colors.primary : colors.muted} />
          <Text style={[styles.barBtnText, { color: panelTab === "properties" && showPanel ? colors.primary : colors.muted }]}>Edit</Text>
        </Pressable>
      </View>

      {/* ── Slide-up panel ────────────────────────── */}
      {showPanel && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.panelTabs, { borderBottomColor: colors.border }]}>
            {hasSelection && (
              <Pressable
                onPress={() => setPanelTab("properties")}
                style={[styles.panelTab, panelTab === "properties" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}
              >
                <Text style={[styles.panelTabText, { color: panelTab === "properties" ? colors.primary : colors.muted }]}>Edit Room</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setPanelTab("vastu")}
              style={[styles.panelTab, panelTab === "vastu" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}
            >
              <Text style={[styles.panelTabText, { color: panelTab === "vastu" ? colors.primary : colors.muted }]}>Vastu</Text>
            </Pressable>
            <Pressable
              onPress={() => setPanelTab("cost")}
              style={[styles.panelTab, panelTab === "cost" && [styles.panelTabActive, { borderBottomColor: colors.primary }]]}
            >
              <Text style={[styles.panelTabText, { color: panelTab === "cost" ? colors.primary : colors.muted }]}>Cost</Text>
            </Pressable>
            <Pressable onPress={() => setShowPanel(false)} style={styles.panelClose}>
              <Feather name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            {panelTab === "properties" && <RoomPropertiesPanel onClose={() => setShowPanel(false)} />}
            {panelTab === "vastu" && <VastuPanel />}
            {panelTab === "cost" && <CostPanel />}
          </View>
        </View>
      )}

      {/* ── Rename modal ──────────────────────────── */}
      <RenameModal
        visible={showRenameModal}
        currentName={store.currentPlan?.name ?? ""}
        onClose={() => setShowRenameModal(false)}
        onSave={(name) => {
          if (store.currentPlan) {
            store.updateRoom("__noop__", {}); // trigger re-render
            // Directly set name via loadPlan trick
            store.loadPlan({ ...store.currentPlan, name });
          }
          setShowRenameModal(false);
        }}
      />
    </View>
  );
}

/* ── Rename modal ────────────────────────────── */
import { TextInput } from "react-native";

function RenameModal({ visible, currentName, onClose, onSave }: {
  visible: boolean; currentName: string; onClose: () => void; onSave: (name: string) => void;
}) {
  const colors = useColors();
  const [val, setVal] = React.useState(currentName);
  React.useEffect(() => setVal(currentName), [currentName, visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.renameCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.renameTitle, { color: colors.foreground }]}>Rename Plan</Text>
          <TextInput
            value={val}
            onChangeText={setVal}
            style={[styles.renameInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            autoFocus
            selectTextOnFocus
          />
          <View style={styles.renameActions}>
            <Pressable onPress={onClose} style={[styles.renameBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.renameBtnText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(val.trim() || currentName)} style={[styles.renameBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.renameBtnText, { color: "#fff" }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* header */
  header: {
    paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8,
  },
  headerName: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  planName: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  headerMeta: { flexDirection: "row", gap: 8, alignItems: "center" },
  metaChip: { fontSize: 11 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  /* canvas */
  canvasArea: { flex: 1, position: "relative" },

  /* left toolbar */
  toolbar: {
    position: "absolute", left: 10, top: "30%",
    borderRadius: 16, borderWidth: 1,
    paddingVertical: 6, paddingHorizontal: 5,
    gap: 4, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6, zIndex: 10,
  },
  toolBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  toolDivider: { width: 24, height: 1, marginVertical: 2 },

  /* room type strip */
  roomTypeStrip: {
    position: "absolute", left: 58, top: "30%",
    flexDirection: "column", gap: 4,
    borderRadius: 14, borderWidth: 1,
    paddingVertical: 6, paddingHorizontal: 5,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4, zIndex: 10,
  },
  rtBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 9, borderWidth: 1.5,
  },
  rtBtnText: { fontSize: 11, fontWeight: "700" },

  /* draw hint */
  drawHint: {
    position: "absolute", top: 10, left: "50%", transform: [{ translateX: -80 }],
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  drawHintText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  /* zoom */
  zoomCluster: {
    position: "absolute", right: 10, top: 10,
    borderRadius: 12, borderWidth: 1,
    flexDirection: "column", alignItems: "center",
    paddingVertical: 4, paddingHorizontal: 4, gap: 4,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 4, zIndex: 10,
  },
  zoomBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  zoomLabel: { fontSize: 10, fontWeight: "700" },

  /* bottom bar */
  bottomBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, gap: 4,
  },
  viewToggle: {
    flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden",
  },
  viewToggleBtn: { paddingHorizontal: 12, paddingVertical: 7 },
  viewToggleBtnActive: {},
  viewToggleText: { fontSize: 13, fontWeight: "700" },
  barSpacer: { flex: 1 },
  barBtn: { flexDirection: "column", alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  barBtnText: { fontSize: 10, fontWeight: "600" },

  /* slide-up panel */
  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: 380, zIndex: 20,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: -4 },
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  panelTabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4 },
  panelTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  panelTabActive: { borderBottomWidth: 2 },
  panelTabText: { fontSize: 13, fontWeight: "600" },
  panelClose: { paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" },

  /* overlay / rename */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  renameCard: { width: "100%", borderRadius: 20, padding: 20, gap: 16 },
  renameTitle: { fontSize: 18, fontWeight: "800" },
  renameInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  renameBtnText: { fontSize: 15, fontWeight: "700" },
});
