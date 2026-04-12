import React, { useRef, useState } from "react";
import { View, PanResponder, GestureResponderEvent, PanResponderGestureState, Platform } from "react-native";
import Svg, { Rect, Text as SvgText, G, Line, Circle, Defs, Pattern, Path } from "react-native-svg";
import { useDesignerStore, Room } from "@/lib/store";
import { useColors } from "@/hooks/useColors";

const GRID_UNIT_SIZE = 20;

const ROOM_TYPE_LABELS: Record<Room["type"], string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bath",
  living_room: "Living",
  office: "Office",
  dining_room: "Dining",
};

interface FloorPlanCanvasProps {
  width: number;
  height: number;
  onRoomSelect?: (roomId: string | null) => void;
}

export function FloorPlanCanvas({ width, height, onRoomSelect }: FloorPlanCanvasProps) {
  const colors = useColors();
  const store = useDesignerStore();
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const lastPanRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: (_, gs) => {
        lastPanRef.current = { x: store.panX, y: store.panY };
        isDraggingRef.current = false;
      },
      onPanResponderMove: (_, gs: PanResponderGestureState) => {
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isDraggingRef.current = true;
        }
        store.setPan(lastPanRef.current.x + gs.dx, lastPanRef.current.y + gs.dy);
      },
      onPanResponderRelease: () => {
        if (!isDraggingRef.current) {
          onRoomSelect?.(null);
        }
      },
    })
  ).current;

  if (!store.currentPlan) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <SvgText fill={colors.muted} fontSize="14">No plan loaded</SvgText>
      </View>
    );
  }

  const svgWidth = canvasSize.width;
  const svgHeight = canvasSize.height;
  const gridSpacing = GRID_UNIT_SIZE * store.zoom;

  const gridLines: React.ReactElement[] = [];
  const startX = store.panX % gridSpacing;
  const startY = store.panY % gridSpacing;

  for (let x = startX; x < svgWidth; x += gridSpacing) {
    gridLines.push(
      <Line key={`v-${x}`} x1={x} y1={0} x2={x} y2={svgHeight} stroke={colors.border} strokeWidth="0.5" opacity={0.6} />
    );
  }
  for (let y = startY; y < svgHeight; y += gridSpacing) {
    gridLines.push(
      <Line key={`h-${y}`} x1={0} y1={y} x2={svgWidth} y2={y} stroke={colors.border} strokeWidth="0.5" opacity={0.6} />
    );
  }

  const roomElements = store.currentPlan.rooms.map((room) => {
    const x = room.x * GRID_UNIT_SIZE * store.zoom + store.panX;
    const y = room.y * GRID_UNIT_SIZE * store.zoom + store.panY;
    const roomWidth = room.width * GRID_UNIT_SIZE * store.zoom;
    const roomHeight = room.height * GRID_UNIT_SIZE * store.zoom;
    const isSelected = store.selectedRoomId === room.id;
    const color = (colors as any)[room.type] || colors.primary;
    const label = ROOM_TYPE_LABELS[room.type];

    return (
      <G key={room.id} onPress={() => onRoomSelect?.(room.id)}>
        <Rect
          x={x + 1}
          y={y + 1}
          width={roomWidth - 2}
          height={roomHeight - 2}
          fill={color}
          fillOpacity={isSelected ? 0.35 : 0.15}
          stroke={color}
          strokeWidth={isSelected ? 2.5 : 1.5}
          rx={4}
          ry={4}
        />
        {isSelected && (
          <Rect
            x={x - 1}
            y={y - 1}
            width={roomWidth + 2}
            height={roomHeight + 2}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4,3"
            rx={5}
            ry={5}
            opacity={0.5}
          />
        )}
        {roomWidth > 40 && roomHeight > 25 && (
          <SvgText
            x={x + roomWidth / 2}
            y={y + roomHeight / 2 + 4}
            textAnchor="middle"
            fontSize={Math.max(8, Math.min(13, roomWidth / 7))}
            fill={color}
            fontWeight="600"
          >
            {label}
          </SvgText>
        )}
        {roomWidth > 30 && roomHeight > 20 && (
          <SvgText
            x={x + 6}
            y={y + 14}
            fontSize={9}
            fill={color}
            opacity={0.8}
          >
            {room.direction}
          </SvgText>
        )}
      </G>
    );
  });

  const compassSize = 52;
  const compassX = svgWidth - compassSize - 12;
  const compassY = 12;
  const cx = compassX + compassSize / 2;
  const cy = compassY + compassSize / 2;
  const r = compassSize / 2;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background }}
      {...panResponder.panHandlers}
      onLayout={(e) => {
        setCanvasSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        });
      }}
    >
      <Svg width={svgWidth} height={svgHeight}>
        <G>{gridLines}</G>
        <G>{roomElements}</G>

        <Circle cx={cx} cy={cy} r={r} fill={colors.card} stroke={colors.border} strokeWidth={1} opacity={0.95} />
        <SvgText x={cx} y={compassY + 15} textAnchor="middle" fontSize={11} fill={colors.primary} fontWeight="700">N</SvgText>
        <SvgText x={compassX + compassSize - 6} y={cy + 5} textAnchor="middle" fontSize={9} fill={colors.muted}>E</SvgText>
        <SvgText x={cx} y={compassY + compassSize - 5} textAnchor="middle" fontSize={9} fill={colors.muted}>S</SvgText>
        <SvgText x={compassX + 6} y={cy + 5} textAnchor="middle" fontSize={9} fill={colors.muted}>W</SvgText>
        <Line x1={cx} y1={compassY + 4} x2={cx} y2={cy - 2} stroke={colors.primary} strokeWidth={1.5} />
        <Line x1={cx} y1={cy + 2} x2={cx} y2={compassY + compassSize - 8} stroke={colors.muted} strokeWidth={1} />
      </Svg>
    </View>
  );
}
