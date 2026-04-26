/**
 * SketchCanvas — Lorien-inspired freehand drawing canvas
 * Features:
 * - Smooth freehand strokes with point optimizer (angle + distance threshold)
 * - Variable brush size
 * - Color picker
 * - Eraser tool
 * - Undo / clear
 * - Grid snap toggle
 * - Infinite pan + pinch zoom
 * - Strokes rendered as smooth SVG paths
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View, PanResponder, StyleSheet, Animated,
  useColorScheme, Text,
} from "react-native";
import Svg, { Path, G, Line } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";

/* ── Constants ── */
const G_PX = 20;
const INERTIA_DECAY = 0.88;
const INERTIA_STOP = 0.3;
// Stroke optimizer thresholds (from Lorien)
const MIN_DISTANCE = 3.0;
const ANGLE_THRESHOLD = 0.8; // degrees

/* ── Types ── */
interface Point { x: number; y: number }
interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

type SketchTool = "brush" | "eraser";

/* ── Stroke optimizer (port of Lorien's BrushStrokeOptimizer) ── */
function optimizePoints(pts: Point[]): Point[] {
  if (pts.length < 6) return pts;
  const out: Point[] = [pts[0]];
  let prevAngle = 0;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const angleDiff = Math.abs(Math.abs(angle) - Math.abs(prevAngle));
    prevAngle = angle;
    if (dist > MIN_DISTANCE || angleDiff >= ANGLE_THRESHOLD) {
      out.push(cur);
    }
  }
  // Always include last point
  if (out[out.length - 1] !== pts[pts.length - 1]) {
    out.push(pts[pts.length - 1]);
  }
  return out;
}

/* ── Build smooth SVG path from points (Catmull-Rom spline) ── */
function buildPath(pts: Point[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  // Smooth curve through all points using cubic bezier approximation
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const cp1x = (pts[i - 1].x + pts[i].x) / 2;
    const cp1y = (pts[i - 1].y + pts[i].y) / 2;
    const cp2x = (pts[i].x + pts[i + 1].x) / 2;
    const cp2y = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/* ── Color palette ── */
const COLORS = [
  "#8B5E3C", "#1C1008", "#FFFFFF", "#C4714A",
  "#C084FC", "#38BDF8", "#34D399", "#6366F1",
  "#FB923C", "#FACC15",
];

const BRUSH_SIZES = [2, 4, 8, 14, 22];

/* ── Props ── */
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
  const [tool, setTool] = useState<SketchTool>("brush");
  const [brushColor, setBrushColor] = useState("#8B5E3C");
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Refs for gesture (no re-render during draw)
  const liveRef = useRef<Point[]>([]);
  const zoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const toolRef = useRef<SketchTool>("brush");
  const colorRef = useRef("#8B5E3C");
  const sizeRef = useRef(4);
  const isDrawing = useRef(false);
  const isPinching = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number; midX: number; midY: number; panX: number; panY: number } | null>(null);
  const velX = useRef(0); const velY = useRef(0);
  const lastMoveTime = useRef(0);
  const lastMovePan = useRef({ x: 0, y: 0 });
  const inertiaRaf = useRef<any>(null);

  // Keep refs in sync
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;
  toolRef.current = tool;
  colorRef.current = brushColor;
  sizeRef.current = brushSize;

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
      panXRef.current += velX.current;
      panYRef.current += velY.current;
      setPanX(panXRef.current);
      setPanY(panYRef.current);
      inertiaRaf.current = requestAnimationFrame(step);
    };
    inertiaRaf.current = requestAnimationFrame(step);
  }, []);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 1 || Math.abs(gs.dy) > 1,

    onPanResponderGrant: (evt) => {
      stopInertia();
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) { isPinching.current = true; return; }
      isPinching.current = false;
      const sx = evt.nativeEvent.pageX, sy = evt.nativeEvent.pageY;

      if (toolRef.current === "brush" || toolRef.current === "eraser") {
        isDrawing.current = true;
        liveRef.current = [{ x: sx, y: sy }];
        setLivePoints([{ x: sx, y: sy }]);
      } else {
        // Pan mode (two-finger or when no tool active)
        panStart.current = { x: sx, y: sy, panX: panXRef.current, panY: panYRef.current };
        lastMoveTime.current = Date.now();
        lastMovePan.current = { x: panXRef.current, y: panYRef.current };
      }
    },

    onPanResponderMove: (evt, gs) => {
      const touches = evt.nativeEvent.touches;

      // Pinch zoom
      if (touches && touches.length >= 2) {
        isPinching.current = true;
        isDrawing.current = false;
        liveRef.current = [];
        setLivePoints([]);
        const t0 = touches[0], t1 = touches[1];
        const dist = ptDist(t0.pageX, t0.pageY, t1.pageX, t1.pageY);
        const midX = (t0.pageX + t1.pageX) / 2;
        const midY = (t0.pageY + t1.pageY) / 2;
        if (!pinchRef.current) {
          pinchRef.current = { dist, zoom: zoomRef.current, midX, midY, panX: panXRef.current, panY: panYRef.current };
          return;
        }
        const { dist: initDist, zoom: initZoom, panX: initPanX, panY: initPanY } = pinchRef.current;
        const newZoom = Math.max(0.2, Math.min(8, initZoom * (dist / initDist)));
        const ratio = newZoom / initZoom;
        const newPanX = midX - (midX - initPanX) * ratio + (midX - pinchRef.current.midX);
        const newPanY = midY - (midY - initPanY) * ratio + (midY - pinchRef.current.midY);
        zoomRef.current = newZoom; panXRef.current = newPanX; panYRef.current = newPanY;
        setZoom(newZoom); setPanX(newPanX); setPanY(newPanY);
        return;
      }

      if (isPinching.current) return;

      if (isDrawing.current) {
        const sx = evt.nativeEvent.pageX, sy = evt.nativeEvent.pageY;
        liveRef.current.push({ x: sx, y: sy });
        // Throttle: re-render every 4 points for 60fps
        if (liveRef.current.length % 4 === 0) {
          setLivePoints([...liveRef.current]);
        }
        return;
      }

      // Pan
      const now = Date.now(), dt = now - lastMoveTime.current;
      const newPX = panStart.current.panX + gs.dx;
      const newPY = panStart.current.panY + gs.dy;
      if (dt > 0) {
        velX.current = (newPX - lastMovePan.current.x) * (1 / dt) * 16;
        velY.current = (newPY - lastMovePan.current.y) * (1 / dt) * 16;
      }
      lastMoveTime.current = now;
      lastMovePan.current = { x: newPX, y: newPY };
      panXRef.current = newPX; panYRef.current = newPY;
      setPanX(newPX); setPanY(newPY);
    },

    onPanResponderRelease: () => {
      isPinching.current = false; pinchRef.current = null;

      if (isDrawing.current && liveRef.current.length > 1) {
        const optimized = optimizePoints(liveRef.current);
        const newStroke: Stroke = {
          id: `s_${Date.now()}`,
          points: optimized,
          color: toolRef.current === "eraser"
            ? (isDark ? "#1A1008" : "#F5F0E8")
            : colorRef.current,
          width: toolRef.current === "eraser" ? sizeRef.current * 3 : sizeRef.current,
          isEraser: toolRef.current === "eraser",
        };
        setStrokes(prev => [...prev, newStroke]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      isDrawing.current = false;
      liveRef.current = [];
      setLivePoints([]);

      if (!isDrawing.current) startInertia();
    },

    onPanResponderTerminate: () => {
      isPinching.current = false; pinchRef.current = null;
      isDrawing.current = false; liveRef.current = []; setLivePoints([]);
    },
  })).current;

  useEffect(() => () => stopInertia(), []);

  /* ── Grid ── */
  const gSpacing = G_PX * zoom;
  const offX = ((panX % gSpacing) + gSpacing) % gSpacing;
  const offY = ((panY % gSpacing) + gSpacing) % gSpacing;
  const gridColor = isDark ? "rgba(196,154,108,0.08)" : "rgba(139,94,60,0.07)";
  const gridColorMain = isDark ? "rgba(196,154,108,0.16)" : "rgba(139,94,60,0.14)";

  const livePath = buildPath(livePoints);

  return (
    <View style={styles.root}>
      {/* Canvas */}
      <View
        ref={canvasRef}
        style={[styles.canvas, { backgroundColor: isDark ? "#1A1008" : "#F5F0E8" }]}
        {...panResponder.panHandlers}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Svg width={size.w} height={size.h}>
          {/* Grid */}
          {showGrid && (
            <G>
              {Array.from({ length: Math.ceil(size.w / gSpacing) + 1 }).map((_, i) => {
                const x = offX + i * gSpacing;
                const isMain = i % 5 === 0;
                return <Line key={`v${i}`} x1={x} y1={0} x2={x} y2={size.h}
                  stroke={isMain ? gridColorMain : gridColor} strokeWidth={isMain ? 0.7 : 0.3} />;
              })}
              {Array.from({ length: Math.ceil(size.h / gSpacing) + 1 }).map((_, i) => {
                const y = offY + i * gSpacing;
                const isMain = i % 5 === 0;
                return <Line key={`h${i}`} x1={0} y1={y} x2={size.w} y2={y}
                  stroke={isMain ? gridColorMain : gridColor} strokeWidth={isMain ? 0.7 : 0.3} />;
              })}
            </G>
          )}

          {/* Saved strokes */}
          <G>
            {strokes.map((stroke) => {
              const d = buildPath(stroke.points);
              if (!d) return null;
              return (
                <Path key={stroke.id} d={d}
                  stroke={stroke.color}
                  strokeWidth={stroke.width * zoom}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </G>

          {/* Live stroke */}
          {livePath ? (
            <Path d={livePath}
              stroke={tool === "eraser" ? (isDark ? "#1A1008" : "#F5F0E8") : brushColor}
              strokeWidth={(tool === "eraser" ? brushSize * 3 : brushSize) * zoom}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          ) : null}
        </Svg>
      </View>

      {/* ── Floating toolbar ── */}
      <View style={[styles.toolbar, {
        backgroundColor: isDark ? "rgba(20,20,20,0.92)" : "rgba(255,255,255,0.92)",
        borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      }]}>
        {/* Tool buttons */}
        <View style={styles.toolRow}>
          <ScalePress onPress={() => { setTool("brush"); Haptics.selectionAsync(); }}
            style={[styles.toolBtn, tool === "brush" && { backgroundColor: brushColor }]} scale={0.88}>
            <Feather name="pen-tool" size={16} color={tool === "brush" ? "#fff" : colors.foreground} />
          </ScalePress>
          <ScalePress onPress={() => { setTool("eraser"); Haptics.selectionAsync(); }}
            style={[styles.toolBtn, tool === "eraser" && { backgroundColor: colors.primary }]} scale={0.88}>
            <Feather name="delete" size={16} color={tool === "eraser" ? "#fff" : colors.foreground} />
          </ScalePress>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ScalePress onPress={() => { setStrokes(prev => prev.slice(0, -1)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={styles.toolBtn} scale={0.88}>
            <Feather name="corner-left-up" size={16} color={colors.foreground} />
          </ScalePress>
          <ScalePress onPress={() => { setStrokes([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}
            style={styles.toolBtn} scale={0.88}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </ScalePress>
        </View>

        {/* Brush sizes */}
        <View style={styles.sizeRow}>
          {BRUSH_SIZES.map((s) => (
            <ScalePress key={s} onPress={() => { setBrushSize(s); Haptics.selectionAsync(); }}
              style={[styles.sizeBtn, brushSize === s && { borderColor: brushColor, borderWidth: 2 }]}
              scale={0.88}>
              <View style={[styles.sizeDot, {
                width: Math.min(s * 1.5, 20),
                height: Math.min(s * 1.5, 20),
                borderRadius: Math.min(s * 1.5, 20) / 2,
                backgroundColor: brushColor,
              }]} />
            </ScalePress>
          ))}
        </View>

        {/* Color palette */}
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <ScalePress key={c} onPress={() => { setBrushColor(c); setTool("brush"); Haptics.selectionAsync(); }}
              style={[styles.colorBtn, { backgroundColor: c },
                brushColor === c && { borderWidth: 2.5, borderColor: isDark ? "#fff" : "#000" },
                c === "#FFFFFF" && { borderWidth: 1, borderColor: colors.border },
              ]} scale={0.88} />
          ))}
        </View>

        {/* Zoom indicator */}
        <Text style={[styles.zoomLabel, { color: colors.mutedForeground }]}>
          {Math.round(zoom * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1 },

  toolbar: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },

  toolRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  toolBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },
  divider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: 2 },

  sizeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sizeBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "transparent",
  },
  sizeDot: {},

  colorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorBtn: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: "transparent",
  },

  zoomLabel: { fontSize: 10, fontWeight: "700", textAlign: "right" },
});
