import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Platform, Alert,
  Animated, TextInput, Modal, ScrollView, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDesignerStore, Room } from "@/lib/store";
import { FloorPlanCanvas, ActiveTool } from "@/components/FloorPlanCanvas";
import { SketchCanvas } from "@/components/SketchCanvas";
import { RoomPropertiesPanel } from "@/components/RoomPropertiesPanel";
import { VastuPanel } from "@/components/VastuPanel";
import { CostPanel } from "@/components/CostPanel";
import { VastuAIChat } from "@/components/VastuAIChat";
import { ExportButton } from "@/components/ExportButton";
import { analyzeVastu } from "@/lib/vastu-engine";
import { ScalePress } from "@/components/ScalePress";
import { useToast } from "@/components/Toast";

type PanelTab = "properties" | "vastu" | "cost" | "ai";
type DesignerMode = "rooms" | "sketch";
const PANEL_HEIGHT = 420;

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; color: string }> = [
  { type: "bedroom",     label: "Bed",     color: "#A5B4FC" },
  { type: "living_room", label: "Living",  color: "#7DD3FC" },
  { type: "kitchen",     label: "Kitchen", color: "#FDBA74" },
  { type: "bathroom",    label: "Bath",    color: "#6EE7B7" },
  { type: "office",      label: "Office",  color: "#C4B5FD" },
  { type: "dining_room", label: "Dining",  color: "#FDE68A" },
];

const SKETCH_COLORS = ["#38BDF8","#FFFFFF","#818CF8","#A5B4FC","#6EE7B7","#FDBA74","#FDE68A","#FB7185"];
const SKETCH_SIZES = [2, 4, 8, 14];

/* ── Toolbar button ── */
function TBtn({ icon, active, danger, disabled, onPress, color }: {
  icon: string; active?: boolean; danger?: boolean; disabled?: boolean;
  onPress: () => void; color?: string;
}) {
  const colors = useColors();
  const bg = active ? (color ?? colors.primary) : "transparent";
  const iconColor = active ? "#fff" : danger ? colors.destructive : disabled ? colors.muted : colors.foreground;
  return (
    <ScalePress onPress={disabled ? undefined : onPress}
      style={[styles.tBtn, { backgroundColor: bg }]}
      scale={0.88} disabled={disabled}>
      <Feather name={icon as any} size={17} color={iconColor} style={{ opacity: disabled ? 0.3 : 1 }} />
    </ScalePress>
  );
}

function TDivider() {
  const colors = useColors();
  return <View style={[styles.tDivider, { backgroundColor: colors.border }]} />;
}

/* ── Rename modal ── */
function RenameModal({ visible, currentName, onClose, onSave }: {
  visible: boolean; currentName: string; onClose: () => void; onSave: (n: string) => void;
}) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const [val, setVal] = React.useState(currentName);
  React.useEffect(() => setVal(currentName), [currentName, visible]);

  const Sheet = isIOS ? (
    <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={[styles.renameSheet, { borderColor: colors.border }]}>
      <RenameContent val={val} setVal={setVal} colors={colors} onClose={onClose}
        onSave={onSave} currentName={currentName} />
    </BlurView>
  ) : (
    <View style={[styles.renameSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <RenameContent val={val} setVal={setVal} colors={colors} onClose={onClose}
        onSave={onSave} currentName={currentName} />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>{Sheet}</View>
    </Modal>
  );
}

function RenameContent({ val, setVal, colors, onClose, onSave, currentName }: any) {
  return (
    <>
      <View style={styles.renameHandle} />
      <Text style={[styles.renameTitle, { color: colors.foreground }]}>Rename Plan</Text>
      <TextInput
        value={val} onChangeText={setVal}
        style={[styles.renameInput, { color: colors.foreground, backgroundColor: colors.mutedBg, borderColor: colors.border }]}
        autoFocus selectTextOnFocus returnKeyType="done"
        onSubmitEditing={() => onSave(val.trim() || currentName)}
        placeholderTextColor={colors.muted}
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
    </>
  );
}

/* ── Main screen ── */
export default function DesignerScreen() {
  const colors = useColors();
  const store = useDesignerStore();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const toast = useToast();

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const canvasViewRef = useRef<View>(null);
  const [drawRoomType, setDrawRoomType] = useState<Room["type"]>("bedroom");
  const [showGrid, setShowGrid] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("properties");
  const [showRename, setShowRename] = useState(false);
  // Designer mode
  const [designerMode, setDesignerMode] = useState<DesignerMode>("rooms");
  const [sketchColor, setSketchColor] = useState("#38BDF8");
  const [sketchSize, setSketchSize] = useState(4);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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
    ]).start(() => { setPanelMounted(false); setShowPanel(false); });
  }, [panelAnim, panelOpacity]);

  useEffect(() => {
    if (!store.currentPlan) store.createNewPlan("My Floor Plan");
  }, []);

  const handleRoomSelect = useCallback((roomId: string | null) => {
    store.selectRoom(roomId);
    if (roomId) { setPanelTab("properties"); openPanel(); Haptics.selectionAsync(); }
    else closePanel();
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
    toast.show("Room deleted", "info");
  };

  const handleSave = async () => {
    await store.savePlan();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show("Plan saved", "success");
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
  const scoreColor = vastuScore >= 80 ? "#16A34A" : vastuScore >= 50 ? "#D97706" : "#DC2626";
  const activeRoomColor = ROOM_TYPES.find((r) => r.type === drawRoomType)?.color ?? colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      {isIOS ? (
        <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"}
          style={[styles.header, { borderBottomColor: colors.border, paddingTop: topPad + 6 }]}>
          <HeaderContent store={store} colors={colors} vastuScore={vastuScore}
            scoreColor={scoreColor} roomCount={roomCount}
            onRename={() => setShowRename(true)} onSave={handleSave}
            canvasViewRef={canvasViewRef} />
        </BlurView>
      ) : (
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 6 }]}>
          <HeaderContent store={store} colors={colors} vastuScore={vastuScore}
            scoreColor={scoreColor} roomCount={roomCount}
            onRename={() => setShowRename(true)} onSave={handleSave}
            canvasViewRef={canvasViewRef} />
        </View>
      )}

      {/* ── Canvas ── */}
      <View style={styles.canvasArea}>
        {designerMode === "sketch" ? (
          <SketchCanvas showGrid={showGrid} canvasRef={canvasViewRef} />
        ) : (
          <>
            <FloorPlanCanvas
              activeTool={activeTool} drawRoomType={drawRoomType}
              showGrid={showGrid} onRoomSelect={handleRoomSelect} onRoomDrawn={handleRoomDrawn}
              canvasRef={canvasViewRef}
              sketchColor={sketchColor}
              sketchSize={sketchSize}
            />

            {/* Floating toolbar — rooms mode only */}
            {isIOS ? (
              <BlurView intensity={70} tint={isDark ? "dark" : "extraLight"}
                style={[styles.toolbar, { borderColor: colors.glassBorder }]}>
                <ToolbarContent activeTool={activeTool} canUndo={canUndo} canRedo={canRedo}
                  hasSelection={hasSelection} showGrid={showGrid} store={store}
                  setTool={setTool} handleDelete={handleDelete} setShowGrid={setShowGrid}
                  designerMode={designerMode} sketchColor={sketchColor} setSketchColor={setSketchColor}
                  sketchSize={sketchSize} setSketchSize={setSketchSize} />
              </BlurView>
            ) : (
              <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ToolbarContent activeTool={activeTool} canUndo={canUndo} canRedo={canRedo}
                  hasSelection={hasSelection} showGrid={showGrid} store={store}
                  setTool={setTool} handleDelete={handleDelete} setShowGrid={setShowGrid}
                  designerMode={designerMode} sketchColor={sketchColor} setSketchColor={setSketchColor}
                  sketchSize={sketchSize} setSketchSize={setSketchSize} />
              </View>
            )}

            {/* Room type strip */}
            {activeTool === "draw" && (
              <View style={[styles.roomStrip, { backgroundColor: colors.card + "F5", borderColor: colors.border }]}>
                {ROOM_TYPES.map((rt) => {
                  const isActive = drawRoomType === rt.type;
                  return (
                    <ScalePress key={rt.type}
                      onPress={() => { setDrawRoomType(rt.type); Haptics.selectionAsync(); }}
                      style={[styles.roomBtn, {
                        backgroundColor: isActive ? rt.color : colors.mutedBg,
                        borderColor: isActive ? rt.color : "transparent",
                      }]} scale={0.91}>
                      <Text style={[styles.roomBtnText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                        {rt.label}
                      </Text>
                    </ScalePress>
                  );
                })}
              </View>
            )}

            {/* Draw hint */}
            {activeTool === "draw" && (
              <View style={[styles.hintPill, { backgroundColor: activeRoomColor }]}>
                <Feather name="crosshair" size={11} color="#fff" />
                <Text style={styles.hintText}>
                  Drag to draw {ROOM_TYPES.find((r) => r.type === drawRoomType)?.label}
                </Text>
              </View>
            )}

            {/* Zoom cluster */}
            {isIOS ? (
              <BlurView intensity={70} tint={isDark ? "dark" : "extraLight"}
                style={[styles.zoomCluster, { borderColor: colors.glassBorder }]}>
                <ZoomContent store={store} colors={colors} />
              </BlurView>
            ) : (
              <View style={[styles.zoomCluster, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ZoomContent store={store} colors={colors} />
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Bottom bar ── */}
      {isIOS ? (
        <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"}
          style={[styles.bottomBar, { borderTopColor: colors.border, paddingBottom: botPad + 2 }]}>
          <BottomBarContent showPanel={showPanel} panelTab={panelTab} hasSelection={hasSelection}
            colors={colors} openPanelOnTab={openPanelOnTab}
            designerMode={designerMode} setDesignerMode={(m: DesignerMode) => {
              setDesignerMode(m);
              if (m === "sketch") setActiveTool("sketch");
              else setActiveTool("select");
              Haptics.selectionAsync();
            }} />
        </BlurView>
      ) : (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad + 2 }]}>
          <BottomBarContent showPanel={showPanel} panelTab={panelTab} hasSelection={hasSelection}
            colors={colors} openPanelOnTab={openPanelOnTab}
            designerMode={designerMode} setDesignerMode={(m: DesignerMode) => {
              setDesignerMode(m);
              if (m === "sketch") setActiveTool("sketch");
              else setActiveTool("select");
              Haptics.selectionAsync();
            }} />
        </View>
      )}

      {/* ── Slide-up panel ── */}
      {panelMounted && (
        <Animated.View
          pointerEvents={showPanel ? "auto" : "none"}
          style={[
            styles.panel,
            { borderTopColor: colors.border },
            { transform: [{ translateY: panelAnim }], opacity: panelOpacity },
          ]}
        >
          {isIOS ? (
            <BlurView intensity={90} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          )}
          <View style={styles.panelInner}>
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
              <ScalePress onPress={() => setPanelTab("ai")} scale={0.96}
                style={[styles.pTab, panelTab === "ai" && [styles.pTabActive, { borderBottomColor: colors.primary }]]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="cpu" size={11} color={panelTab === "ai" ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.pTabText, { color: panelTab === "ai" ? colors.primary : colors.mutedForeground }]}>AI</Text>
                </View>
              </ScalePress>
              <ScalePress onPress={closePanel} style={styles.pClose} scale={0.9}>
                <Feather name="chevron-down" size={18} color={colors.muted} />
              </ScalePress>
            </View>
            <View style={{ flex: 1 }}>
              {panelTab === "properties" && <RoomPropertiesPanel onClose={closePanel} />}
              {panelTab === "vastu" && <VastuPanel />}
              {panelTab === "cost" && <CostPanel />}
              {panelTab === "ai" && <VastuAIChat />}
            </View>
          </View>
        </Animated.View>
      )}

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

/* ── Sub-components ── */
function HeaderContent({ store, colors, vastuScore, scoreColor, roomCount, onRename, onSave, canvasViewRef }: any) {
  return (
    <>
      <ScalePress onPress={onRename} style={styles.planNameBtn} scale={0.98}>
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
      <ExportButton canvasViewRef={canvasViewRef} planName={store.currentPlan?.name ?? "Floor Plan"}
        onSuccess={() => toast.show("Export successful", "success")} />
      <ScalePress onPress={onSave} scale={0.96}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.saveBtn}>
          <Feather name="save" size={13} color="#fff" />
          <Text style={styles.saveBtnText}>Save</Text>
        </LinearGradient>
      </ScalePress>
    </>
  );
}

function ToolbarContent({ activeTool, canUndo, canRedo, hasSelection, showGrid, store, setTool, handleDelete, setShowGrid, designerMode, sketchColor, setSketchColor, sketchSize, setSketchSize }: any) {
  const colors = useColors();

  if (designerMode === "sketch") {
    return (
      <>
        {/* Sketch tools */}
        <TBtn icon="pen-tool" active={activeTool === "sketch"} onPress={() => setTool("sketch")} color={sketchColor} />
        <TBtn icon="minus" active={activeTool === "line"} onPress={() => setTool("line")} color={sketchColor} />
        <TBtn icon="delete" active={activeTool === "eraser"} onPress={() => setTool("eraser")} />
        <TDivider />
        {/* Brush sizes */}
        {[2, 4, 8, 14].map((s) => (
          <ScalePress key={s} onPress={() => { setSketchSize(s); Haptics.selectionAsync(); }}
            style={[styles.tBtn, sketchSize === s && { backgroundColor: sketchColor + "30", borderWidth: 1.5, borderColor: sketchColor }]}
            scale={0.88}>
            <View style={{
              width: Math.min(s * 1.4, 16), height: Math.min(s * 1.4, 16),
              borderRadius: 10, backgroundColor: sketchColor,
            }} />
          </ScalePress>
        ))}
        <TDivider />
        {/* Colors */}
        {SKETCH_COLORS.slice(0, 4).map((c) => (
          <ScalePress key={c} onPress={() => { setSketchColor(c); Haptics.selectionAsync(); }}
            style={[styles.colorDot, { backgroundColor: c, borderWidth: sketchColor === c ? 2 : 0, borderColor: "#fff" }]}
            scale={0.88} />
        ))}
        <TDivider />
        <TBtn icon="corner-left-up" onPress={() => { store.clearSketches(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} />
        <TBtn icon="grid" active={showGrid} onPress={() => { setShowGrid(!showGrid); Haptics.selectionAsync(); }} />
      </>
    );
  }

  // Rooms mode
  return (
    <>
      <TBtn icon="mouse-pointer" active={activeTool === "select"} onPress={() => setTool("select")} />
      <TBtn icon="edit-2" active={activeTool === "draw"} onPress={() => setTool("draw")} />
      <TBtn icon="move" active={activeTool === "pan"} onPress={() => setTool("pan")} />
      <TDivider />
      <TBtn icon="rotate-ccw" disabled={!canUndo}
        onPress={() => { if (canUndo) { store.undo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }} />
      <TBtn icon="rotate-cw" disabled={!canRedo}
        onPress={() => { if (canRedo) { store.redo(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }} />
      <TDivider />
      <TBtn icon="trash-2" danger disabled={!hasSelection} onPress={handleDelete} />
      <TDivider />
      <TBtn icon="grid" active={showGrid} onPress={() => { setShowGrid(!showGrid); Haptics.selectionAsync(); }} />
    </>
  );
}

function ZoomContent({ store, colors }: any) {
  return (
    <>
      <ScalePress onPress={() => store.setZoom(store.zoom * 1.3)} style={styles.zoomBtn} scale={0.88}>
        <Feather name="plus" size={14} color={colors.foreground} />
      </ScalePress>
      <Text style={[styles.zoomPct, { color: colors.mutedForeground }]}>{Math.round(store.zoom * 100)}%</Text>
      <ScalePress onPress={() => store.setZoom(store.zoom / 1.3)} style={styles.zoomBtn} scale={0.88}>
        <Feather name="minus" size={14} color={colors.foreground} />
      </ScalePress>
    </>
  );
}

function BottomBarContent({ showPanel, panelTab, hasSelection, colors, openPanelOnTab, designerMode, setDesignerMode }: any) {
  const vastuActive = panelTab === "vastu" && showPanel;
  const costActive = panelTab === "cost" && showPanel;
  const propActive = panelTab === "properties" && showPanel;
  return (
    <>
      {/* Mode toggle — Rooms / Sketch */}
      <View style={[styles.viewToggle, { backgroundColor: colors.mutedBg }]}>
        <ScalePress onPress={() => setDesignerMode("rooms")}
          style={[styles.viewBtn, designerMode === "rooms" && { backgroundColor: colors.primary }]} scale={0.93}>
          <Text style={[styles.viewBtnText, { color: designerMode === "rooms" ? "#fff" : colors.mutedForeground }]}>Rooms</Text>
        </ScalePress>
        <ScalePress onPress={() => setDesignerMode("sketch")}
          style={[styles.viewBtn, designerMode === "sketch" && { backgroundColor: colors.primary }]} scale={0.93}>
          <Text style={[styles.viewBtnText, { color: designerMode === "sketch" ? "#fff" : colors.mutedForeground }]}>Sketch</Text>
        </ScalePress>
      </View>

      {/* Right side — analysis buttons (only in rooms mode) */}
      {designerMode === "rooms" && (
        <View style={styles.barRight}>
          <ScalePress onPress={() => openPanelOnTab("vastu")}
            style={[styles.barBtn, vastuActive && { backgroundColor: colors.primaryMuted }]} scale={0.93}>
            <Feather name="compass" size={18} color={vastuActive ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.barBtnText, { color: vastuActive ? colors.primary : colors.mutedForeground }]}>Vastu</Text>
          </ScalePress>
          <ScalePress onPress={() => openPanelOnTab("cost")}
            style={[styles.barBtn, costActive && { backgroundColor: colors.primaryMuted }]} scale={0.93}>
            <Feather name="trending-up" size={18} color={costActive ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.barBtnText, { color: costActive ? colors.primary : colors.mutedForeground }]}>Cost</Text>
          </ScalePress>
          <ScalePress onPress={() => openPanelOnTab("ai")}
            style={[styles.barBtn, (panelTab === "ai" && showPanel) && { backgroundColor: colors.primaryMuted }]} scale={0.93}>
            <Feather name="cpu" size={18} color={(panelTab === "ai" && showPanel) ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.barBtnText, { color: (panelTab === "ai" && showPanel) ? colors.primary : colors.mutedForeground }]}>AI</Text>
          </ScalePress>
          {hasSelection && (
            <ScalePress onPress={() => openPanelOnTab("properties")}
              style={[styles.barBtn, propActive && { backgroundColor: colors.primaryMuted }]} scale={0.93}>
              <Feather name="sliders" size={18} color={propActive ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.barBtnText, { color: propActive ? colors.primary : colors.mutedForeground }]}>Edit</Text>
            </ScalePress>
          )}
        </View>
      )}

      {/* Sketch mode — remaining colors in bottom bar */}
      {designerMode === "sketch" && (
        <View style={styles.barRight}>
          {SKETCH_COLORS.slice(4).map((c) => (
            <View key={c} style={[styles.colorDotBar, { backgroundColor: c }]} />
          ))}
          <Text style={[styles.barBtnText, { color: colors.mutedForeground, marginLeft: 8 }]}>
            Tap color in toolbar
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  planNameBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
  planName: { fontSize: 16, fontWeight: "700", flexShrink: 1, letterSpacing: -0.3 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12 },
  scorePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  scorePillText: { fontSize: 12, fontWeight: "700" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14,
    shadowColor: "#38BDF8", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  canvasArea: { flex: 1, position: "relative" },

  toolbar: {
    position: "absolute", left: 10, top: "22%",
    borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, paddingHorizontal: 6,
    alignItems: "center", gap: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
    zIndex: 10, overflow: "hidden",
  },
  tBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tDivider: { width: 26, height: StyleSheet.hairlineWidth, marginVertical: 4 },

  roomStrip: {
    position: "absolute", left: 62, top: "22%",
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, paddingHorizontal: 6,
    gap: 5, alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, zIndex: 10,
  },
  roomBtn: {
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1.5,
  },
  roomBtnText: { fontSize: 12, fontWeight: "700" },

  hintPill: {
    position: "absolute", top: 10, alignSelf: "center",
    left: "50%", transform: [{ translateX: -70 }],
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, zIndex: 10,
  },
  hintText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  zoomCluster: {
    position: "absolute", right: 10, top: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 5, paddingHorizontal: 4,
    alignItems: "center", gap: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, zIndex: 10,
    overflow: "hidden",
  },
  zoomBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  zoomPct: { fontSize: 10, fontWeight: "700" },

  bottomBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  viewToggle: { flexDirection: "row", borderRadius: 11, padding: 3, overflow: "hidden", gap: 2 },
  viewBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  viewBtnText: { fontSize: 13, fontWeight: "700" },
  barRight: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: 4 },
  barBtn: {
    flexDirection: "column", alignItems: "center", gap: 2,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  barBtnText: { fontSize: 10, fontWeight: "600" },

  panel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: PANEL_HEIGHT, zIndex: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 16,
    overflow: "hidden",
  },
  panelInner: { flex: 1 },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 2,
  },
  panelTabs: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4,
  },
  pTab: {
    flex: 1, paddingVertical: 11, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  pTabActive: { borderBottomWidth: 2 },
  pTabText: { fontSize: 13, fontWeight: "600" },
  pClose: { paddingHorizontal: 14, paddingVertical: 11, alignItems: "center", justifyContent: "center" },

  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  renameSheet: {
    width: "100%", borderRadius: 24, padding: 20, gap: 16,
    borderWidth: StyleSheet.hairlineWidth, overflow: "hidden",
  },
  renameHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#D4D4D4", alignSelf: "center", marginBottom: 4,
  },
  renameTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  renameInput: {
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  renameActions: { flexDirection: "row", gap: 10 },
  renameBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  renameBtnText: { fontSize: 15, fontWeight: "700" },
  colorDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 0, borderColor: "#fff",
  },
  colorDotBar: {
    width: 18, height: 18, borderRadius: 9,
  },
});
