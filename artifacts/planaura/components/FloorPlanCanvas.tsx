/**
 * FloorPlanCanvas — Figma-grade interactive canvas
 *
 * Features:
 * - Zero-lag gestures: all state in refs, only activeDrag triggers re-render
 * - Pan inertia with RAF-based exponential decay
 * - Pinch-to-zoom with stable midpoint
 * - Alignment snap guides
 * - Room pop-in opacity animation on add
 * - Select glow pulse animation
 * - Floating CompassWidget overlay
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, PanResponder, StyleSheet, Animated } from "react-native";
import Svg, { Rect, Text as SvgText, G, Line, Circle } from "react-native-svg";
import { useDesignerStore, Room } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { CompassWidget } from "./CompassWidget";

/* ── Constants ──────────────────────────────────────── */
const G_PX = 20;
const MIN_DIM = 2;
const HANDLE_HIT = 14;
const HANDLE_VIS = 6;
const SNAP_GUIDE_THRESH = 0.6;
const INERTIA_DECAY = 0.88;
const INERTIA_STOP = 0.3;

/* ── Types ──────────────────────────────────────────── */
export type ActiveTool = "select" | "draw" | "pan";
export type ResizeHandle = "TL" | "TC" | "TR" | "ML" | "MR" | "BL" | "BC" | "BR";

const ROOM_LABELS: Record<Room["type"], string> = {
  bedroom: "Bedroom", kitchen: "Kitchen", bathroom: "Bath",
  living_room: "Living", office: "Office", dining_room: "Dining",
};

const ROOM_COLORS: Record<Room["type"], string> = {
  bedroom: "#4F46E5", kitchen: "#F97316", bathroom: "#0EA5E9",
  living_room: "#7C3AED", office: "#059669", dining_room: "#EC4899",
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
}

/* ── Helpers ────────────────────────────────────────── */
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
    for (const [a, b] of [[mL,rL],[mL,rR],[mR,rL],[mR,rR],[mCX,rCX]]) {
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("v", b);
    }
    for (const [a, b] of [[mT,rT],[mT,rB],[mB,rT],[mB,rB],[mCY,rCY]]) {
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("h", b);
    }
  }
  return guides;
}

/* ── AnimatedG wrapper ──────────────────────────────── */
const AnimatedG = Animated.createAnimatedComponent(G as any);

/* ── Component ──────────────────────────────────────── */
export function FloorPlanCanvas({ activeTool, drawRoomType, showGrid, onRoomSelect, onRoomDrawn }: FloorPlanCanvasProps) {
  const colors = useColors();
  const store = useDesignerStore();

  const [size, setSize] = useState({ w: 375, h: 600 });
  const [drawing, setDrawing] = useState<DrawRect | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  /* ── Room pop-in animations ───────────────────────── */
  const roomAnims = useRef<Map<string, Animated.Value>>(new Map());
  const prevRoomIds = useRef<Set<string>>(new Set());

  // Detect newly added rooms and kick off fade-in
  const currentRooms = store.currentPlan?.rooms ?? [];
  const currentIds = new Set(currentRooms.map((r) => r.id));
  currentIds.forEach((id) => {
    if (!prevRoomIds.current.has(id)) {
      const anim = new Animated.Value(0);
      roomAnims.current.set(id, anim);
      Animated.spring(anim, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }).start();
    }
  });
  // Clean up removed rooms
  prevRoomIds.current.forEach((id) => { if (!currentIds.has(id)) roomAnims.current.delete(id); });
  prevRoomIds.current = currentIds;

  /* ── Select glow ──────────────────────────────────── */
  const selectGlowAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!store.selectedRoomId) { selectGlowAnim.setValue(0.3); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(selectGlowAnim, { toValue: 0.7, duration: 600, useNativeDriver: true }),
        Animated.timing(selectGlowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [store.selectedRoomId]);

  /* ── Refs ─────────────────────────────────────────── */
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
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

  /* ── Helpers ──────────────────────────────────────── */
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
      { key: "TL", hx: rx, hy: ry }, { key: "TC", hx: rx + rw / 2, hy: ry },
      { key: "TR", hx: rx + rw, hy: ry }, { key: "ML", hx: rx, hy: ry + rh / 2 },
      { key: "MR", hx: rx + rw, hy: ry + rh / 2 }, { key: "BL", hx: rx, hy: ry + rh },
      { key: "BC", hx: rx + rw / 2, hy: ry + rh }, { key: "BR", hx: rx + rw, hy: ry + rh },
    ];
    for (const h of handles) if (ptDist(sx, sy, h.hx, h.hy) <= HANDLE_HIT) return h.key;
    return null;
  }, [toScreen]);

  /* ── Inertia ──────────────────────────────────────── */
  const stopInertia = () => { if (inertiaRaf.current != null) { cancelAnimationFrame(inertiaRaf.current); inertiaRaf.current = null; } };
  const startInertia = useCallback(() => {
    stopInertia();
    const step = () => {
      velX.current *= INERTIA_DECAY;
      velY.current *= INERTIA_DECAY;
      if (Math.abs(velX.current) < INERTIA_STOP && Math.abs(velY.current) < INERTIA_STOP) { stopInertia(); return; }
      store.setPan(panXRef.current + velX.current, panYRef.current + velY.current);
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  }, [store]);

  /* ── Resize ───────────────────────────────────────── */
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

  /* ── PanResponder ─────────────────────────────────── */
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
        store.setPan(midX - (midX - initialPanX) * ratio + (midX - pinchRef.current.midX), midY - (midY - initialPanY) * ratio + (midY - pinchRef.current.midY));
        return;
      }
      if (isPinching.current) return;
      if (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3) didMove.current = true;
      const tool = activeToolRef.current;

      if (tool === "pan") {
        const now = Date.now(), dt = now - lastMoveTime.current;
        const newPX = panStart.current.panX + gs.dx, newPY = panStart.current.panY + gs.dy;
        if (dt > 0) { velX.current = (newPX - lastMovePan.current.x) * (1 / dt) * 16; velY.current = (newPY - lastMovePan.current.y) * (1 / dt) * 16; }
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
        const rw = Math.max(MIN_DIM, snap(Math.abs(gx2 - gx1))), rh = Math.max(MIN_DIM, snap(Math.abs(gy2 - gy1)));
        onRoomDrawn?.({ type: drawRoomType, x: Math.max(0, rx), y: Math.max(0, ry), width: rw, height: rh, direction: "N", area: rw * rh * 4 });
        return;
      }
      moveStart.current = null; setActiveDrag(null);
    },

    onPanResponderTerminate: () => {
      moveStart.current = null; resizeStart.current = null; pinchRef.current = null;
      isPinching.current = false; setActiveDrag(null); setDrawing(null);
    },
  })).current;

  useEffect(() => () => stopInertia(), []);

  if (!store.currentPlan) return null;

  /* ── Render ───────────────────────────────────────── */
  const { w: svgW, h: svgH } = size;
  const zoom = store.zoom;
  const gSpacing = G_PX * zoom;
  const offX = ((store.panX % gSpacing) + gSpacing) % gSpacing;
  const offY = ((store.panY % gSpacing) + gSpacing) % gSpacing;

  const allRooms = store.currentPlan.rooms.map((room) =>
    activeDrag && room.id === activeDrag.room.id ? activeDrag.room : room
  );
  const selectedId = store.selectedRoomId;

  /* ── Room elements ────────────────────────────────── */
  const roomEls = allRooms.map((room) => {
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * zoom, rh = room.height * G_PX * zoom;
    const isSelected = selectedId === room.id;
    const isBeingDragged = activeDrag?.room.id === room.id;
    const col = ROOM_COLORS[room.type] ?? colors.primary;
    const opacityAnim = roomAnims.current.get(room.id) ?? new Animated.Value(1);

    const handles: Array<{ key: ResizeHandle; hx: number; hy: number }> = [
      { key: "TL", hx: rx, hy: ry }, { key: "TC", hx: rx + rw / 2, hy: ry },
      { key: "TR", hx: rx + rw, hy: ry }, { key: "ML", hx: rx, hy: ry + rh / 2 },
      { key: "MR", hx: rx + rw, hy: ry + rh / 2 }, { key: "BL", hx: rx, hy: ry + rh },
      { key: "BC", hx: rx + rw / 2, hy: ry + rh }, { key: "BR", hx: rx + rw, hy: ry + rh },
    ];

    return (
      <AnimatedG key={room.id} opacity={opacityAnim}>
        {/* Selection glow */}
        {isSelected && (
          <AnimatedG opacity={selectGlowAnim}>
            <Rect x={rx - 6} y={ry - 6} width={rw + 12} height={rh + 12}
              fill={col} fillOpacity={0.12} rx={8} />
          </AnimatedG>
        )}

        {/* Drop shadow */}
        {isSelected && (
          <Rect x={rx + 4} y={ry + 4} width={Math.max(0, rw)} height={Math.max(0, rh)}
            fill={col} fillOpacity={0.12} rx={4} />
        )}

        {/* Room body */}
        <Rect x={rx} y={ry} width={Math.max(0, rw)} height={Math.max(0, rh)}
          fill={col} fillOpacity={isSelected ? 0.25 : isBeingDragged ? 0.35 : 0.12}
          stroke={col} strokeWidth={isSelected ? 2 : 1.5} rx={3} />

        {/* Figma-style selection box */}
        {isSelected && (
          <Rect x={rx - 1} y={ry - 1} width={rw + 2} height={rh + 2}
            fill="none" stroke="#2563EB" strokeWidth={1.5} strokeDasharray="5,3" rx={4} opacity={0.9} />
        )}

        {/* Room label */}
        {rw > 50 && rh > 32 && (
          <SvgText x={rx + rw / 2} y={ry + rh / 2 + (rh > 56 ? -8 : 5)}
            textAnchor="middle" fontSize={Math.min(13, Math.max(9, rw / 8))} fill={col} fontWeight="700">
            {ROOM_LABELS[room.type]}
          </SvgText>
        )}

        {/* Dim label (selected) */}
        {isSelected && rw > 60 && rh > 52 && (
          <SvgText x={rx + rw / 2} y={ry + rh / 2 + (rh > 56 ? 10 : 18)}
            textAnchor="middle" fontSize={10} fill={col} opacity={0.9}>
            {room.width} × {room.height} ft
          </SvgText>
        )}

        {/* Direction badge */}
        {rw > 28 && rh > 20 && (
          <SvgText x={rx + 6} y={ry + 13} fontSize={8} fill={col} opacity={0.7}>
            {room.direction}
          </SvgText>
        )}

        {/* Width leader */}
        {isSelected && rw > 70 && (
          <G opacity={0.7}>
            <Line x1={rx} y1={ry - 12} x2={rx + rw} y2={ry - 12} stroke="#2563EB" strokeWidth={1} />
            <Line x1={rx} y1={ry - 16} x2={rx} y2={ry - 8} stroke="#2563EB" strokeWidth={1} />
            <Line x1={rx + rw} y1={ry - 16} x2={rx + rw} y2={ry - 8} stroke="#2563EB" strokeWidth={1} />
            <SvgText x={rx + rw / 2} y={ry - 15} textAnchor="middle" fontSize={9} fill="#2563EB" fontWeight="700">
              {room.width} ft
            </SvgText>
          </G>
        )}

        {/* Height leader */}
        {isSelected && rh > 70 && (
          <G opacity={0.7}>
            <Line x1={rx + rw + 12} y1={ry} x2={rx + rw + 12} y2={ry + rh} stroke="#2563EB" strokeWidth={1} />
            <Line x1={rx + rw + 8} y1={ry} x2={rx + rw + 16} y2={ry} stroke="#2563EB" strokeWidth={1} />
            <Line x1={rx + rw + 8} y1={ry + rh} x2={rx + rw + 16} y2={ry + rh} stroke="#2563EB" strokeWidth={1} />
            <SvgText x={rx + rw + 24} y={ry + rh / 2 + 4} textAnchor="middle" fontSize={9} fill="#2563EB" fontWeight="700">
              {room.height} ft
            </SvgText>
          </G>
        )}

        {/* Resize handles */}
        {isSelected && handles.map((h) => (
          <Rect key={h.key} x={h.hx - HANDLE_VIS} y={h.hy - HANDLE_VIS}
            width={HANDLE_VIS * 2} height={HANDLE_VIS * 2}
            rx={2} fill="#fff" stroke="#2563EB" strokeWidth={2} />
        ))}

        {/* Rotation handle */}
        {isSelected && rw > 60 && (
          <G>
            <Line x1={rx + rw / 2} y1={ry - 12} x2={rx + rw / 2} y2={ry - 28} stroke="#2563EB" strokeWidth={1.5} opacity={0.7} />
            <Circle cx={rx + rw / 2} cy={ry - 34} r={8} fill="#fff" stroke="#2563EB" strokeWidth={2} />
            <SvgText x={rx + rw / 2} y={ry - 30} textAnchor="middle" fontSize={10} fill="#2563EB">↻</SvgText>
          </G>
        )}

        {/* Resize badge */}
        {activeDrag?.type === "resize" && activeDrag.room.id === room.id && (
          <G>
            <Rect x={rx + rw / 2 - 34} y={ry + rh / 2 - 13} width={68} height={26} rx={7} fill="#1E1B4B" opacity={0.92} />
            <SvgText x={rx + rw / 2} y={ry + rh / 2 + 6} textAnchor="middle" fontSize={11} fill="#fff" fontWeight="800">
              {room.width}×{room.height} ft
            </SvgText>
          </G>
        )}
      </AnimatedG>
    );
  });

  /* ── Draw preview ─────────────────────────────────── */
  let drawPreview: React.ReactElement | null = null;
  if (drawing) {
    const col = ROOM_COLORS[drawRoomType] ?? colors.primary;
    const px = drawing.w >= 0 ? drawing.x : drawing.x + drawing.w;
    const py = drawing.h >= 0 ? drawing.y : drawing.y + drawing.h;
    const pw = Math.abs(drawing.w), ph = Math.abs(drawing.h);
    const { gx: gx1, gy: gy1 } = toGrid(px, py);
    const { gx: gx2, gy: gy2 } = toGrid(px + pw, py + ph);
    const snW = Math.max(0, snap(Math.abs(gx2 - gx1)));
    const snH = Math.max(0, snap(Math.abs(gy2 - gy1)));
    drawPreview = (
      <G>
        <Rect x={px} y={py} width={pw} height={ph} fill={col} fillOpacity={0.2} stroke={col} strokeWidth={2} strokeDasharray="8,5" rx={3} />
        {pw > 50 && ph > 34 && (
          <>
            <Rect x={px + pw / 2 - 34} y={py + ph / 2 - 13} width={68} height={26} rx={7} fill="#1E1B4B" opacity={0.9} />
            <SvgText x={px + pw / 2} y={py + ph / 2 + 6} textAnchor="middle" fontSize={11} fill="#fff" fontWeight="800">
              {snW}×{snH} ft
            </SvgText>
          </>
        )}
      </G>
    );
  }

  /* ── Alignment guides ─────────────────────────────── */
  const guideEls = (activeDrag?.guides ?? []).map((g, i) => {
    if (g.type === "v") {
      const x = g.pos * G_PX * zoom + store.panX;
      return <Line key={i} x1={x} y1={0} x2={x} y2={svgH} stroke="#2563EB" strokeWidth={1} strokeDasharray="4,3" opacity={0.65} />;
    }
    const y = g.pos * G_PX * zoom + store.panY;
    return <Line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke="#2563EB" strokeWidth={1} strokeDasharray="4,3" opacity={0.65} />;
  });

  /* ── Selected room direction for compass ──────────── */
  const selectedRoom = selectedId ? store.currentPlan.rooms.find((r) => r.id === selectedId) : null;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
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
              return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={svgH} stroke={colors.border} strokeWidth={isMain ? 0.8 : 0.35} opacity={isMain ? 0.8 : 0.45} />;
            })}
            {Array.from({ length: Math.ceil(svgH / gSpacing) + 1 }).map((_, i) => {
              const y = offY + i * gSpacing;
              const isMain = i % 5 === 0;
              return <Line key={`h${i}`} x1={0} y1={y} x2={svgW} y2={y} stroke={colors.border} strokeWidth={isMain ? 0.8 : 0.35} opacity={isMain ? 0.8 : 0.45} />;
            })}
          </G>
        )}
        <G>{guideEls}</G>
        <G>{roomEls}</G>
        {drawPreview}
      </Svg>

      {/* Floating compass widget (React Native, not SVG) */}
      <View style={styles.compassWrap} pointerEvents="none">
        <CompassWidget selectedDirection={selectedRoom?.direction ?? null} size={76} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  compassWrap: {
    position: "absolute", top: 12, right: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
});
