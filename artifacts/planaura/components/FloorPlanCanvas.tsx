/**
 * FloorPlanCanvas — Premium upgraded canvas
 * Phase 1 + 4: Premium visuals, red-theme handles, room icons, minimap, micro-animations
 * All gesture logic preserved exactly — only render layer upgraded
 */
import React, { useRef, useState, useCallback, useEffect, memo } from "react";
import { View, PanResponder, StyleSheet, Animated, useColorScheme } from "react-native";
import Svg, { Rect, Text as SvgText, G, Line, Circle, Path } from "react-native-svg";
import { useDesignerStore, Room, SketchStroke } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { CompassWidget } from "./CompassWidget";

/* ── Constants ─────────────────────────────────────── */
const G_PX = 20;
const MIN_DIM = 2;
const HANDLE_HIT = 16;
const HANDLE_VIS = 7;
const SNAP_GUIDE_THRESH = 0.6;
const INERTIA_DECAY = 0.88;
const INERTIA_STOP = 0.3;
const MINIMAP_W = 110;
const MINIMAP_H = 80;

/* ── Types ─────────────────────────────────────────── */
export type ActiveTool = "select" | "draw" | "pan" | "sketch" | "line";
export type ResizeHandle = "TL" | "TC" | "TR" | "ML" | "MR" | "BL" | "BC" | "BR";

const ROOM_LABELS: Record<Room["type"], string> = {
  bedroom: "Bedroom", kitchen: "Kitchen", bathroom: "Bath",
  living_room: "Living", office: "Office", dining_room: "Dining",
};

/* Room icon paths (simple SVG path data, centered at 0,0, ~16px) */
const ROOM_ICONS: Record<Room["type"], string> = {
  bedroom:     "M-7-4 L7-4 L7 5 L-7 5 Z M-5 5 L-5 7 M5 5 L5 7 M-7 0 L7 0",
  kitchen:     "M-6-6 L6-6 L6 6 L-6 6 Z M-3-3 L-3 0 M0-6 L0-3 M3-3 L3 0",
  bathroom:    "M-5-6 L5-6 L5 2 Q5 6 0 6 Q-5 6 -5 2 Z M-7 2 L7 2",
  living_room: "M-7-2 L7-2 L7 5 L-7 5 Z M-7-2 Q-7-6 0-6 Q7-6 7-2",
  office:      "M-5-6 L5-6 L5 6 L-5 6 Z M-5-1 L5-1 M-2-6 L-2 6",
  dining_room: "M0-6 L0 6 M-6 0 L6 0 M-4-4 L4 4 M4-4 L-4 4",
};

const ROOM_COLORS: Record<Room["type"], string> = {
  bedroom: "#A5B4FC", kitchen: "#FDBA74", bathroom: "#6EE7B7",
  living_room: "#7DD3FC", office: "#C4B5FD", dining_room: "#FDE68A",
};

interface DrawRect { x: number; y: number; w: number; h: number }
interface ActiveDrag { type: "move" | "resize"; room: Room; guides: Guide[] }
interface Guide { type: "h" | "v"; pos: number }
interface PinchState {
  initialDistance: number; initialZoom: number;
  midX: number; midY: number; initialPanX: number; initialPanY: number;
}

export interface FloorPlanCanvasProps {
  activeTool: ActiveTool;
  drawRoomType: Room["type"];
  showGrid: boolean;
  onRoomSelect?: (id: string | null) => void;
  onRoomDrawn?: (room: Omit<Room, "id">) => void;
  canvasRef?: React.RefObject<View>;
  sketchColor?: string;
  sketchSize?: number;
}

/* ── Helpers ───────────────────────────────────────── */
function snap(v: number) { return Math.round(v); }
function ptDist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function computeGuides(moving: Room, all: Room[]): Guide[] {
  const guides: Guide[] = [];
  const seen = new Set<string>();
  const add = (type: "h" | "v", pos: number) => {
    const key = `${type}:${pos}`;
    if (!seen.has(key)) { seen.add(key); guides.push({ type, pos }); }
  };
  const mL = moving.x, mR = moving.x + moving.width;
  const mT = moving.y, mB = moving.y + moving.height;
  const mCX = moving.x + moving.width / 2, mCY = moving.y + moving.height / 2;
  for (const room of all) {
    if (room.id === moving.id) continue;
    const rL = room.x, rR = room.x + room.width;
    const rT = room.y, rB = room.y + room.height;
    const rCX = room.x + room.width / 2, rCY = room.y + room.height / 2;
    for (const [a, b] of [[mL,rL],[mL,rR],[mR,rL],[mR,rR],[mCX,rCX]])
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("v", b);
    for (const [a, b] of [[mT,rT],[mT,rB],[mB,rT],[mB,rB],[mCY,rCY]])
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("h", b);
  }
  return guides;
}

const AnimatedG = Animated.createAnimatedComponent(G as any);

/* ── Minimap ───────────────────────────────────────── */
const Minimap = memo(function Minimap({
  rooms, zoom, panX, panY, svgW, svgH, isDark,
}: {
  rooms: Room[]; zoom: number; panX: number; panY: number;
  svgW: number; svgH: number; isDark: boolean;
}) {
  if (rooms.length === 0) return null;

  // Compute bounding box of all rooms in grid units
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rooms) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width); maxY = Math.max(maxY, r.y + r.height);
  }
  const pad = 4;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const bw = maxX - minX, bh = maxY - minY;
  if (bw <= 0 || bh <= 0) return null;

  const scaleX = (MINIMAP_W - 8) / bw;
  const scaleY = (MINIMAP_H - 8) / bh;
  const sc = Math.min(scaleX, scaleY);

  // Viewport rect in grid units
  const vpX = -panX / (G_PX * zoom);
  const vpY = -panY / (G_PX * zoom);
  const vpW = svgW / (G_PX * zoom);
  const vpH = svgH / (G_PX * zoom);

  const toMM = (gx: number, gy: number) => ({
    mx: 4 + (gx - minX) * sc,
    my: 4 + (gy - minY) * sc,
  });

  const bg = isDark ? "rgba(20,20,20,0.88)" : "rgba(255,255,255,0.88)";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  return (
    <View style={[styles.minimapWrap, { backgroundColor: bg, borderColor: border }]}>
      <Svg width={MINIMAP_W} height={MINIMAP_H}>
        {rooms.map((r) => {
          const { mx, my } = toMM(r.x, r.y);
          const col = ROOM_COLORS[r.type] ?? "#38BDF8";
          return (
            <Rect key={r.id}
              x={mx} y={my}
              width={Math.max(2, r.width * sc)} height={Math.max(2, r.height * sc)}
              fill={col} fillOpacity={0.35} stroke={col} strokeWidth={0.8} rx={1}
            />
          );
        })}
        {/* Viewport indicator */}
        {(() => {
          const { mx: vx, my: vy } = toMM(vpX, vpY);
          const vw = vpW * sc, vh = vpH * sc;
          return (
            <Rect x={vx} y={vy} width={Math.max(4, vw)} height={Math.max(4, vh)}
              fill="none" stroke="#38BDF8" strokeWidth={1} strokeDasharray="3,2" rx={1} opacity={0.7} />
          );
        })()}
      </Svg>
    </View>
  );
});

/* ── Main Component ────────────────────────────────── */
export function FloorPlanCanvas({
  activeTool, drawRoomType, showGrid, onRoomSelect, onRoomDrawn, canvasRef,
  sketchColor = "#38BDF8", sketchSize = 4,
}: FloorPlanCanvasProps) {
  const colors = useColors();
  const store = useDesignerStore();
  const isDark = useColorScheme() === "dark";

  const [size, setSize] = useState({ w: 375, h: 600 });
  const [drawing, setDrawing] = useState<DrawRect | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  // Sketch state — live stroke points (screen coords, snapped to grid on render)
  const [liveSketch, setLiveSketch] = useState<Array<{ x: number; y: number }> | null>(null);
  const liveSketchRef = useRef<Array<{ x: number; y: number }>>([]);
  const sketchColorRef = useRef(sketchColor);
  const sketchSizeRef = useRef(sketchSize);
  // Keep refs in sync with props
  sketchColorRef.current = sketchColor;
  sketchSizeRef.current = sketchSize;
  // Line tool — start point
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);

  /* ── Room pop-in animations ── */
  const roomAnims = useRef<Map<string, Animated.Value>>(new Map());
  const prevRoomIds = useRef<Set<string>>(new Set());
  const currentRooms = store.currentPlan?.rooms ?? [];
  const currentIds = new Set(currentRooms.map((r) => r.id));
  currentIds.forEach((id) => {
    if (!prevRoomIds.current.has(id)) {
      const anim = new Animated.Value(0);
      roomAnims.current.set(id, anim);
      // Pop-in: scale 0.85 → 1 with spring overshoot
      Animated.spring(anim, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }).start();
    }
  });
  prevRoomIds.current.forEach((id) => { if (!currentIds.has(id)) roomAnims.current.delete(id); });
  prevRoomIds.current = currentIds;

  /* ── Delete shrink+fade animations ── */
  // Reserved for future deferred-delete animation pattern

  /* ── Selection scale micro-animation ── */
  const selectionScaleAnim = useRef(new Animated.Value(1)).current;
  const prevSelectedId = useRef<string | null>(null);
  useEffect(() => {
    if (store.selectedRoomId && store.selectedRoomId !== prevSelectedId.current) {
      selectionScaleAnim.setValue(0.97);
      Animated.spring(selectionScaleAnim, {
        toValue: 1, tension: 300, friction: 10, useNativeDriver: true,
      }).start();
    }
    prevSelectedId.current = store.selectedRoomId;
  }, [store.selectedRoomId]);

  /* ── Selection pulse ── */
  const selectGlowAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!store.selectedRoomId) { selectGlowAnim.setValue(0.3); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(selectGlowAnim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
      Animated.timing(selectGlowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [store.selectedRoomId]);

  /* ── Refs ── */
  const activeToolRef = useRef(activeTool); activeToolRef.current = activeTool;
  const zoomRef = useRef(store.zoom); zoomRef.current = store.zoom;
  const panXRef = useRef(store.panX); panXRef.current = store.panX;
  const panYRef = useRef(store.panY); panYRef.current = store.panY;
  const selectedIdRef = useRef(store.selectedRoomId); selectedIdRef.current = store.selectedRoomId;
  const planRef = useRef(store.currentPlan); planRef.current = store.currentPlan;

  const gestureStart = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);
  const panStart = useRef({ panX: 0, panY: 0 });
  const moveStart = useRef<{ roomId: string; room: Room; sx: number; sy: number } | null>(null);
  const resizeStart = useRef<{ room: Room; handle: ResizeHandle; sx: number; sy: number } | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const isPinching = useRef(false);
  const velX = useRef(0); const velY = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMovePan = useRef({ x: 0, y: 0 });
  const inertiaRaf = useRef<any>(null);

  /* ── Coordinate helpers ── */
  const toScreen = useCallback((gx: number, gy: number) => ({
    sx: gx * G_PX * zoomRef.current + panXRef.current,
    sy: gy * G_PX * zoomRef.current + panYRef.current,
  }), []);

  const toGrid = useCallback((sx: number, sy: number) => ({
    gx: (sx - panXRef.current) / (G_PX * zoomRef.current),
    gy: (sy - panYRef.current) / (G_PX * zoomRef.current),
  }), []);

  const hitRoom = useCallback((sx: number, sy: number): Room | null => {
    const plan = planRef.current;
    if (!plan) return null;
    for (const room of [...plan.rooms].reverse()) {
      const { sx: rx, sy: ry } = toScreen(room.x, room.y);
      const rw = room.width * G_PX * zoomRef.current;
      const rh = room.height * G_PX * zoomRef.current;
      if (sx >= rx && sx <= rx + rw && sy >= ry && sy <= ry + rh) return room;
    }
    return null;
  }, [toScreen]);

  const hitHandle = useCallback((sx: number, sy: number): ResizeHandle | null => {
    const plan = planRef.current;
    const selId = selectedIdRef.current;
    if (!plan || !selId) return null;
    const room = plan.rooms.find((r) => r.id === selId);
    if (!room) return null;
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * zoomRef.current;
    const rh = room.height * G_PX * zoomRef.current;
    const handles: Array<{ key: ResizeHandle; hx: number; hy: number }> = [
      { key: "TL", hx: rx,        hy: ry },
      { key: "TC", hx: rx+rw/2,   hy: ry },
      { key: "TR", hx: rx+rw,     hy: ry },
      { key: "ML", hx: rx,        hy: ry+rh/2 },
      { key: "MR", hx: rx+rw,     hy: ry+rh/2 },
      { key: "BL", hx: rx,        hy: ry+rh },
      { key: "BC", hx: rx+rw/2,   hy: ry+rh },
      { key: "BR", hx: rx+rw,     hy: ry+rh },
    ];
    for (const h of handles) if (ptDist(sx, sy, h.hx, h.hy) <= HANDLE_HIT) return h.key;
    return null;
  }, [toScreen]);

  /* ── Inertia ── */
  const stopInertia = () => {
    if (inertiaRaf.current != null) { cancelAnimationFrame(inertiaRaf.current); inertiaRaf.current = null; }
  };
  const startInertia = useCallback(() => {
    stopInertia();
    const step = () => {
      velX.current *= INERTIA_DECAY; velY.current *= INERTIA_DECAY;
      if (Math.abs(velX.current) < INERTIA_STOP && Math.abs(velY.current) < INERTIA_STOP) { stopInertia(); return; }
      store.setPan(panXRef.current + velX.current, panYRef.current + velY.current);
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  }, [store]);

  /* ── Resize ── */
  function applyResize(startRoom: Room, handle: ResizeHandle, dgx: number, dgy: number): Room {
    let { x, y, width, height } = startRoom;
    if (handle.includes("L")) {
      const nx = snap(startRoom.x + dgx), nw = snap(startRoom.width - (nx - startRoom.x));
      if (nw >= MIN_DIM) { x = nx; width = nw; }
    } else if (handle.includes("R") || handle === "MR") {
      width = Math.max(MIN_DIM, snap(startRoom.width + dgx));
    }
    if (handle.includes("T") && handle !== "TC") {
      const ny = snap(startRoom.y + dgy), nh = snap(startRoom.height - (ny - startRoom.y));
      if (nh >= MIN_DIM) { y = ny; height = nh; }
    } else if (handle === "TC") {
      const ny = snap(startRoom.y + dgy), nh = snap(startRoom.height - (ny - startRoom.y));
      if (nh >= MIN_DIM) { y = ny; height = nh; x = startRoom.x; width = startRoom.width; }
    } else if (handle.includes("B") || handle === "BC") {
      height = Math.max(MIN_DIM, snap(startRoom.height + dgy));
      if (handle === "BC") { x = startRoom.x; width = startRoom.width; }
    }
    if (handle === "ML") { y = startRoom.y; height = startRoom.height; }
    return { ...startRoom, x, y, width, height, area: width * height * 4 };
  }

  /* ── PanResponder (gesture logic unchanged) ── */
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,

    onPanResponderGrant: (evt) => {
      stopInertia(); velX.current = 0; velY.current = 0;
      didMove.current = false; moveStart.current = null; resizeStart.current = null;
      pinchRef.current = null; isPinching.current = false;
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) { isPinching.current = true; return; }
      const sx = evt.nativeEvent.pageX, sy = evt.nativeEvent.pageY;
      gestureStart.current = { x: sx, y: sy };
      lastMoveTime.current = Date.now();
      lastMovePan.current = { x: panXRef.current, y: panYRef.current };
      const tool = activeToolRef.current;
      if (tool === "pan") { panStart.current = { panX: panXRef.current, panY: panYRef.current }; return; }
      if (tool === "select") {
        const handle = hitHandle(sx, sy);
        if (handle) {
          const room = planRef.current?.rooms.find((r) => r.id === selectedIdRef.current);
          if (room) { store.pushHistory(); resizeStart.current = { room: { ...room }, handle, sx, sy }; }
          return;
        }
        const room = hitRoom(sx, sy);
        if (room) { store.pushHistory(); moveStart.current = { roomId: room.id, room: { ...room }, sx, sy }; }
        return;
      }
      if (tool === "draw") setDrawing({ x: sx, y: sy, w: 0, h: 0 });
      if (tool === "sketch") {
        liveSketchRef.current = [{ x: sx, y: sy }];
        setLiveSketch([{ x: sx, y: sy }]);
      }
      if (tool === "line") {
        lineStartRef.current = { x: sx, y: sy };
        liveSketchRef.current = [{ x: sx, y: sy }, { x: sx, y: sy }];
        setLiveSketch([{ x: sx, y: sy }, { x: sx, y: sy }]);
      }
    },

    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        isPinching.current = true;
        const t0 = touches[0], t1 = touches[1];
        const dist = ptDist(t0.pageX, t0.pageY, t1.pageX, t1.pageY);
        const midX = (t0.pageX + t1.pageX) / 2, midY = (t0.pageY + t1.pageY) / 2;
        if (!pinchRef.current) {
          pinchRef.current = { initialDistance: dist, initialZoom: zoomRef.current, midX, midY, initialPanX: panXRef.current, initialPanY: panYRef.current };
          return;
        }
        const { initialDistance, initialZoom, initialPanX, initialPanY } = pinchRef.current;
        const newZoom = Math.max(0.2, Math.min(6, initialZoom * (dist / initialDistance)));
        const ratio = newZoom / initialZoom;
        store.setZoom(newZoom);
        store.setPan(
          midX - (midX - initialPanX) * ratio + (midX - pinchRef.current.midX),
          midY - (midY - initialPanY) * ratio + (midY - pinchRef.current.midY)
        );
        return;
      }
      if (isPinching.current) return;
      if (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3) didMove.current = true;
      const tool = activeToolRef.current;

      if (tool === "pan") {
        const now = Date.now(), dt = now - lastMoveTime.current;
        const newPX = panStart.current.panX + gs.dx, newPY = panStart.current.panY + gs.dy;
        if (dt > 0) {
          velX.current = (newPX - lastMovePan.current.x) * (1 / dt) * 16;
          velY.current = (newPY - lastMovePan.current.y) * (1 / dt) * 16;
        }
        lastMoveTime.current = now; lastMovePan.current = { x: newPX, y: newPY };
        store.setPan(newPX, newPY); return;
      }
      if (tool === "select" && resizeStart.current) {
        const { room: startRoom, handle } = resizeStart.current;
        const updated = applyResize(startRoom, handle, gs.dx / (G_PX * zoomRef.current), gs.dy / (G_PX * zoomRef.current));
        setActiveDrag({ type: "resize", room: updated, guides: [] }); return;
      }
      if (tool === "select" && moveStart.current) {
        const { room: startRoom } = moveStart.current;
        const nx = Math.max(0, snap(startRoom.x + gs.dx / (G_PX * zoomRef.current)));
        const ny = Math.max(0, snap(startRoom.y + gs.dy / (G_PX * zoomRef.current)));
        const updated: Room = { ...startRoom, x: nx, y: ny };
        setActiveDrag({ type: "move", room: updated, guides: computeGuides(updated, planRef.current?.rooms ?? []) }); return;
      }
      if (tool === "draw") setDrawing({ x: gestureStart.current.x, y: gestureStart.current.y, w: gs.dx, h: gs.dy });
      if (tool === "sketch") {
        const cx = gestureStart.current.x + gs.dx;
        const cy = gestureStart.current.y + gs.dy;
        liveSketchRef.current = [...liveSketchRef.current, { x: cx, y: cy }];
        // Throttle re-render — only update every 3 points to keep 60fps
        if (liveSketchRef.current.length % 3 === 0) {
          setLiveSketch([...liveSketchRef.current]);
        }
      }
      if (tool === "line" && lineStartRef.current) {
        const cx = gestureStart.current.x + gs.dx;
        const cy = gestureStart.current.y + gs.dy;
        liveSketchRef.current = [lineStartRef.current, { x: cx, y: cy }];
        setLiveSketch([...liveSketchRef.current]);
      }
    },

    onPanResponderRelease: (_, gs) => {
      const wasPinch = isPinching.current;
      isPinching.current = false; pinchRef.current = null;
      const tool = activeToolRef.current;
      if (tool === "pan" && !wasPinch) { startInertia(); }
      if (tool === "select" && resizeStart.current) {
        const { room: startRoom, handle } = resizeStart.current;
        const updated = applyResize(startRoom, handle, gs.dx / (G_PX * zoomRef.current), gs.dy / (G_PX * zoomRef.current));
        store.updateRoom(updated.id, { x: updated.x, y: updated.y, width: updated.width, height: updated.height, area: updated.area });
        store.calculateDirections(); resizeStart.current = null; setActiveDrag(null); return;
      }
      if (tool === "select" && moveStart.current && didMove.current) {
        const { room: startRoom } = moveStart.current;
        store.updateRoom(moveStart.current.roomId, {
          x: Math.max(0, snap(startRoom.x + gs.dx / (G_PX * zoomRef.current))),
          y: Math.max(0, snap(startRoom.y + gs.dy / (G_PX * zoomRef.current))),
        });
        store.calculateDirections(); moveStart.current = null; setActiveDrag(null); return;
      }
      if (tool === "select" && !didMove.current && !wasPinch) {
        moveStart.current = null;
        const room = hitRoom(gestureStart.current.x, gestureStart.current.y);
        onRoomSelect?.(room ? room.id : null); setActiveDrag(null); return;
      }
      if (tool === "draw" && drawing) {
        const raw = drawing; setDrawing(null);
        const dx = Math.abs(raw.w), dy = Math.abs(raw.h);
        if (dx < G_PX * zoomRef.current * MIN_DIM || dy < G_PX * zoomRef.current * MIN_DIM) return;
        const { gx: gx1, gy: gy1 } = toGrid(raw.x, raw.y);
        const { gx: gx2, gy: gy2 } = toGrid(raw.x + raw.w, raw.y + raw.h);
        const rx = snap(Math.min(gx1, gx2)), ry = snap(Math.min(gy1, gy2));
        const rw = Math.max(MIN_DIM, snap(Math.abs(gx2 - gx1)));
        const rh = Math.max(MIN_DIM, snap(Math.abs(gy2 - gy1)));
        onRoomDrawn?.({ type: drawRoomType, x: Math.max(0, rx), y: Math.max(0, ry), width: rw, height: rh, direction: "N", area: rw * rh * 4 });
        return;
      }
      // Sketch freehand — snap all points to grid and save
      if (tool === "sketch" && liveSketchRef.current.length > 1) {
        const pts = liveSketchRef.current.map(p => {
          const g = toGrid(p.x, p.y);
          return { x: snap(g.gx), y: snap(g.gy) };
        });
        store.addSketch({ points: pts, color: sketchColorRef.current, width: sketchSizeRef.current, type: "freehand" });
        liveSketchRef.current = [];
        setLiveSketch(null);
        return;
      }
      // Line tool — snap start and end to grid
      if (tool === "line" && liveSketchRef.current.length === 2) {
        const [p0, p1] = liveSketchRef.current;
        const g0 = toGrid(p0.x, p0.y);
        const g1 = toGrid(p1.x, p1.y);
        store.addSketch({
          points: [{ x: snap(g0.gx), y: snap(g0.gy) }, { x: snap(g1.gx), y: snap(g1.gy) }],
          color: sketchColorRef.current, width: sketchSizeRef.current, type: "line",
        });
        liveSketchRef.current = [];
        lineStartRef.current = null;
        setLiveSketch(null);
        return;
      }
      moveStart.current = null; setActiveDrag(null);
    },

    onPanResponderTerminate: () => {
      moveStart.current = null; resizeStart.current = null; pinchRef.current = null;
      isPinching.current = false; setActiveDrag(null); setDrawing(null);
      liveSketchRef.current = []; lineStartRef.current = null; setLiveSketch(null);
    },
  })).current;

  useEffect(() => () => stopInertia(), []);
  if (!store.currentPlan) return null;

  /* ── Render ── */
  const { w: svgW, h: svgH } = size;
  const zoom = store.zoom;
  const gSpacing = G_PX * zoom;
  const offX = ((store.panX % gSpacing) + gSpacing) % gSpacing;
  const offY = ((store.panY % gSpacing) + gSpacing) % gSpacing;

  const allRooms = store.currentPlan.rooms.map((room) =>
    activeDrag && room.id === activeDrag.room.id ? activeDrag.room : room
  );
  const selectedId = store.selectedRoomId;

  // Theme-aware selection color
  const SEL_COLOR = isDark ? "#38BDF8" : "#0284C7";
  const SEL_HANDLE_FILL = isDark ? "#0A0F1D" : "#FFFFFF";
  const GUIDE_COLOR = isDark ? "#38BDF8" : "#0284C7";

  /* ── Room elements ── */
  const roomEls = allRooms.map((room) => {
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * zoom;
    const rh = room.height * G_PX * zoom;
    const isSelected = selectedId === room.id;
    const isBeingDragged = activeDrag?.room.id === room.id;
    const col = ROOM_COLORS[room.type] ?? SEL_COLOR;
    const opacityAnim = roomAnims.current.get(room.id) ?? new Animated.Value(1);

    const handles: Array<{ key: ResizeHandle; hx: number; hy: number }> = [
      { key: "TL", hx: rx,       hy: ry },
      { key: "TC", hx: rx+rw/2,  hy: ry },
      { key: "TR", hx: rx+rw,    hy: ry },
      { key: "ML", hx: rx,       hy: ry+rh/2 },
      { key: "MR", hx: rx+rw,    hy: ry+rh/2 },
      { key: "BL", hx: rx,       hy: ry+rh },
      { key: "BC", hx: rx+rw/2,  hy: ry+rh },
      { key: "BR", hx: rx+rw,    hy: ry+rh },
    ];

    // Icon scale — only show when room is big enough
    const showIcon = rw > 56 && rh > 44;
    const iconScale = Math.min(1.2, Math.max(0.6, Math.min(rw, rh) / 80));
    const icx = rx + rw / 2;
    const icy = rh > 64 ? ry + rh / 2 - 10 : ry + rh / 2;

    return (
      <AnimatedG key={room.id} opacity={opacityAnim}>
        {/* Outer glow when selected */}        {isSelected && (
          <AnimatedG opacity={selectGlowAnim}>
            <Rect x={rx-8} y={ry-8} width={rw+16} height={rh+16}
              fill={col} fillOpacity={0.08} rx={10} />
          </AnimatedG>
        )}

        {/* Drag shadow */}
        {isBeingDragged && (
          <Rect x={rx+5} y={ry+5} width={Math.max(0,rw)} height={Math.max(0,rh)}
            fill={col} fillOpacity={0.10} rx={5} />
        )}

        {/* Room body — filled with subtle gradient feel via opacity layers */}
        <Rect x={rx} y={ry} width={Math.max(0,rw)} height={Math.max(0,rh)}
          fill={col}
          fillOpacity={isSelected ? 0.22 : isBeingDragged ? 0.30 : 0.10}
          stroke={col}
          strokeWidth={isSelected ? 2.5 : 1.5}
          rx={4}
        />

        {/* Inner highlight stripe (top edge) */}
        {rh > 20 && (
          <Rect x={rx+2} y={ry+2} width={Math.max(0,rw-4)} height={Math.min(6, rh*0.15)}
            fill={col} fillOpacity={0.18} rx={2} />
        )}

        {/* Figma-style dashed selection border */}
        {isSelected && (
          <Rect x={rx-2} y={ry-2} width={rw+4} height={rh+4}
            fill="none" stroke={SEL_COLOR} strokeWidth={1.5}
            strokeDasharray="6,3" rx={6} opacity={0.95} />
        )}

        {/* Room icon */}
        {showIcon && (
          <G transform={`translate(${icx}, ${icy}) scale(${iconScale})`} opacity={0.55}>
            <Path d={ROOM_ICONS[room.type]} stroke={col} strokeWidth={1.4}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        )}

        {/* Room label */}
        {rw > 44 && rh > 28 && (
          <SvgText
            x={rx + rw / 2}
            y={showIcon ? ry + rh / 2 + (rh > 64 ? 14 : 8) : ry + rh / 2 + 5}
            textAnchor="middle"
            fontSize={Math.min(12, Math.max(8, rw / 9))}
            fill={col} fontWeight="700" opacity={0.9}
          >
            {room.label ?? ROOM_LABELS[room.type]}
          </SvgText>
        )}

        {/* Direction badge — top-left corner */}
        {rw > 32 && rh > 24 && (
          <G>
            <Rect x={rx+4} y={ry+4} width={18} height={13} rx={3} fill={col} fillOpacity={0.18} />
            <SvgText x={rx+13} y={ry+14} textAnchor="middle" fontSize={8}
              fill={col} fontWeight="800" opacity={0.85}>
              {room.direction}
            </SvgText>
          </G>
        )}

        {/* ── Dimension leaders (selected) ── */}
        {isSelected && rw > 80 && (
          <G opacity={0.85}>
            <Line x1={rx} y1={ry-14} x2={rx+rw} y2={ry-14} stroke={SEL_COLOR} strokeWidth={1} />
            <Line x1={rx} y1={ry-18} x2={rx} y2={ry-10} stroke={SEL_COLOR} strokeWidth={1} />
            <Line x1={rx+rw} y1={ry-18} x2={rx+rw} y2={ry-10} stroke={SEL_COLOR} strokeWidth={1} />
            <Rect x={rx+rw/2-22} y={ry-24} width={44} height={14} rx={4}
              fill={SEL_COLOR} opacity={0.92} />
            <SvgText x={rx+rw/2} y={ry-13} textAnchor="middle"
              fontSize={9} fill="#fff" fontWeight="800">
              {room.width} ft
            </SvgText>
          </G>
        )}
        {isSelected && rh > 80 && (
          <G opacity={0.85}>
            <Line x1={rx+rw+14} y1={ry} x2={rx+rw+14} y2={ry+rh} stroke={SEL_COLOR} strokeWidth={1} />
            <Line x1={rx+rw+10} y1={ry} x2={rx+rw+18} y2={ry} stroke={SEL_COLOR} strokeWidth={1} />
            <Line x1={rx+rw+10} y1={ry+rh} x2={rx+rw+18} y2={ry+rh} stroke={SEL_COLOR} strokeWidth={1} />
            <Rect x={rx+rw+20} y={ry+rh/2-7} width={36} height={14} rx={4}
              fill={SEL_COLOR} opacity={0.92} />
            <SvgText x={rx+rw+38} y={ry+rh/2+4} textAnchor="middle"
              fontSize={9} fill="#fff" fontWeight="800">
              {room.height} ft
            </SvgText>
          </G>
        )}

        {/* Live W×H badge while dragging/resizing */}
        {(isBeingDragged || (activeDrag?.type === "resize" && activeDrag.room.id === room.id)) && (
          <G>
            <Rect x={rx+rw/2-36} y={ry+rh/2-14} width={72} height={28} rx={8}
              fill={isDark ? "#0A0F1D" : "#0A0A0A"} opacity={0.90} />
            <SvgText x={rx+rw/2} y={ry+rh/2+5} textAnchor="middle"
              fontSize={12} fill="#fff" fontWeight="800">
              {room.width}×{room.height}
            </SvgText>
          </G>
        )}

        {/* ── Resize handles — premium square style ── */}
        {isSelected && handles.map((h) => {
          const isCorner = h.key === "TL" || h.key === "TR" || h.key === "BL" || h.key === "BR";
          return (
            <G key={h.key}>
              {/* Handle shadow */}
              <Rect x={h.hx-HANDLE_VIS+1} y={h.hy-HANDLE_VIS+1}
                width={HANDLE_VIS*2} height={HANDLE_VIS*2}
                rx={isCorner ? 3 : 2} fill="#000" opacity={0.12} />
              {/* Handle body */}
              <Rect x={h.hx-HANDLE_VIS} y={h.hy-HANDLE_VIS}
                width={HANDLE_VIS*2} height={HANDLE_VIS*2}
                rx={isCorner ? 3 : 2}
                fill={SEL_HANDLE_FILL}
                stroke={SEL_COLOR} strokeWidth={2} />
              {/* Corner accent dot */}
              {isCorner && (
                <Circle cx={h.hx} cy={h.hy} r={2} fill={SEL_COLOR} />
              )}
            </G>
          );
        })}

        {/* ── Rotation handle ── */}
        {isSelected && rw > 64 && (
          <G>
            <Line x1={rx+rw/2} y1={ry-14} x2={rx+rw/2} y2={ry-30}
              stroke={SEL_COLOR} strokeWidth={1.5} opacity={0.6} />
            <Circle cx={rx+rw/2} cy={ry-38} r={9}
              fill={SEL_HANDLE_FILL} stroke={SEL_COLOR} strokeWidth={2} />
            <SvgText x={rx+rw/2} y={ry-34} textAnchor="middle"
              fontSize={11} fill={SEL_COLOR} fontWeight="700">
              ↻
            </SvgText>
          </G>
        )}
      </AnimatedG>
    );
  });

  /* ── Draw preview ── */
  let drawPreview: React.ReactElement | null = null;
  if (drawing) {
    const col = ROOM_COLORS[drawRoomType] ?? SEL_COLOR;
    const px = drawing.w >= 0 ? drawing.x : drawing.x + drawing.w;
    const py = drawing.h >= 0 ? drawing.y : drawing.y + drawing.h;
    const pw = Math.abs(drawing.w), ph = Math.abs(drawing.h);
    const { gx: gx1, gy: gy1 } = toGrid(px, py);
    const { gx: gx2, gy: gy2 } = toGrid(px + pw, py + ph);
    const snW = Math.max(0, snap(Math.abs(gx2 - gx1)));
    const snH = Math.max(0, snap(Math.abs(gy2 - gy1)));
    drawPreview = (
      <G>
        {/* Corner crosshairs */}
        <Line x1={px-8} y1={py} x2={px+8} y2={py} stroke={col} strokeWidth={1} opacity={0.6} />
        <Line x1={px} y1={py-8} x2={px} y2={py+8} stroke={col} strokeWidth={1} opacity={0.6} />
        <Rect x={px} y={py} width={pw} height={ph}
          fill={col} fillOpacity={0.15} stroke={col} strokeWidth={2}
          strokeDasharray="8,4" rx={4} />
        {pw > 60 && ph > 40 && (
          <G>
            <Rect x={px+pw/2-36} y={py+ph/2-14} width={72} height={28} rx={8}
              fill={isDark ? "#0A0F1D" : "#0A0A0A"} opacity={0.88} />
            <SvgText x={px+pw/2} y={py+ph/2+5} textAnchor="middle"
              fontSize={12} fill="#fff" fontWeight="800">
              {snW}×{snH} ft
            </SvgText>
          </G>
        )}
      </G>
    );
  }

  /* ── Alignment guides ── */
  const guideEls = (activeDrag?.guides ?? []).map((g, i) => {
    if (g.type === "v") {
      const x = g.pos * G_PX * zoom + store.panX;
      return <Line key={i} x1={x} y1={0} x2={x} y2={svgH}
        stroke={GUIDE_COLOR} strokeWidth={1} strokeDasharray="5,3" opacity={0.5} />;
    }
    const y = g.pos * G_PX * zoom + store.panY;
    return <Line key={i} x1={0} y1={y} x2={svgW} y2={y}
      stroke={GUIDE_COLOR} strokeWidth={1} strokeDasharray="5,3" opacity={0.5} />;
  });

  const selectedRoom = selectedId ? store.currentPlan.rooms.find((r) => r.id === selectedId) : null;

  // Grid color — subtle, theme-aware
  const gridColor = isDark ? "rgba(56,189,248,0.05)" : "rgba(15,23,42,0.06)";
  const gridColorMain = isDark ? "rgba(56,189,248,0.10)" : "rgba(15,23,42,0.12)";

  return (
    <View
      ref={canvasRef}
      style={[styles.container, { backgroundColor: isDark ? "#0A0F1D" : "#F1F5F9" }]}
      {...panResponder.panHandlers}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Svg width={svgW} height={svgH}>
        {/* Grid */}
        {showGrid && (
          <G>
            {Array.from({ length: Math.ceil(svgW / gSpacing) + 1 }).map((_, i) => {
              const x = offX + i * gSpacing;
              const isMain = i % 5 === 0;
              return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={svgH}
                stroke={isMain ? gridColorMain : gridColor}
                strokeWidth={isMain ? 0.7 : 0.3} />;
            })}
            {Array.from({ length: Math.ceil(svgH / gSpacing) + 1 }).map((_, i) => {
              const y = offY + i * gSpacing;
              const isMain = i % 5 === 0;
              return <Line key={`h${i}`} x1={0} y1={y} x2={svgW} y2={y}
                stroke={isMain ? gridColorMain : gridColor}
                strokeWidth={isMain ? 0.7 : 0.3} />;
            })}
          </G>
        )}
        <G>{guideEls}</G>
        <G>{roomEls}</G>
        {/* ── Saved sketch strokes ── */}
        <G>
          {(store.currentPlan.sketches ?? []).map((stroke) => {
            if (stroke.points.length < 2) return null;
            // Convert grid coords back to screen coords
            const screenPts = stroke.points.map(p => ({
              sx: p.x * G_PX * zoom + store.panX,
              sy: p.y * G_PX * zoom + store.panY,
            }));
            const d = screenPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`).join(" ");
            return (
              <Path key={stroke.id} d={d}
                stroke={stroke.color} strokeWidth={stroke.width * zoom}
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                opacity={0.85}
              />
            );
          })}
        </G>
        {/* ── Live sketch preview (while drawing) ── */}
        {liveSketch && liveSketch.length > 1 && (
          <G>
            {(() => {
              const d = liveSketch.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
              return (
                <Path d={d}
                  stroke={sketchColorRef.current} strokeWidth={sketchSizeRef.current}
                  fill="none" strokeLinecap="round" strokeLinejoin="round"
                  opacity={0.7} strokeDasharray={activeTool === "line" ? "6,3" : undefined}
                />
              );
            })()}
          </G>
        )}
        {drawPreview}
      </Svg>

      {/* Compass */}
      <View style={styles.compassWrap} pointerEvents="none">
        <CompassWidget selectedDirection={selectedRoom?.direction ?? null} size={76} />
      </View>

      {/* Minimap */}
      <View style={styles.minimapPos} pointerEvents="none">
        <Minimap
          rooms={store.currentPlan.rooms}
          zoom={zoom} panX={store.panX} panY={store.panY}
          svgW={svgW} svgH={svgH} isDark={isDark}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  compassWrap: {
    position: "absolute", top: 12, right: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  minimapPos: {
    position: "absolute", bottom: 16, right: 12,
  },
  minimapWrap: {
    width: MINIMAP_W, height: MINIMAP_H,
    borderRadius: 10, borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
});
