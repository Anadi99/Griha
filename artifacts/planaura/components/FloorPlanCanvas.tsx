import React, { useRef, useState, useCallback } from "react";
import {
  View,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
} from "react-native";
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

const G_PX = 20; // pixels per grid unit at zoom=1

export type ActiveTool = "select" | "draw" | "pan";

export type ResizeHandle = "TL" | "TC" | "TR" | "ML" | "MR" | "BL" | "BC" | "BR";

const HANDLE_R = 7;
const MIN_ROOM_GRID = 2; // minimum room dimension in grid units

const ROOM_LABELS: Record<Room["type"], string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bath",
  living_room: "Living",
  office: "Office",
  dining_room: "Dining",
};

interface DrawingRect {
  x: number; // screen px
  y: number;
  w: number;
  h: number;
}

interface MoveState {
  roomId: string;
  startRoomX: number;
  startRoomY: number;
  startTouchX: number;
  startTouchY: number;
}

interface ResizeState {
  roomId: string;
  handle: ResizeHandle;
  startRoom: Room;
  startTouchX: number;
  startTouchY: number;
}

interface FloorPlanCanvasProps {
  activeTool: ActiveTool;
  drawRoomType: Room["type"];
  onRoomSelect?: (roomId: string | null) => void;
  onRoomDrawn?: (room: Omit<Room, "id">) => void;
}

function snapGrid(v: number) {
  return Math.round(v);
}

export function FloorPlanCanvas({
  activeTool,
  drawRoomType,
  onRoomSelect,
  onRoomDrawn,
}: FloorPlanCanvasProps) {
  const colors = useColors();
  const store = useDesignerStore();

  const [size, setSize] = useState({ w: 375, h: 600 });
  const [drawing, setDrawing] = useState<DrawingRect | null>(null);

  // Refs for gesture state (avoid stale closures in PanResponder)
  const moveRef = useRef<MoveState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const panStartRef = useRef({ panX: 0, panY: 0 });
  const gestureStartRef = useRef({ x: 0, y: 0 });
  const didMoveRef = useRef(false);
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;

  // Convert screen → grid coords
  const toGrid = useCallback(
    (sx: number, sy: number) => ({
      gx: (sx - store.panX) / (G_PX * store.zoom),
      gy: (sy - store.panY) / (G_PX * store.zoom),
    }),
    [store.panX, store.panY, store.zoom]
  );

  // Convert grid → screen
  const toScreen = useCallback(
    (gx: number, gy: number) => ({
      sx: gx * G_PX * store.zoom + store.panX,
      sy: gy * G_PX * store.zoom + store.panY,
    }),
    [store.panX, store.panY, store.zoom]
  );

  // Hit test: which room is at screen point?
  const hitRoom = useCallback(
    (sx: number, sy: number): Room | null => {
      if (!store.currentPlan) return null;
      // Test in reverse order so top-most rooms are selected first
      const rooms = [...store.currentPlan.rooms].reverse();
      for (const room of rooms) {
        const { sx: rx, sy: ry } = toScreen(room.x, room.y);
        const rw = room.width * G_PX * store.zoom;
        const rh = room.height * G_PX * store.zoom;
        if (sx >= rx && sx <= rx + rw && sy >= ry && sy <= ry + rh) return room;
      }
      return null;
    },
    [store.currentPlan, toScreen, store.zoom]
  );

  // Hit test: which resize handle is at screen point for selected room?
  const hitHandle = useCallback(
    (sx: number, sy: number): ResizeHandle | null => {
      const room = store.currentPlan?.rooms.find((r) => r.id === store.selectedRoomId);
      if (!room) return null;
      const { sx: rx, sy: ry } = toScreen(room.x, room.y);
      const rw = room.width * G_PX * store.zoom;
      const rh = room.height * G_PX * store.zoom;
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
        const dist = Math.sqrt((sx - h.hx) ** 2 + (sy - h.hy) ** 2);
        if (dist <= HANDLE_R + 6) return h.key;
      }
      return null;
    },
    [store.currentPlan, store.selectedRoomId, toScreen, store.zoom]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,

      onPanResponderGrant: (evt) => {
        const { pageX: sx, pageY: sy } = evt.nativeEvent;
        gestureStartRef.current = { x: sx, y: sy };
        didMoveRef.current = false;
        moveRef.current = null;
        resizeRef.current = null;

        const tool = activeToolRef.current;

        if (tool === "pan") {
          panStartRef.current = { panX: store.panX, panY: store.panY };
          return;
        }

        if (tool === "select") {
          // Check resize handle first
          const handle = hitHandle(sx, sy);
          if (handle && store.selectedRoomId) {
            const room = store.currentPlan?.rooms.find((r) => r.id === store.selectedRoomId);
            if (room) {
              store.pushHistory();
              resizeRef.current = {
                roomId: room.id,
                handle,
                startRoom: { ...room },
                startTouchX: sx,
                startTouchY: sy,
              };
              return;
            }
          }
          // Check room hit
          const room = hitRoom(sx, sy);
          if (room) {
            store.pushHistory();
            moveRef.current = {
              roomId: room.id,
              startRoomX: room.x,
              startRoomY: room.y,
              startTouchX: sx,
              startTouchY: sy,
            };
          }
          return;
        }

        if (tool === "draw") {
          setDrawing({ x: sx, y: sy, w: 0, h: 0 });
          return;
        }
      },

      onPanResponderMove: (_, gs: PanResponderGestureState) => {
        if (Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3) didMoveRef.current = true;
        const tool = activeToolRef.current;

        if (tool === "pan") {
          store.setPan(
            panStartRef.current.panX + gs.dx,
            panStartRef.current.panY + gs.dy
          );
          return;
        }

        if (tool === "select") {
          if (resizeRef.current) {
            const { handle, startRoom, startTouchX, startTouchY } = resizeRef.current;
            const dg = {
              x: gs.dx / (G_PX * store.zoom),
              y: gs.dy / (G_PX * store.zoom),
            };
            let nx = startRoom.x;
            let ny = startRoom.y;
            let nw = startRoom.width;
            let nh = startRoom.height;

            if (handle.includes("L")) {
              const newX = snapGrid(startRoom.x + dg.x);
              const newW = snapGrid(startRoom.width - (newX - startRoom.x));
              if (newW >= MIN_ROOM_GRID) { nx = newX; nw = newW; }
            }
            if (handle.includes("R")) {
              nw = Math.max(MIN_ROOM_GRID, snapGrid(startRoom.width + dg.x));
            }
            if (handle.includes("T")) {
              const newY = snapGrid(startRoom.y + dg.y);
              const newH = snapGrid(startRoom.height - (newY - startRoom.y));
              if (newH >= MIN_ROOM_GRID) { ny = newY; nh = newH; }
            }
            if (handle.includes("B")) {
              nh = Math.max(MIN_ROOM_GRID, snapGrid(startRoom.height + dg.y));
            }
            // TC = only top vertical
            if (handle === "TC") {
              const newY = snapGrid(startRoom.y + dg.y);
              const newH = snapGrid(startRoom.height - (newY - startRoom.y));
              if (newH >= MIN_ROOM_GRID) { ny = newY; nh = newH; nx = startRoom.x; nw = startRoom.width; }
            }
            if (handle === "BC") {
              nh = Math.max(MIN_ROOM_GRID, snapGrid(startRoom.height + dg.y));
              nx = startRoom.x; nw = startRoom.width;
            }
            if (handle === "ML") {
              const newX = snapGrid(startRoom.x + dg.x);
              const newW = snapGrid(startRoom.width - (newX - startRoom.x));
              if (newW >= MIN_ROOM_GRID) { nx = newX; nw = newW; }
              ny = startRoom.y; nh = startRoom.height;
            }
            if (handle === "MR") {
              nw = Math.max(MIN_ROOM_GRID, snapGrid(startRoom.width + dg.x));
              ny = startRoom.y; nh = startRoom.height;
            }

            const area = nw * nh * 4;
            store.updateRoom(resizeRef.current.roomId, { x: nx, y: ny, width: nw, height: nh, area });
            store.calculateDirections();
            return;
          }

          if (moveRef.current) {
            const { roomId, startRoomX, startRoomY } = moveRef.current;
            const dgx = gs.dx / (G_PX * store.zoom);
            const dgy = gs.dy / (G_PX * store.zoom);
            const nx = Math.max(0, snapGrid(startRoomX + dgx));
            const ny = Math.max(0, snapGrid(startRoomY + dgy));
            store.updateRoom(roomId, { x: nx, y: ny });
            store.calculateDirections();
            return;
          }
          return;
        }

        if (tool === "draw") {
          const { x, y } = gestureStartRef.current;
          setDrawing({ x, y, w: gs.dx, h: gs.dy });
          return;
        }
      },

      onPanResponderRelease: (_, gs) => {
        const tool = activeToolRef.current;

        if (tool === "select") {
          resizeRef.current = null;
          if (moveRef.current) {
            moveRef.current = null;
            return;
          }
          if (!didMoveRef.current) {
            const { x, y } = gestureStartRef.current;
            const room = hitRoom(x, y);
            if (room) {
              onRoomSelect?.(room.id);
            } else {
              onRoomSelect?.(null);
            }
          }
          return;
        }

        if (tool === "draw") {
          const raw = drawing;
          setDrawing(null);
          if (!raw) return;
          const dx = Math.abs(raw.w);
          const dy = Math.abs(raw.h);
          if (dx < G_PX * store.zoom * MIN_ROOM_GRID || dy < G_PX * store.zoom * MIN_ROOM_GRID) return;

          const { gx: gx1, gy: gy1 } = toGrid(raw.x, raw.y);
          const { gx: gx2, gy: gy2 } = toGrid(raw.x + raw.w, raw.y + raw.h);
          const rx = snapGrid(Math.min(gx1, gx2));
          const ry = snapGrid(Math.min(gy1, gy2));
          const rw = Math.max(MIN_ROOM_GRID, snapGrid(Math.abs(gx2 - gx1)));
          const rh = Math.max(MIN_ROOM_GRID, snapGrid(Math.abs(gy2 - gy1)));

          onRoomDrawn?.({
            type: drawRoomType,
            x: Math.max(0, rx),
            y: Math.max(0, ry),
            width: rw,
            height: rh,
            direction: "N",
            area: rw * rh * 4,
          });
          return;
        }

        if (tool === "pan") return;

        // fallback select
        if (!didMoveRef.current) {
          const { x, y } = gestureStartRef.current;
          const room = hitRoom(x, y);
          onRoomSelect?.(room ? room.id : null);
        }
      },
    })
  ).current;

  if (!store.currentPlan) return null;

  const { w: svgW, h: svgH } = size;
  const gSpacing = G_PX * store.zoom;
  const offX = store.panX % gSpacing;
  const offY = store.panY % gSpacing;

  // Grid
  const gridLines: React.ReactElement[] = [];
  for (let x = offX; x < svgW; x += gSpacing) {
    const isMain = Math.round((x - offX) / gSpacing) % 5 === 0;
    gridLines.push(
      <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={svgH}
        stroke={colors.border} strokeWidth={isMain ? 0.8 : 0.4} opacity={isMain ? 0.8 : 0.5} />
    );
  }
  for (let y = offY; y < svgH; y += gSpacing) {
    const isMain = Math.round((y - offY) / gSpacing) % 5 === 0;
    gridLines.push(
      <Line key={`h${y}`} x1={0} y1={y} x2={svgW} y2={y}
        stroke={colors.border} strokeWidth={isMain ? 0.8 : 0.4} opacity={isMain ? 0.8 : 0.5} />
    );
  }

  // Rooms
  const roomEls = store.currentPlan.rooms.map((room) => {
    const { sx: rx, sy: ry } = toScreen(room.x, room.y);
    const rw = room.width * G_PX * store.zoom;
    const rh = room.height * G_PX * store.zoom;
    const isSelected = store.selectedRoomId === room.id;
    const col = (colors as any)[room.type] || colors.primary;
    const label = ROOM_LABELS[room.type];
    const widthFt = room.width;
    const heightFt = room.height;

    // Handle positions
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

    return (
      <G key={room.id}>
        {/* Room fill */}
        <Rect
          x={rx + 1} y={ry + 1}
          width={Math.max(0, rw - 2)} height={Math.max(0, rh - 2)}
          fill={col} fillOpacity={isSelected ? 0.3 : 0.12}
          stroke={col} strokeWidth={isSelected ? 2.5 : 1.5}
          rx={3} ry={3}
        />

        {/* Selection dashes */}
        {isSelected && (
          <Rect
            x={rx - 2} y={ry - 2}
            width={rw + 4} height={rh + 4}
            fill="none" stroke={col}
            strokeWidth={1} strokeDasharray="5,4"
            rx={5} ry={5} opacity={0.6}
          />
        )}

        {/* Room label */}
        {rw > 44 && rh > 28 && (
          <SvgText
            x={rx + rw / 2} y={ry + rh / 2 + (rh > 48 ? -6 : 4)}
            textAnchor="middle"
            fontSize={Math.max(9, Math.min(14, rw / 7))}
            fill={col} fontWeight="600"
          >
            {label}
          </SvgText>
        )}

        {/* Dimension label */}
        {isSelected && rw > 60 && rh > 44 && (
          <SvgText
            x={rx + rw / 2} y={ry + rh / 2 + 12}
            textAnchor="middle" fontSize={10}
            fill={col} opacity={0.85}
          >
            {widthFt}×{heightFt} ft
          </SvgText>
        )}

        {/* Direction badge */}
        {rw > 32 && rh > 22 && (
          <SvgText x={rx + 6} y={ry + 13} fontSize={9} fill={col} opacity={0.75}>
            {room.direction}
          </SvgText>
        )}

        {/* Width dimension line (top) */}
        {isSelected && rw > 60 && (
          <>
            <Line x1={rx} y1={ry - 10} x2={rx + rw} y2={ry - 10} stroke={col} strokeWidth={1} opacity={0.6} />
            <Line x1={rx} y1={ry - 14} x2={rx} y2={ry - 6} stroke={col} strokeWidth={1} opacity={0.6} />
            <Line x1={rx + rw} y1={ry - 14} x2={rx + rw} y2={ry - 6} stroke={col} strokeWidth={1} opacity={0.6} />
            <SvgText x={rx + rw / 2} y={ry - 13} textAnchor="middle" fontSize={9} fill={col} fontWeight="600">
              {widthFt} ft
            </SvgText>
          </>
        )}

        {/* Height dimension line (right) */}
        {isSelected && rh > 60 && (
          <>
            <Line x1={rx + rw + 10} y1={ry} x2={rx + rw + 10} y2={ry + rh} stroke={col} strokeWidth={1} opacity={0.6} />
            <Line x1={rx + rw + 6} y1={ry} x2={rx + rw + 14} y2={ry} stroke={col} strokeWidth={1} opacity={0.6} />
            <Line x1={rx + rw + 6} y1={ry + rh} x2={rx + rw + 14} y2={ry + rh} stroke={col} strokeWidth={1} opacity={0.6} />
            <SvgText x={rx + rw + 20} y={ry + rh / 2 + 4} textAnchor="middle" fontSize={9} fill={col} fontWeight="600">
              {heightFt}
            </SvgText>
          </>
        )}

        {/* Resize handles */}
        {isSelected && handles.map((h) => (
          <Circle
            key={h.key}
            cx={h.hx} cy={h.hy}
            r={HANDLE_R}
            fill={colors.card} stroke={col}
            strokeWidth={2}
          />
        ))}
      </G>
    );
  });

  // Drawing preview rect
  let drawPreview: React.ReactElement | null = null;
  if (drawing) {
    const col = (colors as any)[drawRoomType] || colors.primary;
    const px = drawing.w >= 0 ? drawing.x : drawing.x + drawing.w;
    const py = drawing.h >= 0 ? drawing.y : drawing.y + drawing.h;
    const pw = Math.abs(drawing.w);
    const ph = Math.abs(drawing.h);

    // Snap display
    const { gx: gx1, gy: gy1 } = toGrid(px, py);
    const { gx: gx2, gy: gy2 } = toGrid(px + pw, py + ph);
    const snW = Math.max(0, snapGrid(Math.abs(gx2 - gx1)));
    const snH = Math.max(0, snapGrid(Math.abs(gy2 - gy1)));

    drawPreview = (
      <G>
        <Rect
          x={px} y={py} width={pw} height={ph}
          fill={col} fillOpacity={0.18}
          stroke={col} strokeWidth={2}
          strokeDasharray="6,4"
          rx={3} ry={3}
        />
        {pw > 40 && ph > 28 && (
          <SvgText x={px + pw / 2} y={py + ph / 2 + 4}
            textAnchor="middle" fontSize={11} fill={col} fontWeight="700">
            {snW}×{snH} ft
          </SvgText>
        )}
      </G>
    );
  }

  // Compass
  const cS = 48;
  const cX = svgW - cS - 14;
  const cY = 14;
  const ccx = cX + cS / 2;
  const ccy = cY + cS / 2;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      {...panResponder.panHandlers}
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      <Svg width={svgW} height={svgH}>
        <G>{gridLines}</G>
        <G>{roomEls}</G>
        {drawPreview}

        {/* Compass */}
        <Circle cx={ccx} cy={ccy} r={cS / 2} fill={colors.card} stroke={colors.border} strokeWidth={1} opacity={0.92} />
        <SvgText x={ccx} y={cY + 13} textAnchor="middle" fontSize={11} fill={colors.primary} fontWeight="800">N</SvgText>
        <SvgText x={cX + cS - 5} y={ccy + 4} textAnchor="middle" fontSize={8} fill={colors.muted}>E</SvgText>
        <SvgText x={ccx} y={cY + cS - 5} textAnchor="middle" fontSize={8} fill={colors.muted}>S</SvgText>
        <SvgText x={cX + 5} y={ccy + 4} textAnchor="middle" fontSize={8} fill={colors.muted}>W</SvgText>
        <Line x1={ccx} y1={cY + 5} x2={ccx} y2={ccy - 2} stroke={colors.primary} strokeWidth={1.5} />
        <Line x1={ccx} y1={ccy + 2} x2={ccx} y2={cY + cS - 8} stroke={colors.muted} strokeWidth={1} opacity={0.6} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
