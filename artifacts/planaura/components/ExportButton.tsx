/**
 * ExportButton — Phase 2: Export / Share
 * Captures the canvas as PNG via react-native-view-shot
 * Saves to media library + native share sheet
 */
import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, Platform,
  Share, Alert,
} from "react-native";import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";

// Lazy import so the app doesn't crash if view-shot isn't installed yet
let captureRef: ((ref: any, opts?: any) => Promise<string>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  captureRef = require("react-native-view-shot").captureRef;
} catch (_) {}

interface ExportButtonProps {
  /** Ref pointing to the View that wraps the SVG canvas */
  canvasViewRef: React.RefObject<View>;
  planName: string;
  onSuccess?: () => void;
}

type ExportState = "idle" | "capturing" | "sharing" | "success" | "error";

export function ExportButton({ canvasViewRef, planName, onSuccess }: ExportButtonProps) {
  const colors = useColors();
  const [state, setState] = useState<ExportState>("idle");
  const successAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const showSuccess = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.08, tension: 300, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
    Animated.timing(successAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setState("idle");
        });
      }, 1800);
    });
  };

  const handleExport = async () => {
    if (!captureRef) {
      Alert.alert("Not available", "Install react-native-view-shot to enable export.");
      return;
    }
    if (state !== "idle") return;

    try {
      setState("capturing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const uri = await captureRef(canvasViewRef, {
        format: "png",
        quality: 1.0,
        result: "tmpfile",
      });

      setState("sharing");

      if (Platform.OS === "web") {
        // Web: trigger download
        const link = document.createElement("a");
        link.href = uri;
        link.download = `${planName.replace(/\s+/g, "_")}_floor_plan.png`;
        link.click();
        setState("success");
        showSuccess();
        onSuccess?.();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      await Share.share({
        title: `${planName} — Floor Plan`,
        message: `Check out my floor plan: ${planName}`,
        url: uri,
      });

      setState("success");
      showSuccess();
      onSuccess?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss")) {
        setState("idle");
        return;
      }
      setState("error");
      Alert.alert("Export failed", "Could not capture the canvas. Try again.");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const isLoading = state === "capturing" || state === "sharing";
  const isSuccess = state === "success";

  const iconName = isSuccess ? "check" : isLoading ? "loader" : "share-2";
  const label = isSuccess ? "Exported!" : isLoading ? (state === "capturing" ? "Capturing…" : "Sharing…") : "Export";

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <ScalePress
        onPress={handleExport}
        disabled={isLoading}
        scale={0.94}
        style={[
          styles.btn,
          {
            backgroundColor: isSuccess
              ? colors.success
              : isLoading
              ? colors.mutedBg
              : colors.card,
            borderColor: isSuccess
              ? colors.success
              : colors.border,
          },
        ]}
      >
        <Feather
          name={iconName as any}
          size={15}
          color={isSuccess ? "#fff" : isLoading ? colors.muted : colors.foreground}
        />
        <Text style={[
          styles.label,
          { color: isSuccess ? "#fff" : isLoading ? colors.muted : colors.foreground },
        ]}>
          {label}
        </Text>
      </ScalePress>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
