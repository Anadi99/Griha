import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Svg, { Circle, Path, G, Line, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const DIR_ANGLES: Record<Direction, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const DIRS: Array<{ key: Direction; label: string; x: number; y: number }> = [
  { key: "N",  label: "N",  x:  0, y: -1 },
  { key: "NE", label: "",   x:  1, y: -1 },
  { key: "E",  label: "E",  x:  1, y:  0 },
  { key: "SE", label: "",   x:  1, y:  1 },
  { key: "S",  label: "S",  x:  0, y:  1 },
  { key: "SW", label: "",   x: -1, y:  1 },
  { key: "W",  label: "W",  x: -1, y:  0 },
  { key: "NW", label: "",   x: -1, y: -1 },
];

interface CompassWidgetProps {
  selectedDirection?: Direction | null;
  size?: number;
}

export function CompassWidget({ selectedDirection, size = 72 }: CompassWidgetProps) {
  const colors = useColors();
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!selectedDirection) { glowAnim.setValue(0.4); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [selectedDirection]);

  const r = size / 2;
  const cx = r, cy = r;
  const outerR = r - 2;
  const tickOuter = outerR - 3;
  const tickInner = outerR - 9;
  const labelR = outerR - 14;
  const needleLen = outerR - 18;

  const selectedAngle = selectedDirection ? DIR_ANGLES[selectedDirection] : null;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Outer ring */}
        <Circle cx={cx} cy={cy} r={outerR} fill={colors.card} stroke={colors.border} strokeWidth={1.5} opacity={0.97} />

        {/* Direction ticks & labels */}
        {DIRS.map(({ key, label, x, y }) => {
          const angle = DIR_ANGLES[key];
          const rad = (angle - 90) * (Math.PI / 180);
          const isSelected = key === selectedDirection;
          const isCardinal = label !== "";
          const txOuter = cx + tickOuter * Math.cos(rad);
          const tyOuter = cy + tickOuter * Math.sin(rad);
          const txInner = cx + (isCardinal ? tickInner : tickOuter - 5) * Math.cos(rad);
          const tyInner = cy + (isCardinal ? tickInner : tickOuter - 5) * Math.sin(rad);
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);

          const isNorth = key === "N";
          const tickColor = isSelected ? "#F59E0B" : isNorth ? colors.primary : colors.muted;

          return (
            <G key={key}>
              <Line
                x1={txOuter} y1={tyOuter}
                x2={txInner} y2={tyInner}
                stroke={tickColor}
                strokeWidth={isSelected ? 2 : isCardinal ? 1.5 : 0.8}
                opacity={isSelected ? 1 : 0.7}
              />
              {label && (
                <SvgText
                  x={lx} y={ly + 3.5}
                  textAnchor="middle"
                  fontSize={isNorth ? 11 : 8}
                  fontWeight={isNorth ? "900" : "600"}
                  fill={isSelected && isNorth ? "#F59E0B" : isNorth ? colors.primary : isSelected ? "#F59E0B" : colors.muted}
                >
                  {label}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Selected direction highlight dot */}
        {selectedDirection && (
          <Circle
            cx={cx + (outerR - 10) * Math.cos((DIR_ANGLES[selectedDirection] - 90) * Math.PI / 180)}
            cy={cy + (outerR - 10) * Math.sin((DIR_ANGLES[selectedDirection] - 90) * Math.PI / 180)}
            r={4}
            fill="#F59E0B"
          />
        )}

        {/* Needle — North red tip */}
        <Path
          d={`M ${cx} ${cy - needleLen} L ${cx - 4} ${cy + 6} L ${cx + 4} ${cy + 6} Z`}
          fill={colors.primary}
          opacity={0.9}
        />
        {/* Needle — South white tip */}
        <Path
          d={`M ${cx} ${cy + needleLen} L ${cx - 3} ${cy - 4} L ${cx + 3} ${cy - 4} Z`}
          fill={colors.muted}
          opacity={0.4}
        />

        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={4} fill={colors.card} stroke={colors.border} strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={2} fill={colors.primary} />
      </Svg>

      {/* Selected direction label */}
      {selectedDirection && (
        <Animated.View style={[styles.dirLabel, { backgroundColor: "#F59E0B", opacity: glowAnim }]}>
          <Text style={styles.dirLabelText}>{selectedDirection}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  dirLabel: {
    position: "absolute", bottom: -6, alignSelf: "center",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  dirLabelText: { fontSize: 9, fontWeight: "800", color: "#fff" },
});
