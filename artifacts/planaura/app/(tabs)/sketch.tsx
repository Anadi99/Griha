import React, { useRef } from "react";
import { View, Text, StyleSheet, Platform, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useColors } from "@/hooks/useColors";
import { SketchCanvas } from "@/components/SketchCanvas";

export default function SketchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const canvasRef = useRef<View>(null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: topPad + 8 },
        isIOS ? {} : { backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
        {isIOS && (
          <BlurView intensity={80} tint={isDark ? "dark" : "extraLight"} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.headerInner}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sketch</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Freehand drawing on infinite canvas
          </Text>
        </View>
      </View>

      {/* Canvas */}
      <SketchCanvas showGrid canvasRef={canvasRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { overflow: "hidden" },
  headerInner: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 2 },
});
