import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Room } from "@/lib/store";
import { FloorPlanCanvas, ActiveTool } from "@/components/FloorPlanCanvas";
import { RoomPropertiesPanel } from "@/components/RoomPropertiesPanel";
import { VastuPanel } from "@/components/VastuPanel";
import { CostPanel } from "@/components/CostPanel";
import { analyzeVastu } from "@/lib/vastu-engine";
import { ScalePress } from "@/components/ScalePress";

type PanelTab = "properties" | "vastu" | "cost";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; color: string }> = [
  { type: "bedroom",    label: "Bed",     color: "#4F46E5" },
  { type: "living_room",label: "Living",  color: "#7C3AED" },
  { type: "kitchen",    label: "Kitchen", color: "#F97316" },
  { type: "bathroom",   label: "Bath",    color: "#0EA5E9" },
  { type: "office",     label: "Office",  color: "#059669" },
  { type: "dining_room",label: "Dining",  color: "#EC4899" },
];

const PANEL_HEIGHT = 400;

/* ── Toolbar button ────────────────────────────────── */
interface TBtnProps {
  icon: string; active?: boolean; danger?: boolean; disabled?: boolean;
  onPress: () => void; badge?: string;
}
function TBtn({ icon, active, danger, disabled, onPress }: TBtnProps) {
  const colors = useColors();
  const bg = active ? colors.primary : "transparent";
  const iconColor = active ? "#fff" : danger ? colors.destructive : disabled ? colors.muted : colors.foreground;
  return (
    <ScalePress onPress={disabled ? undefined : onPress}
      style={[styles.tBtn, { backgroundColor: bg }]} scale={0.88} disabled={disabled}>
      <Feather name={icon as any} size={18} color={iconColor} style={{ opacity: disabled ? 0.3 : 1 }} />
    </ScalePress>
  );
}

function TDivider() {
  const colors = useColors();
  return <View style={[styles.tDivider, { backgroundColor: colors.border }]} />;
}

/* ── Rename modal ──────────────────────────────────── */
function RenameModal({ visible, currentName, onClose, onSave }: {
  visible: boolean; currentName: string; onClose: () => void; onSave: (n: string) => void;
}) {
  const colors = useColors();
  const [val, setVal] = React.useState(currentName);
  React.useEffect(() => setVal(currentName), [currentName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.renameSheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.renameTitle, { color: colors.foreground }]}>Rename Plan</Text>
          <TextInput
            value={val} onChangeText={setVal}
            style={[styles.renameInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
            autoFocus selectTextOnFocus returnKeyType="done"
            onSubmitEditing={() => onSave(val.trim() || currentName)}
          />
          <View style={styles.renameActions}>
            <ScalePress onPress={onClose} style={[styles.renameBtn, { backgroundColor: colors.mutedBg }]}>
              <Text style={[styles.renameBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </ScalePress>
            <ScalePress onPress={() => onSave(val.trim() || currentName)}
              style={[styles.renameBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.renameBtnText, { color: "#fff" }]}>Save</Text>
            </ScalePress>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ── Main screen ───────────────────────────────────── */
export default function DesignerScreen() {
  const colors = useColors();
  const store = useDesignerStore();
  const insets = useSafeAreaInsets();

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [drawRoomType, setDrawRoomType] = useState<Room["type"]>("bedroom");
  const [showGrid, setShowGrid] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("properties");
  const [showRename, setShowRename] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  /* ── Panel slide animation ─────────────────────────── */
  const panelAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  const openPanel = useCallback(() => {
    setPanelMounted(true);
    panelAnim.setValue(PANEL_HEIGHT);
    panelOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(panelAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: true }),
      Animated.timing(panelOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setShowPanel(true);
  }, [panelAnim, panelOpacity]);

  const closePanel = useCallback(() => {
    Animated.parallel([
      Animated.timing(panelAnim, { toValue: PANEL_HEIGHT, duration: 230, useNativeDriver: true }),
      Animated.timing(panelOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setPanelMounted(false);
      setShowPanel(false);
    });
  }, [panelAnim, panelOpacity]);

  React.useEffect(() => {
    if (!store.currentPlan) store.createNewPlan("My Floor Plan");
  }, []);

  const handleRoomSelect = useCallback((roomId: string | null) => {
    store.selectRoom(roomId);
    if (roomId) {
      setPanelTab("properties");
      openPanel();
      Haptics.selectionAsync();
    } else {
      closePanel();
    }
  }, [store, openPanel, closePanel]);

  const handleRoomDrawn = useCallback((room: Omit<Room, "id">) => {
    store.addRoom(room);
    store.calculateDirections();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    store.selectRoom(null);
  }, [store]);

  const setTool = (t: ActiveTool) => {
    setActiveTool(t);
    if (t !== "select") { store.selectRoom(null); closePanel(); }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = () => {
    if (!store.selectedRoomId) return;
    store.deleteRoom(store.selectedRoomId);
    store.selectRoom(null);
    closePanel();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleSave = async () => {
    await store.savePlan();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleZoom = (dir: "in" | "out") => {
    store.setZoom(dir === "in" ? store.zoom * 1.3 : store.zoom / 1.3);
  };

  const openPanelOnTab = (tab: PanelTab) => {
    setPanelTab(tab);
    if (!showPanel) openPanel();
    Haptics.selectionAsync();
  };

  const vastuScore = store.currentPlan ? analyzeVastu(store.currentPlan).score : 0;
  const roomCount = store.currentPlan?.rooms.length ?? 0;
  const canUndo = store.canUndo();
  const canRedo = store.canRedo();
  const hasSelection = !!store.selectedRoomId;
  const scoreColor = vastuScore >= 80 ? "#10B981" : vastuScore >= 50 ? "#F59E0B" : "#EF4444";
  const activeRoomColor = ROOM_TYPES.find((r) => r.type === drawRoomType)?.color ?? colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 6 }]}>
        <ScalePress onPress={() => setShowRename(true)} style={styles.planNameBtn} scale={0.98}>
          <Text style={[styles.planName, { color: colors.foreground }]} numberOfLines={1}>
            {store.currentPlan?.name ?? "Floor Plan"}
          </Text>
          <Feather name="edit-2" size={11} color={colors.muted} />
        </ScalePress>

        <View style={styles.headerMeta}>
          {roomCount > 0 && (
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {roomCount}rm · {store.currentPlan?.totalArea}sqft
            </Text>
          )}
          {vastuScore > 0 && (
            <View style={[styles.scorePill, { backgroundColor: scoreColor + "18" }]}>
              <Feather name="compass" size={10} color={scoreColor} />
              <Text style={[styles.scorePillText, { color: scoreColor }]}>{vastuScore}</Text>
            </View>
          )}
        </View>

        <ScalePress onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Feather name="save" size={14} color="#fff" />
          <Text style={styles.saveBtnText}>Save</Text>
        </ScalePress>
      </View>

      {/* ── Canvas area ─────────────────────────── */}
      <View style={styles.canvasArea}>
        <FloorPlanCanvas
          activeTool={activeTool}
          drawRoomType={drawRoomType}
          showGrid={showGrid}
          onRoomSelect={handleRoomSelect}
          onRoomDrawn={handleRoomDrawn}
        />

        {/* Floating left toolbar */}
        <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TBtn icon="mouse-pointer" active={activeTool === "select"} onPress={() => setTool("select")} />
          <TBtn icon="edit-2"        active={activeTool === "draw"}   onPress={() => setTool("draw")} />
          <TBtn icon="move"          active={activeTool === "pan"}    onPress={() => setTool("pan")} />
          <TDivider />
          <TBtn icon="rotate-ccw" disabled={!canUndo}
            onPress={() => { if (canUndo) { store.undo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }} />
          <TBtn icon="rotate-cw" disabled={!canRedo}
            onPress={() => { if (canRedo) { store.redo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }} />
          <TDivider />
          <TBtn icon="trash-2" danger disabled={!hasSelection} onPress={handleDelete} />
          <TDivider />
          <TBtn icon="grid" active={showGrid} onPress={() => { setShowGrid(!showGrid); Haptics.selectionAsync(); }} />
        </View>

        {/* Draw room type strip */}
        {activeTool === "draw" && (
          <View style={[styles.roomStrip, { backgroundColor: colors.card + "F5", borderColor: colors.border }]}>
            {ROOM_TYPES.map((rt) => {
              const isActive = drawRoomType === rt.type;
              return (
                <ScalePress key={rt.type}
                  onPress={() => { setDrawRoomType(rt.type); Haptics.selectionAsync(); }}
                  style={[styles.roomBtn, { backgroundColor: isActive ? rt.color : colors.mutedBg, borderColor: isActive ? rt.color : "transparent" }]}
                  scale={0.91}>
                  <Text style={[styles.roomBtnText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{rt.label}</Text>
                </ScalePress>
              );
            })}
          </View>
        )}

        {/* Draw hint pill */}
        {activeTool === "draw" && (
          <View style={[styles.hintPill, { backgroundColor: activeRoomColor }]}>
            <Feather name="crosshair" size={12} color="#fff" />
            <Text style={styles.hintText}>Drag to draw {ROOM_TYPES.find((r) => r.type === drawRoomType)?.label}</Text>
          </View>
        )}

        {/* Zoom cluster */}
        <View style={[styles.zoomCluster, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScalePress onPress={() => handleZoom("in")} style={styles.zoomBtn} scale={0.88}>
            <Feather name="plus" size={14} color={colors.foreground} />
          </ScalePress>
          <Text style={[styles.zoomPct, { color: colors.mutedForeground }]}>{Math.round(store.zoom * 100)}%</Text>
          <ScalePress onPress={() => handleZoom("out")} style={styles.zoomBtn} scale={0.88}>
            <Feather name="minus" size={14} color={colors.foreground} />
          </ScalePress>
        </View>
      </View>

      {/* ── Bottom bar ──────────────────────────── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 2 }]}>
        <View style={[styles.viewToggle, { backgroundColor: colors.mutedBg }]}>
          <View style={[styles.viewBtn, styles.viewBtnActive, { backgroundColor: colors.primary }]}>
            <Text style={[styles.viewBtnText, { color: "#fff" }]}>2D</Text>
          </View>
          <ScalePress
            onPress={() => Alert.alert("3D View", "Full 3D rendering is coming in a future update.", [{ text: "OK" }])}
            style={styles.viewBtn} scale={0.93}>
            <Text style={[styles.viewBtnText, { color: colors.mutedForeground }]}>3D</Text>
          </ScalePress>
        </View>

        <View style={styles.barRight}>
          <ScalePress
            onPress={() => openPanelOnTab("vastu")}
            style={[styles.barBtn, panelTab === "vastu" && showPanel ? { backgroundColor: colors.primaryMuted } : {}]}
            scale={0.93}>
            <Feather name="compass" size={18} color={panelTab === "vastu" && showPanel ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.barBtnText, { color: panelTab === "vastu" && showPanel ? colors.primary : colors.mutedForeground }]}>Vastu</Text>
          </ScalePress>

          <ScalePress
            onPress={() => openPanelOnTab("cost")}
            style={[styles.barBtn, panelTab === "cost" && showPanel ? { backgroundColor: colors.primaryMuted } : {}]}
            scale={0.93}>
            <Feather name="trending-up" size={18} color={panelTab === "cost" && showPanel ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.barBtnText, { color: panelTab === "cost" && showPanel ? colors.primary : colors.mutedForeground }]}>Cost</Text>
          </ScalePress>

          {hasSelection && (
            <ScalePress
              onPress={() => openPanelOnTab("properties")}
              style={[styles.barBtn, panelTab === "properties" && showPanel ? { backgroundColor: colors.primaryMuted } : {}]}
              scale={0.93}>
              <Feather name="sliders" size={18} color={panelTab === "properties" && showPanel ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.barBtnText, { color: panelTab === "properties" && showPanel ? colors.primary : colors.mutedForeground }]}>Edit</Text>
            </ScalePress>
          )}
        </View>
      </View>

      {/* ── Animated slide-up panel ─────────────── */}
      {panelMounted && (
        <Animated.View
          pointerEvents={showPanel ? "auto" : "none"}
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderTopColor: colors.border },
            { transform: [{ translateY: panelAnim }], opacity: panelOpacity },
          ]}
        >
          <View style={[styles.panelHandle, { backgroundColor: colors.borderStrong }]} />

          <View style={[styles.panelTabs, { borderBottomColor: colors.border }]}>
            {hasSelection && (
              <ScalePress onPress={() => setPanelTab("properties")} scale={0.96}
                style={[styles.pTab, panelTab === "properties" && [styles.pTabActive, { borderBottomColor: colors.primary }]]}>
                <Text style={[styles.pTabText, { color: panelTab === "properties" ? colors.primary : colors.mutedForeground }]}>Edit Room</Text>
              </ScalePress>
            )}
            <ScalePress onPress={() => setPanelTab("vastu")} scale={0.96}
              style={[styles.pTab, panelTab === "vastu" && [styles.pTabActive, { borderBottomColor: colors.primary }]]}>
              <Text style={[styles.pTabText, { color: panelTab === "vastu" ? colors.primary : colors.mutedForeground }]}>Vastu</Text>
            </ScalePress>
            <ScalePress onPress={() => setPanelTab("cost")} scale={0.96}
              style={[styles.pTab, panelTab === "cost" && [styles.pTabActive, { borderBottomColor: colors.primary }]]}>
              <Text style={[styles.pTabText, { color: panelTab === "cost" ? colors.primary : colors.mutedForeground }]}>Cost</Text>
            </ScalePress>
            <ScalePress onPress={closePanel} style={styles.pClose} scale={0.9}>
              <Feather name="chevron-down" size={18} color={colors.muted} />
            </ScalePress>
          </View>

          <View style={{ flex: 1 }}>
            {panelTab === "properties" && <RoomPropertiesPanel onClose={closePanel} />}
            {panelTab === "vastu" && <VastuPanel />}
            {panelTab === "cost" && <CostPanel />}
          </View>
        </Animated.View>
      )}

      {/* ── Rename modal ────────────────────────── */}
      <RenameModal
        visible={showRename}
        currentName={store.currentPlan?.name ?? ""}
        onClose={() => setShowRename(false)}
        onSave={(name) => {
          if (store.currentPlan) store.loadPlan({ ...store.currentPlan, name });
          setShowRename(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, gap: 8,
  },
  planNameBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  planName: { fontSize: 16, fontWeight: "700", flexShrink: 1, letterSpacing: -0.2 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12 },
  scorePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  scorePillText: { fontSize: 12, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    shadowColor: "#4F46E5", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  canvasArea: { flex: 1, position: "relative" },

  toolbar: {
    position: "absolute", left: 10, top: "25%",
    borderRadius: 18, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 6,
    alignItems: "center", gap: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
    zIndex: 10,
  },
  tBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tDivider: { width: 26, height: 1, marginVertical: 4 },

  roomStrip: {
    position: "absolute", left: 62, top: "25%",
    borderRadius: 16, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 6,
    gap: 5, alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    zIndex: 10,
  },
  roomBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5 },
  roomBtnText: { fontSize: 12, fontWeight: "700" },

  hintPill: {
    position: "absolute", top: 10, alignSelf: "center",
    left: "50%", transform: [{ translateX: -70 }],
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    zIndex: 10,
  },
  hintText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  zoomCluster: {
    position: "absolute", right: 10, top: 12,
    borderRadius: 14, borderWidth: 1, paddingVertical: 5, paddingHorizontal: 4,
    alignItems: "center", gap: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
    zIndex: 10,
  },
  zoomBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  zoomPct: { fontSize: 10, fontWeight: "700" },

  bottomBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, gap: 8,
  },
  viewToggle: { flexDirection: "row", borderRadius: 11, padding: 3, overflow: "hidden", gap: 2 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  viewBtnActive: {},
  viewBtnText: { fontSize: 13, fontWeight: "700" },
  barRight: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 4 },
  barBtn: { flexDirection: "column", alignItems: "center", gap: 2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  barBtnText: { fontSize: 10, fontWeight: "600" },

  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: PANEL_HEIGHT, zIndex: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 16,
  },
  panelHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  panelTabs: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 4 },
  pTab: { flex: 1, paddingVertical: 11, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  pTabActive: { borderBottomWidth: 2 },
  pTabText: { fontSize: 13, fontWeight: "600" },
  pClose: { paddingHorizontal: 14, paddingVertical: 11, alignItems: "center", justifyContent: "center" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  renameSheet: { width: "100%", borderRadius: 20, padding: 20, gap: 16 },
  renameTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  renameInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  renameBtnText: { fontSize: 15, fontWeight: "700" },
});
