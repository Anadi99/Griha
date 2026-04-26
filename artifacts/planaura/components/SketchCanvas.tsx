/**
 * SketchCanvas — Lorien-inspired freehand drawing canvas
 * Integrated into Designer — dark canvas, full color palette, brush types
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, PanResponder, StyleSheet, Animated, useColorScheme, Text, ScrollView } from "react-native";
import Svg, { Path, G, Line, Rect } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";

/* ── Constants ── */
const G_PX = 20;
const INERTIA_DECAY = 0.88;
const INERTIA_STOP = 0.3;
const MIN_DISTANCE = 2.5;
const ANGLE_THRESHOLD = 0.6;

/* ── Types ── */
interface Point { x: number; y: number }

export type BrushType = "pen" | "brush" | "marker" | "pencil" | "line" | "rect";

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  brushType: BrushType;
  opacity: number;
  isEraser: boolean;
}

/* ── Color palette — 16 colors ── */
export const SKETCH_PALETTE = [
  "#FFFFFF", "#000000", "#8B5E3C", "#C4714A",
  "#C084FC", "#38BDF8", "#34D399", "#6366F1",
  "#FB923C", "#FACC15", "#F472B6", "#EF4444",
  "#22C55E", "#3B82F6", "#A78BFA", "#94A3B8",
];

/* ── Brush configs ── */
export const BRUSH_TYPES: Array<{ type: BrushType; icon: string; label: string }> = [
  { type: "pen",    icon: "edit-3",   label: "Pen"    },
  { type: "brush",  icon: "pen-tool", label: "Brush"  },
  { type: "marker", icon: "minus",    label: "Marker" },
  { type: "pencil", icon: "feather",  label: "Pencil" },
  { type: "line",   icon: "minus",    label: "Line"   },
  { type: "rect",   icon: "square",   label: "Rect"   },
];

export const BRUSH_SIZES = [1, 3, 6, 12, 20];

/* ── Brush opacity by type ── */
function getBrushOpacity(type: BrushType): number {
  switch (type) {
    case "pen":    return 1.0;
    case "brush":  return 0.75;
    case "marker": return 0.55;
    case "pencil": return 0.45;
    default:       return 1.0;
  }
}

/* ── Stroke width multiplier by type ── */
function getWidthMultiplier(type: BrushType): number {
  switch (type) {
    case "marker": return 2.2;
    case "brush":  return 1.6;
    case "pencil": return 0.8;
    default:       return 1.0;
  }
}

/* ── Stroke optimizer ── */
function optimizePoints(pts: Point[]): Point[] {
  if (pts.length < 6) return pts;
  const out: Point[] = [pts[0]];
  let prevAngle = 0;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], cur = pts[i];
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const angleDiff = Math.abs(Math.abs(angle) - Math.abs(prevAngle));
    prevAngle = angle;
    if (dist > MIN_DISTANCE || angleDiff >= ANGLE_THRESHOLD) out.push(cur);
  }
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
  return out;
}

/* ── Build smooth SVG path ── */
function buildPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2)
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const cp2x = (pts[i].x + pts[i + 1].x) / 2;
    const cp2y = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

export interface SketchCanvasProps {
  showGrid?: boolean;
  canvasRef?: React.RefObject<View>;
}


export function SketchCanvas({ showGrid = true, canvasRef }: SketchCanvasProps) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";

  const [size, setSize] = useState({ w: 375, h: 600 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [livePoints, setLivePoints] = useState<Point[]>([]);
  const [brushType, setBrushType] = useState<BrushType>("pen");
  const [brushColor, setBrushColor] = useState("#FFFFFF");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  // For line/rect tools
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null);

  const liveRef = useRef<Point[]>([]);
  const zoomRef = useRef(1); zoomRef.current = zoom;
  const panXRef = useRef(0); panXRef.current = panX;
  const panYRef = useRef(0); panYRef.current = panY;
  const brushTypeRef = useRef<BrushType>("pen"); brushTypeRef.current = brushType;
  const colorRef = useRef("#FFFFFF"); colorRef.current = brushColor;
  const sizeRef = useRef(3); sizeRef.current = brushSize;
  const eraserRef = useRef(false); eraserRef.current = isEraser;
  const isDrawing = useRef(false);
  const isPinching = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number; midX: number; midY: number; panX: number; panY: number } | null>(null);
  const velX = useRef(0); const velY = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMovePan = useRef({ x: 0, y: 0 });
  const inertiaRaf = useRef<any>(null);

  function ptDist(ax: number, ay: number, bx: number, by: number) {
    return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  }

  const stopInertia = () => {
    if (inertiaRaf.current) { cancelAnimationFrame(inertiaRaf.current); inertiaRaf.current = null; }
  };

  const startInertia = useCallback(() => {
    stopInertia();
    const step = () => {
      velX.current *= INERTIA_DECAY; velY.current *= INERTIA_DECAY;
      if (Math.abs(velX.current) < INERTIA_STOP && Math.abs(velY.current) < INERTIA_STOP) { stopInertia(); return; }
      panXRef.current += velX.current; panYRef.current += velY.current;
      setPanX(panXRef.current); setPanY(panYRef.current);
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  }, []);

  const isShapeTool = (t: BrushType) => t === "line" || t === "rect";

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 1 || Math.abs(gs.dy) > 1,

    onPanResponderGrant: (evt) => {
      stopInertia();
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) { isPinching.current = true; return; }
      isPinching.current = false;
      const sx = evt.nativeEvent.pageX, sy = evt.nativeEvent.pageY;
      const tool = brushTypeRef.current;

      if (isShapeTool(tool)) {
        shapeStartRef.current = { x: sx, y: sy };
        setShapeStart({ x: sx, y: sy });
        setShapeEnd({ x: sx, y: sy });
        isDrawing.current = true;
      } else if (!eraserRef.current) {
        isDrawing.current = true;
        liveRef.current = [{ x: sx, y: sy }];
        setLivePoints([{ x: sx, y: sy }]);
      } else {
        isDrawing.current = true;
        liveRef.current = [{ x: sx, y: sy }];
        setLivePoints([{ x: sx, y: sy }]);
      }
    },

    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        isPinching.current = true; isDrawing.current = false;
        liveRef.current = []; setLivePoints([]); setShapeEnd(null);
        const t0 = touches[0], t1 = touches[1];
        const dist = ptDist(t0.pageX, t0.pageY, t1.pageX, t1.pageY);
        const midX = (t0.pageX + t1.pageX) / 2, midY = (t0.pageY + t1.pageY) / 2;
        if (!pinchRef.current) {
          pinchRef.current = { dist, zoom: zoomRef.current, midX, midY, panX: panXRef.current, panY: panYRef.current };
          return;
        }
        const { dist: id, zoom: iz, panX: ipx, panY: ipy } = pinchRef.current;
        const nz = Math.max(0.2, Math.min(8, iz * (dist / id)));
        const ratio = nz / iz;
        const npx = midX - (midX - ipx) * ratio + (midX - pinchRef.current.midX);
        const npy = midY - (midY - ipy) * ratio + (midY - pinchRef.current.midY);
        zoomRef.current = nz; panXRef.current = npx; panYRef.current = npy;
        setZoom(nz); setPanX(npx); setPanY(npy);
        return;
      }
      if (isPinching.current) return;

      const sx = evt.nativeEvent.pageX, sy = evt.nativeEvent.pageY;
      const tool = brushTypeRef.current;

      if (isDrawing.current && isShapeTool(tool)) {
        setShapeEnd({ x: sx, y: sy });
        return;
      }

      if (isDrawing.current) {
        liveRef.current.push({ x: sx, y: sy });
        if (liveRef.current.length % 4 === 0) setLivePoints([...liveRef.current]);
        return;
      }

      // Pan
      const now = Date.now(), dt = now - lastMoveTime.current;
      const npx = panStart.current.panX + gs.dx, npy = panStart.current.panY + gs.dy;
      if (dt > 0) {
        velX.current = (npx - lastMovePan.current.x) * (1 / dt) * 16;
        velY.current = (npy - lastMovePan.current.y) * (1 / dt) * 16;
      }
      lastMoveTime.current = now; lastMovePan.current = { x: npx, y: npy };
      panXRef.current = npx; panYRef.current = npy;
      setPanX(npx); setPanY(npy);
    },

    onPanResponderRelease: (_, gs) => {
      isPinching.current = false; pinchRef.current = null;
      const tool = brushTypeRef.current;

      if (isDrawing.current && isShapeTool(tool) && shapeStartRef.current) {
        const sx = shapeStartRef.current.x, sy = shapeStartRef.current.y;
        const ex = sx + gs.dx, ey = sy + gs.dy;
        const pts = tool === "line"
          ? [{ x: sx, y: sy }, { x: ex, y: ey }]
          : [{ x: sx, y: sy }, { x: ex, y: sy }, { x: ex, y: ey }, { x: sx, y: ey }, { x: sx, y: sy }];
        setStrokes(prev => [...prev, {
          id: `s_${Date.now()}`, points: pts,
          color: colorRef.current, width: sizeRef.current,
          brushType: tool, opacity: 1.0, isEraser: false,
        }]);
        shapeStartRef.current = null; setShapeStart(null); setShapeEnd(null);
        isDrawing.current = false;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      if (isDrawing.current && liveRef.current.length > 1) {
        const optimized = optimizePoints(liveRef.current);
        const eraser = eraserRef.current;
        setStrokes(prev => [...prev, {
          id: `s_${Date.now()}`, points: optimized,
          color: eraser ? "#111111" : colorRef.current,
          width: eraser ? sizeRef.current * 3 : sizeRef.current * getWidthMultiplier(brushTypeRef.current),
          brushType: brushTypeRef.current,
          opacity: eraser ? 1.0 : getBrushOpacity(brushTypeRef.current),
          isEraser: eraser,
        }]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      isDrawing.current = false; liveRef.current = []; setLivePoints([]);
      if (!isDrawing.current) startInertia();
    },

    onPanResponderTerminate: () => {
      isPinching.current = false; pinchRef.current = null;
      isDrawing.current = false; liveRef.current = []; setLivePoints([]);
      shapeStartRef.current = null; setShapeStart(null); setShapeEnd(null);
    },
  })).current;

  useEffect(() => () => stopInertia(), []);

  const gSpacing = G_PX * zoom;
  const offX = ((panX % gSpacing) + gSpacing) % gSpacing;
  const offY = ((panY % gSpacing) + gSpacing) % gSpacing;
  // Dark grid on dark canvas
  const gridColor = "rgba(255,255,255,0.06)";
  const gridColorMain = "rgba(255,255,255,0.12)";

  const livePath = buildPath(livePoints);

  // Shape preview
  const shapePreview = shapeStart && shapeEnd ? (() => {
    const col = brushColor;
    const sw = brushSize;
    if (brushType === "line") {
      return <Line x1={shapeStart.x} y1={shapeStart.y} x2={shapeEnd.x} y2={shapeEnd.y}
        stroke={col} strokeWidth={sw} strokeLinecap="round" opacity={0.7} strokeDasharray="8,4" />;
    }
    if (brushType === "rect") {
      const x = Math.min(shapeStart.x, shapeEnd.x);
      const y = Math.min(shapeStart.y, shapeEnd.y);
      const w = Math.abs(shapeEnd.x - shapeStart.x);
      const h = Math.abs(shapeEnd.y - shapeStart.y);
      return <Rect x={x} y={y} width={w} height={h}
        stroke={col} strokeWidth={sw} fill={col} fillOpacity={0.1}
        strokeDasharray="8,4" opacity={0.8} />;
    }
    return null;
  })() : null;

  return (
    <View style={styles.root}>
      {/* Dark canvas */}
      <View ref={canvasRef} style={styles.canvas}
        {...panResponder.panHandlers}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Svg width={size.w} height={size.h}>
          {/* Grid */}
          {showGrid && (
            <G>
              {Array.from({ length: Math.ceil(size.w / gSpacing) + 1 }).map((_, i) => {
                const x = offX + i * gSpacing;
                const isMain = i % 5 === 0;
                return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={size.h}
                  stroke={isMain ? gridColorMain : gridColor} strokeWidth={isMain ? 0.6 : 0.25} />;
              })}
              {Array.from({ length: Math.ceil(size.h / gSpacing) + 1 }).map((_, i) => {
                const y = offY + i * gSpacing;
                const isMain = i % 5 === 0;
                return <Line key={`h${i}`} x1={0} y1={y} x2={size.w} y2={y}
                  stroke={isMain ? gridColorMain : gridColor} strokeWidth={isMain ? 0.6 : 0.25} />;
              })}
            </G>
          )}
          {/* Saved strokes */}
          <G>
            {strokes.map((stroke) => {
              const d = buildPath(stroke.points);
              if (!d) return null;
              return <Path key={stroke.id} d={d}
                stroke={stroke.color} strokeWidth={stroke.width * zoom}
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                opacity={stroke.opacity} />;
            })}
          </G>
          {/* Live stroke */}
          {livePath ? (
            <Path d={livePath}
              stroke={isEraser ? "#111111" : brushColor}
              strokeWidth={(isEraser ? brushSize * 3 : brushSize * getWidthMultiplier(brushType)) * zoom}
              fill="none" strokeLinecap="round" strokeLinejoin="round"
              opacity={isEraser ? 1 : getBrushOpacity(brushType)} />
          ) : null}
          {/* Shape preview */}
          {shapePreview}
        </Svg>
      </View>

      {/* ── Left sidebar toolbar ── */}
      <View style={styles.sidebar}>
        {/* Brush types */}
        {BRUSH_TYPES.map((bt) => (
          <ScalePress key={bt.type}
            onPress={() => { setBrushType(bt.type); setIsEraser(false); Haptics.selectionAsync(); }}
            style={[styles.sideBtn, brushType === bt.type && !isEraser && { backgroundColor: brushColor + "30", borderColor: brushColor }]}
            scale={0.88}>
            <Feather name={bt.icon as any} size={15} color={brushType === bt.type && !isEraser ? brushColor : "rgba(255,255,255,0.5)"} />
          </ScalePress>
        ))}
        <View style={styles.sideDivider} />
        {/* Eraser */}
        <ScalePress onPress={() => { setIsEraser(!isEraser); Haptics.selectionAsync(); }}
          style={[styles.sideBtn, isEraser && { backgroundColor: "#ffffff30", borderColor: "#fff" }]} scale={0.88}>
          <Feather name="delete" size={15} color={isEraser ? "#fff" : "rgba(255,255,255,0.5)"} />
        </ScalePress>
        {/* Undo */}
        <ScalePress onPress={() => { setStrokes(p => p.slice(0, -1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={styles.sideBtn} scale={0.88}>
          <Feather name="corner-left-up" size={15} color="rgba(255,255,255,0.5)" />
        </ScalePress>
        {/* Clear */}
        <ScalePress onPress={() => { setStrokes([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
          style={styles.sideBtn} scale={0.88}>
          <Feather name="trash-2" size={15} color="rgba(255,100,100,0.7)" />
        </ScalePress>
      </View>

      {/* ── Bottom toolbar ── */}
      <View style={styles.bottomBar}>
        {/* Brush sizes */}
        <View style={styles.sizesRow}>
          {BRUSH_SIZES.map((s) => (
            <ScalePress key={s} onPress={() => { setBrushSize(s); Haptics.selectionAsync(); }}
              style={[styles.sizeBtn, brushSize === s && { borderColor: brushColor, borderWidth: 2 }]} scale={0.88}>
              <View style={[styles.sizeDot, {
                width: Math.min(s * 1.4, 18), height: Math.min(s * 1.4, 18),
                borderRadius: 10, backgroundColor: brushColor,
              }]} />
            </ScalePress>
          ))}
        </View>
        {/* Color palette */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
          {SKETCH_PALETTE.map((c) => (
            <ScalePress key={c} onPress={() => { setBrushColor(c); setIsEraser(false); Haptics.selectionAsync(); }}
              style={[styles.colorDot, { backgroundColor: c },
                brushColor === c && !isEraser && { borderWidth: 2.5, borderColor: "#fff" },
                c === "#FFFFFF" && { borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
              ]} scale={0.88} />
          ))}
        </ScrollView>
        {/* Zoom */}
        <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1, backgroundColor: "#111111" },

  sidebar: {
    position: "absolute", left: 10, top: "20%",
    backgroundColor: "rgba(30,30,30,0.92)",
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 8, paddingHorizontal: 6,
    alignItems: "center", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, zIndex: 10,
  },
  sideBtn: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  sideDivider: {
    width: 24, height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 3,
  },

  bottomBar: {
    position: "absolute", bottom: 16, left: 60, right: 16,
    backgroundColor: "rgba(20,20,20,0.92)",
    borderRadius: 18, borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 10, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  sizesRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sizeBtn: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  sizeDot: {},
  colorScroll: { flexGrow: 0 },
  colorDot: {
    width: 24, height: 24, borderRadius: 12,
    marginRight: 6, borderWidth: 1, borderColor: "transparent",
  },
  zoomLabel: {
    fontSize: 10, fontWeight: "700",
    color: "rgba(255,255,255,0.4)", textAlign: "right",
  },
});
