/**
 * FloorPlanCanvas — Figma-grade interactive canvas
 *
 * Performance architecture:
 * - Gesture state lives in refs (zero re-renders during drag)
 * - Dragged/resized room stored in local `activeDrag` state so only
 *   this component re-renders; the global store is updated on release
 * - Pan inertia uses requestAnimationFrame with exponential decay
 * - Pinch-to-zoom computes new panX/panY so the pinch midpoint is stable
 */

import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, PanResponder, StyleSheet, Platform } from "react-native";
import Svg, {
  Rect,
  Text as SvgText,
  G,
  Line,
  Circle,
  Path,
} from "react-native-svg";
import { useDesignerStore, Room } from "@/lib/store";
import { useColors } from "@/hooks/useColors";

/* ── Constants ──────────────────────────────────────── */
const G_PX = 20;          // pixels per grid unit at zoom=1
const MIN_DIM = 2;        // minimum room dimension in grid units
const HANDLE_HIT = 14;    // handle hit radius (px)
const HANDLE_VIS = 6;     // handle visual radius (px)
const SNAP_GUIDE_THRESH = 0.6; // grid units — alignment guide threshold
const INERTIA_DECAY = 0.88;    // pan inertia decay per frame
const INERTIA_STOP = 0.3;      // stop inertia below this velocity

/* ── Types ──────────────────────────────────────────── */
export type ActiveTool = "select" | "draw" | "pan";
export type ResizeHandle = "TL" | "TC" | "TR" | "ML" | "MR" | "BL" | "BC" | "BR";

const ROOM_LABELS: Record<Room["type"], string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bath",
  living_room: "Living",
  office: "Office",
  dining_room: "Dining",
};

const ROOM_COLORS: Record<Room["type"], string> = {
  bedroom: "#4F46E5",
  kitchen: "#F97316",
  bathroom: "#0EA5E9",
  living_room: "#7C3AED",
  office: "#059669",
  dining_room: "#EC4899",
};

interface DrawRect { x: number; y: number; w: number; h: number }

interface ActiveDrag {
  type: "move" | "resize";
  room: Room;   // live-updated position during gesture
  guides: Guide[];
}

interface Guide { type: "h" | "v"; pos: number }  // grid coordinates

interface PinchState {
  initialDistance: number;
  initialZoom: number;
  midX: number;
  midY: number;
  initialPanX: number;
  initialPanY: number;
}

/* ── Props ──────────────────────────────────────────── */
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

    for (const [a, b] of [[mL, rL], [mL, rR], [mR, rL], [mR, rR], [mCX, rCX]]) {
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("v", b);
    }
    for (const [a, b] of [[mT, rT], [mT, rB], [mB, rT], [mB, rB], [mCY, rCY]]) {
      if (Math.abs(a - b) < SNAP_GUIDE_THRESH) add("h", b);
    }
  }
  return guides;
}

/* ── Component ──────────────────────────────────────── */
export function FloorPlanCanvas({
  activeTool, drawRoomType, showGrid, onRoomSelect, onRoomDrawn,
}: FloorPlanCanvasProps) {
  const colors = useColors();
  const store = useDesignerStore();

  const [size, setSize] = useState({ w: 375, h: 600 });
  const [drawing, setDrawing] = useState<DrawRect | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);

  /* ── Refs ─────────────────────────────────────────── */
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  // Keep live view of store values without stale closures
  const zoomRef = useRef(store.zoom);
  const panXRef = useRef(store.panX);
  const panYRef = useRef(store.panY);
  zoomRef.current = store.zoom;
  panXRef.current = store.panX;
  panYRef.current = store.panY;

  const selectedRoomIdRef = useRef(store.selectedRoomId);
  selectedRoomIdRef.current = store.selectedRoomId;

  const planRef = useRef(store.currentPlan);
  planRef.current = store.currentPlan;

  // Gesture refs
  const gestureStart = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);
  const panStart = useRef({ panX: 0, panY: 0 });
  const moveStart = useRef<{ roomId: string; room: Room; sx: number; sy: number } | null>(null);
  const resizeStart = useRef<{ room: Room; handle: ResizeHandle; sx: number; sy: number } | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const isPinching = useRef(false);

  // Inertia
  const velX = useRef(0);
  const velY = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMovePan = useRef({ x: 0, y: 0 });
  const inertiaRaf = useRef<any>(null);

  /* ── Coordinate helpers ───────────────────────────── */
  const toScreen = useCallback((gx: number, gy: number) => ({
    sx: gx * G_PX * zoomRef.current + panXRef.current,
    sy: gy * G_PX * zoomRef.current + panYRef.current,
  }), []);

  const toGrid = useCallback((sx: number, sy: number) => ({
    gx: (sx - panXRef.current) / (G_PX * zoomRef.current),
    gy: (sy - panYRef.current) / (G_PX * zoomRef.current),
  }), []);

  /* ── Hit testing ──────────────────────────────────── */
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
    const selId = selectedRoomIdRef.current;
    if (!plan || !selId) return null;
    const room = plan.rooms.find((r) => r.id === selId);
    if (!room) return null;
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * zoomRef.current;
    const rh = room.height * G_PX * zoomRef.current;
    const handles: Array<{ key: ResizeHandle; hx: number; hy: number }> = [
      { key: "TL", hx: rx, hy: ry },
      { key: "TC", hx: rx + rw / 2, hy: ry },
      { key: "TR", hx: rx + rw, hy: ry },
      { key: "ML", hx: rx, hy: ry + rh / 2 },
      { key: "MR", hx: rx + rw, hy: ry + rh / 2 },
      { key: "BL", hx: rx, hy: ry + rh },
      { key: "BC", hx: rx + rw / 2, hy: ry + rh },
      { key: "BR", hx: rx + rw, hy: ry + rh },
    ];
    for (const h of handles) {
      if (ptDist(sx, sy, h.hx, h.hy) <= HANDLE_HIT) return h.key;
    }
    return null;
  }, [toScreen]);

  /* ── Inertia ──────────────────────────────────────── */
  const stopInertia = () => {
    if (inertiaRaf.current != null) {
      cancelAnimationFrame(inertiaRaf.current);
      inertiaRaf.current = null;
    }
  };

  const startInertia = useCallback(() => {
    stopInertia();
    const step = () => {
      velX.current *= INERTIA_DECAY;
      velY.current *= INERTIA_DECAY;
      if (Math.abs(velX.current) < INERTIA_STOP && Math.abs(velY.current) < INERTIA_STOP) {
        stopInertia();
        return;
      }
      store.setPan(panXRef.current + velX.current, panYRef.current + velY.current);
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  }, [store]);

  /* ── Resize logic ─────────────────────────────────── */
  function applyResize(startRoom: Room, handle: ResizeHandle, dgx: number, dgy: number): Room {
    let { x, y, width, height } = startRoom;

    if (handle.includes("L")) {
      const newX = snap(startRoom.x + dgx);
      const newW = snap(startRoom.width - (newX - startRoom.x));
      if (newW >= MIN_DIM) { x = newX; width = newW; }
    } else if (handle.includes("R") || handle === "MR") {
      width = Math.max(MIN_DIM, snap(startRoom.width + dgx));
    }

    if (handle.includes("T") && handle !== "TC") {
      const newY = snap(startRoom.y + dgy);
      const newH = snap(startRoom.height - (newY - startRoom.y));
      if (newH >= MIN_DIM) { y = newY; height = newH; }
    } else if (handle === "TC") {
      const newY = snap(startRoom.y + dgy);
      const newH = snap(startRoom.height - (newY - startRoom.y));
      if (newH >= MIN_DIM) { y = newY; height = newH; x = startRoom.x; width = startRoom.width; }
    } else if (handle.includes("B") || handle === "BC") {
      height = Math.max(MIN_DIM, snap(startRoom.height + dgy));
      if (handle === "BC") { x = startRoom.x; width = startRoom.width; }
    }

    if (handle === "ML") { y = startRoom.y; height = startRoom.height; }

    return { ...startRoom, x, y, width, height, area: width * height * 4 };
  }

  /* ── PanResponder ─────────────────────────────────── */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,

      onPanResponderGrant: (evt) => {
        stopInertia();
        velX.current = 0;
        velY.current = 0;
        didMove.current = false;
        moveStart.current = null;
        resizeStart.current = null;
        pinchRef.current = null;
        isPinching.current = false;

        const touches = evt.nativeEvent.touches;
        if (touches && touches.length >= 2) {
          isPinching.current = true;
          return;
        }

        const sx = evt.nativeEvent.pageX;
        const sy = evt.nativeEvent.pageY;
        gestureStart.current = { x: sx, y: sy };
        lastMoveTime.current = Date.now();
        lastMovePan.current = { x: panXRef.current, y: panYRef.current };

        const tool = activeToolRef.current;

        if (tool === "pan") {
          panStart.current = { panX: panXRef.current, panY: panYRef.current };
          return;
        }

        if (tool === "select") {
          const handle = hitHandle(sx, sy);
          if (handle) {
            const plan = planRef.current;
            const selId = selectedRoomIdRef.current;
            const room = plan?.rooms.find((r) => r.id === selId);
            if (room) {
              store.pushHistory();
              resizeStart.current = { room: { ...room }, handle, sx, sy };
            }
            return;
          }
          const room = hitRoom(sx, sy);
          if (room) {
            store.pushHistory();
            moveStart.current = { roomId: room.id, room: { ...room }, sx, sy };
          }
          return;
        }

        if (tool === "draw") {
          setDrawing({ x: sx, y: sy, w: 0, h: 0 });
        }
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;

        // ── Pinch-to-zoom ─────────────────────────────
        if (touches && touches.length >= 2) {
          isPinching.current = true;
          const t0 = touches[0], t1 = touches[1];
          const dist = ptDist(t0.pageX, t0.pageY, t1.pageX, t1.pageY);
          const midX = (t0.pageX + t1.pageX) / 2;
          const midY = (t0.pageY + t1.pageY) / 2;

          if (!pinchRef.current) {
            pinchRef.current = {
              initialDistance: dist,
              initialZoom: zoomRef.current,
              midX, midY,
              initialPanX: panXRef.current,
              initialPanY: panYRef.current,
            };
            return;
          }

          const { initialDistance, initialZoom, initialPanX, initialPanY } = pinchRef.current;
          const newZoom = Math.max(0.2, Math.min(6, initialZoom * (dist / initialDistance)));
          const ratio = newZoom / initialZoom;
          const newPanX = midX - (midX - initialPanX) * ratio + (midX - pinchRef.current.midX);
          const newPanY = midY - (midY - initialPanY) * ratio + (midY - pinchRef.current.midY);
          store.setZoom(newZoom);
          store.setPan(newPanX, newPanY);
          return;
        }

        if (isPinching.current) return;

        if (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3) didMove.current = true;
        const tool = activeToolRef.current;

        // ── Pan ───────────────────────────────────────
        if (tool === "pan") {
          const now = Date.now();
          const dt = now - lastMoveTime.current;
          const newPX = panStart.current.panX + gs.dx;
          const newPY = panStart.current.panY + gs.dy;
          if (dt > 0) {
            velX.current = (newPX - lastMovePan.current.x) * (1 / dt) * 16;
            velY.current = (newPY - lastMovePan.current.y) * (1 / dt) * 16;
          }
          lastMoveTime.current = now;
          lastMovePan.current = { x: newPX, y: newPY };
          store.setPan(newPX, newPY);
          return;
        }

        // ── Resize ────────────────────────────────────
        if (tool === "select" && resizeStart.current) {
          const { room: startRoom, handle } = resizeStart.current;
          const dgx = gs.dx / (G_PX * zoomRef.current);
          const dgy = gs.dy / (G_PX * zoomRef.current);
          const updated = applyResize(startRoom, handle, dgx, dgy);
          setActiveDrag({ type: "resize", room: updated, guides: [] });
          return;
        }

        // ── Move ──────────────────────────────────────
        if (tool === "select" && moveStart.current) {
          const { room: startRoom } = moveStart.current;
          const dgx = gs.dx / (G_PX * zoomRef.current);
          const dgy = gs.dy / (G_PX * zoomRef.current);
          const nx = Math.max(0, snap(startRoom.x + dgx));
          const ny = Math.max(0, snap(startRoom.y + dgy));
          const updated: Room = { ...startRoom, x: nx, y: ny };
          const allRooms = planRef.current?.rooms ?? [];
          const guides = computeGuides(updated, allRooms);
          setActiveDrag({ type: "move", room: updated, guides });
          return;
        }

        // ── Draw ──────────────────────────────────────
        if (tool === "draw") {
          setDrawing({ x: gestureStart.current.x, y: gestureStart.current.y, w: gs.dx, h: gs.dy });
        }
      },

      onPanResponderRelease: (_, gs) => {
        const wasPinch = isPinching.current;
        isPinching.current = false;
        pinchRef.current = null;

        const tool = activeToolRef.current;

        // Start inertia if panning
        if (tool === "pan" && !wasPinch) {
          startInertia();
        }

        // Commit resize
        if (tool === "select" && resizeStart.current) {
          const { room: startRoom, handle } = resizeStart.current;
          const dgx = gs.dx / (G_PX * zoomRef.current);
          const dgy = gs.dy / (G_PX * zoomRef.current);
          const updated = applyResize(startRoom, handle, dgx, dgy);
          store.updateRoom(updated.id, {
            x: updated.x, y: updated.y, width: updated.width, height: updated.height, area: updated.area,
          });
          store.calculateDirections();
          resizeStart.current = null;
          setActiveDrag(null);
          return;
        }

        // Commit move
        if (tool === "select" && moveStart.current && didMove.current) {
          const { room: startRoom } = moveStart.current;
          const dgx = gs.dx / (G_PX * zoomRef.current);
          const dgy = gs.dy / (G_PX * zoomRef.current);
          const nx = Math.max(0, snap(startRoom.x + dgx));
          const ny = Math.max(0, snap(startRoom.y + dgy));
          store.updateRoom(moveStart.current.roomId, { x: nx, y: ny });
          store.calculateDirections();
          moveStart.current = null;
          setActiveDrag(null);
          return;
        }

        // Tap to select (no drag)
        if (tool === "select" && !didMove.current && !wasPinch) {
          moveStart.current = null;
          const { x, y } = gestureStart.current;
          const room = hitRoom(x, y);
          onRoomSelect?.(room ? room.id : null);
          setActiveDrag(null);
          return;
        }

        // Commit draw
        if (tool === "draw" && drawing) {
          const raw = drawing;
          setDrawing(null);
          const dx = Math.abs(raw.w);
          const dy = Math.abs(raw.h);
          if (dx < G_PX * zoomRef.current * MIN_DIM || dy < G_PX * zoomRef.current * MIN_DIM) return;

          const { gx: gx1, gy: gy1 } = toGrid(raw.x, raw.y);
          const { gx: gx2, gy: gy2 } = toGrid(raw.x + raw.w, raw.y + raw.h);
          const rx = snap(Math.min(gx1, gx2));
          const ry = snap(Math.min(gy1, gy2));
          const rw = Math.max(MIN_DIM, snap(Math.abs(gx2 - gx1)));
          const rh = Math.max(MIN_DIM, snap(Math.abs(gy2 - gy1)));
          onRoomDrawn?.({ type: drawRoomType, x: Math.max(0, rx), y: Math.max(0, ry), width: rw, height: rh, direction: "N", area: rw * rh * 4 });
          return;
        }

        moveStart.current = null;
        setActiveDrag(null);
      },

      onPanResponderTerminate: () => {
        moveStart.current = null;
        resizeStart.current = null;
        pinchRef.current = null;
        isPinching.current = false;
        setActiveDrag(null);
        setDrawing(null);
      },
    })
  ).current;

  /* ── Cleanup ──────────────────────────────────────── */
  useEffect(() => () => stopInertia(), []);

  if (!store.currentPlan) return null;

  /* ── Render helpers ───────────────────────────────── */
  const { w: svgW, h: svgH } = size;
  const zoom = store.zoom;
  const gSpacing = G_PX * zoom;

  // Grid
  const offX = ((store.panX % gSpacing) + gSpacing) % gSpacing;
  const offY = ((store.panY % gSpacing) + gSpacing) % gSpacing;

  // Current positions of all rooms (replace active drag room with live data)
  const allRooms = store.currentPlan.rooms.map((room) => {
    if (activeDrag && room.id === activeDrag.room.id) return activeDrag.room;
    return room;
  });

  const selectedId = store.selectedRoomId;

  // Build room elements
  const roomEls = allRooms.map((room) => {
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * zoom;
    const rh = room.height * G_PX * zoom;
    const isSelected = selectedId === room.id;
    const isBeingDragged = activeDrag?.room.id === room.id;
    const col = ROOM_COLORS[room.type] ?? colors.primary;

    // Handles
    const handles: Array<{ key: ResizeHandle; hx: number; hy: number }> = [
      { key: "TL", hx: rx, hy: ry },
      { key: "TC", hx: rx + rw / 2, hy: ry },
      { key: "TR", hx: rx + rw, hy: ry },
      { key: "ML", hx: rx, hy: ry + rh / 2 },
      { key: "MR", hx: rx + rw, hy: ry + rh / 2 },
      { key: "BL", hx: rx, hy: ry + rh },
      { key: "BC", hx: rx + rw / 2, hy: ry + rh },
      { key: "BR", hx: rx + rw, hy: ry + rh },
    ];

    const showDims = isSelected && (activeDrag?.type === "resize" || isBeingDragged);
    const showFullDims = isSelected && rw > 80 && rh > 60;

    return (
      <G key={room.id}>
        {/* Drop shadow for selected */}
        {isSelected && (
          <Rect
            x={rx + 3} y={ry + 3}
            width={Math.max(0, rw)} height={Math.max(0, rh)}
            fill={col} fillOpacity={0.15} rx={4}
          />
        )}

        {/* Room body */}
        <Rect
          x={rx} y={ry}
          width={Math.max(0, rw)} height={Math.max(0, rh)}
          fill={col}
          fillOpacity={isSelected ? 0.25 : isBeingDragged ? 0.35 : 0.12}
          stroke={col}
          strokeWidth={isSelected ? 2 : 1.5}
          rx={3}
        />

        {/* Selection bounding box (Figma-style blue) */}
        {isSelected && (
          <Rect
            x={rx - 1} y={ry - 1}
            width={rw + 2} height={rh + 2}
            fill="none"
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="5,3"
            rx={4}
            opacity={0.85}
          />
        )}

        {/* Room label */}
        {rw > 50 && rh > 32 && (
          <SvgText
            x={rx + rw / 2}
            y={ry + rh / 2 + (rh > 56 ? -8 : 5)}
            textAnchor="middle"
            fontSize={Math.min(13, Math.max(9, rw / 8))}
            fill={col} fontWeight="700"
          >
            {ROOM_LABELS[room.type]}
          </SvgText>
        )}

        {/* Dimension label (always for selected) */}
        {isSelected && rw > 60 && rh > 52 && (
          <SvgText
            x={rx + rw / 2}
            y={ry + rh / 2 + (rh > 56 ? 10 : 18)}
            textAnchor="middle" fontSize={10}
            fill={col} opacity={0.9}
          >
            {room.width} × {room.height} ft
          </SvgText>
        )}

        {/* Direction badge */}
        {rw > 28 && rh > 20 && (
          <SvgText x={rx + 6} y={ry + 13} fontSize={8} fill={col} opacity={0.7}>
            {room.direction}
          </SvgText>
        )}

        {/* Dimension leaders (selected) */}
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

        {/* Resize handles — square Figma-style */}
        {isSelected && handles.map((h) => (
          <Rect
            key={h.key}
            x={h.hx - HANDLE_VIS} y={h.hy - HANDLE_VIS}
            width={HANDLE_VIS * 2} height={HANDLE_VIS * 2}
            rx={2}
            fill="#fff" stroke="#2563EB" strokeWidth={2}
          />
        ))}

        {/* Rotation handle (above, centered) */}
        {isSelected && rw > 60 && (
          <G>
            <Line x1={rx + rw / 2} y1={ry - 12} x2={rx + rw / 2} y2={ry - 28} stroke="#2563EB" strokeWidth={1.5} opacity={0.7} />
            <Circle cx={rx + rw / 2} cy={ry - 34} r={8} fill="#fff" stroke="#2563EB" strokeWidth={2} />
            <SvgText x={rx + rw / 2} y={ry - 30} textAnchor="middle" fontSize={10} fill="#2563EB">↻</SvgText>
          </G>
        )}

        {/* Resize dimension badge (during resize) */}
        {activeDrag?.type === "resize" && activeDrag.room.id === room.id && (
          <G>
            <Rect
              x={rx + rw / 2 - 32} y={ry + rh / 2 - 12}
              width={64} height={24}
              rx={6} fill="#1E1B4B" opacity={0.92}
            />
            <SvgText
              x={rx + rw / 2} y={ry + rh / 2 + 5}
              textAnchor="middle" fontSize={11} fill="#fff" fontWeight="800"
            >
              {room.width}×{room.height} ft
            </SvgText>
          </G>
        )}
      </G>
    );
  });

  // Draw preview
  let drawPreview: React.ReactElement | null = null;
  if (drawing) {
    const col = ROOM_COLORS[drawRoomType] ?? colors.primary;
    const px = drawing.w >= 0 ? drawing.x : drawing.x + drawing.w;
    const py = drawing.h >= 0 ? drawing.y : drawing.y + drawing.h;
    const pw = Math.abs(drawing.w);
    const ph = Math.abs(drawing.h);
    const { gx: gx1, gy: gy1 } = toGrid(px, py);
    const { gx: gx2, gy: gy2 } = toGrid(px + pw, py + ph);
    const snW = Math.max(0, snap(Math.abs(gx2 - gx1)));
    const snH = Math.max(0, snap(Math.abs(gy2 - gy1)));

    drawPreview = (
      <G>
        <Rect
          x={px} y={py} width={pw} height={ph}
          fill={col} fillOpacity={0.2}
          stroke={col} strokeWidth={2}
          strokeDasharray="8,5" rx={3}
        />
        {pw > 50 && ph > 34 && (
          <>
            <Rect
              x={px + pw / 2 - 32} y={py + ph / 2 - 12}
              width={64} height={22} rx={6}
              fill="#1E1B4B" opacity={0.9}
            />
            <SvgText x={px + pw / 2} y={py + ph / 2 + 4}
              textAnchor="middle" fontSize={11} fill="#fff" fontWeight="800">
              {snW}×{snH} ft
            </SvgText>
          </>
        )}
      </G>
    );
  }

  // Alignment guides (in screen coords)
  const guideEls = (activeDrag?.guides ?? []).map((g, i) => {
    if (g.type === "v") {
      const x = g.pos * G_PX * zoom + store.panX;
      return <Line key={i} x1={x} y1={0} x2={x} y2={svgH} stroke="#2563EB" strokeWidth={1} strokeDasharray="4,3" opacity={0.65} />;
    } else {
      const y = g.pos * G_PX * zoom + store.panY;
      return <Line key={i} x1={0} y1={y} x2={svgW} y2={y} stroke="#2563EB" strokeWidth={1} strokeDasharray="4,3" opacity={0.65} />;
    }
  });

  // Compass
  const cS = 44;
  const cX = svgW - cS - 12;
  const cY = 12;
  const ccx = cX + cS / 2;
  const ccy = cY + cS / 2;

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
              return (
                <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={svgH}
                  stroke={colors.border}
                  strokeWidth={isMain ? 0.8 : 0.35}
                  opacity={isMain ? 0.8 : 0.45}
                />
              );
            })}
            {Array.from({ length: Math.ceil(svgH / gSpacing) + 1 }).map((_, i) => {
              const y = offY + i * gSpacing;
              const isMain = i % 5 === 0;
              return (
                <Line key={`h${i}`} x1={0} y1={y} x2={svgW} y2={y}
                  stroke={colors.border}
                  strokeWidth={isMain ? 0.8 : 0.35}
                  opacity={isMain ? 0.8 : 0.45}
                />
              );
            })}
          </G>
        )}

        {/* Alignment guides */}
        <G>{guideEls}</G>

        {/* Rooms */}
        <G>{roomEls}</G>

        {/* Draw preview */}
        {drawPreview}

        {/* Compass */}
        <Circle cx={ccx} cy={ccy} r={cS / 2} fill={colors.card} stroke={colors.border} strokeWidth={1} opacity={0.93} />
        <SvgText x={ccx} y={cY + 12} textAnchor="middle" fontSize={10} fill={colors.primary} fontWeight="800">N</SvgText>
        <SvgText x={cX + cS - 5} y={ccy + 4} textAnchor="middle" fontSize={7} fill={colors.muted}>E</SvgText>
        <SvgText x={ccx} y={cY + cS - 5} textAnchor="middle" fontSize={7} fill={colors.muted}>S</SvgText>
        <SvgText x={cX + 5} y={ccy + 4} textAnchor="middle" fontSize={7} fill={colors.muted}>W</SvgText>
        <Line x1={ccx} y1={cY + 5} x2={ccx} y2={ccy - 2} stroke={colors.primary} strokeWidth={1.5} />
        <Line x1={ccx} y1={ccy + 2} x2={ccx} y2={cY + cS - 8} stroke={colors.muted} strokeWidth={1} opacity={0.5} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
