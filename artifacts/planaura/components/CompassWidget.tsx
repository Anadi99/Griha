/**
 * CompassWidget — Premium red-theme redesign
 * Phase 3: Nike/Apple minimal style
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, useColorScheme } from "react-native";
import Svg, { Circle, Path, G, Line, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const DIR_ANGLES: Record<Direction, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const DIRS: Array<{ key: Direction; label: string }> = [
  { key: "N",  label: "N" },
  { key: "NE", label: "" },
  { key: "E",  label: "E" },
  { key: "SE", label: "" },
  { key: "S",  label: "S" },
  { key: "SW", label: "" },
  { key: "W",  label: "W" },
  { key: "NW", label: "" },
];

interface CompassWidgetProps {
  selectedDirection?: Direction | null;
  size?: number;
}

export function CompassWidget({ selectedDirection, size = 72 }: CompassWidgetProps) {
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selectedDirection) {
      glowAnim.setValue(0.5);
      scaleAnim.setValue(1);
      return;
    }
    // Pulse the direction label
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
    ]));
    // Pop scale on new selection
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.12, tension: 300, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
    loop.start();
    return () => loop.stop();
  }, [selectedDirection]);

  const r = size / 2;
  const cx = r, cy = r;
  const outerR = r - 3;
  const tickOuter = outerR - 2;
  const tickInnerCard = outerR - 10;
  const tickInnerSub = outerR - 6;
  const labelR = outerR - 16;
  const needleLen = outerR - 20;

  const bg = isDark ? "rgba(20,20,20,0.92)" : "rgba(255,255,255,0.92)";
  const ringColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, transform: [{ scale: scaleAnim }] }]}>
      <Svg width={size} height={size}>
        {/* Background disc */}
        <Circle cx={cx} cy={cy} r={outerR}
          fill={bg} stroke={ringColor} strokeWidth={1} />

        {/* Tick marks & labels */}
        {DIRS.map(({ key, label }) => {
          const angle = DIR_ANGLES[key];
          const rad = (angle - 90) * (Math.PI / 180);
          const isSelected = key === selectedDirection;
          const isCardinal = label !== "";
          const isNorth = key === "N";

          const txO = cx + tickOuter * Math.cos(rad);
          const tyO = cy + tickOuter * Math.sin(rad);
          const txI = cx + (isCardinal ? tickInnerCard : tickInnerSub) * Math.cos(rad);
          const tyI = cy + (isCardinal ? tickInnerCard : tickInnerSub) * Math.sin(rad);
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);

          const tickColor = isSelected
            ? colors.primary
            : isNorth
            ? colors.primary
            : isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";

          return (
            <G key={key}>
              <Line
                x1={txO} y1={tyO} x2={txI} y2={tyI}
                stroke={tickColor}
                strokeWidth={isSelected ? 2.5 : isCardinal ? 1.5 : 0.8}
              />
              {label && (
                <SvgText
                  x={lx} y={ly + 3.5}
                  textAnchor="middle"
                  fontSize={isNorth ? 10 : 7}
                  fontWeight={isNorth || isSelected ? "900" : "600"}
                  fill={isSelected ? colors.primary : isNorth ? colors.primary : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}
                >
                  {label}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Selected direction highlight ring segment */}
        {selectedDirection && (() => {
          const angle = DIR_ANGLES[selectedDirection];
          const rad = (angle - 90) * (Math.PI / 180);
          const dotR = outerR - 8;
          const dx = cx + dotR * Math.cos(rad);
          const dy = cy + dotR * Math.sin(rad);
          return <Circle cx={dx} cy={dy} r={3.5} fill={colors.primary} />;
        })()}

        {/* Needle — North (red) */}
        <Path
          d={`M ${cx} ${cy - needleLen} L ${cx - 3.5} ${cy + 4} L ${cx + 3.5} ${cy + 4} Z`}
          fill={colors.primary} opacity={0.95}
        />
        {/* Needle — South (muted) */}
        <Path
          d={`M ${cx} ${cy + needleLen * 0.7} L ${cx - 2.5} ${cy - 2} L ${cx + 2.5} ${cy - 2} Z`}
          fill={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
        />

        {/* Center pivot */}
        <Circle cx={cx} cy={cy} r={5}
          fill={isDark ? "#1A0505" : "#fff"}
          stroke={colors.primary} strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={2} fill={colors.primary} />
      </Svg>

      {/* Direction label badge */}
      {selectedDirection && (
        <Animated.View style={[
          styles.dirBadge,
          { backgroundColor: colors.primary, opacity: glowAnim },
        ]}>
          <Text style={styles.dirBadgeText}>{selectedDirection}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  dirBadge: {
    position: "absolute", bottom: -8, alignSelf: "center",
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
    shadowColor: "#E02020", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 3,
  },
  dirBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
});
