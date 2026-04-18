import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDesignerStore, Room } from "@/lib/store";
import { useColors } from "@/hooks/useColors";
import { ScalePress } from "@/components/ScalePress";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; icon: string; color: string }> = [
  { type: "bedroom",     label: "Bedroom", icon: "moon",      color: "#E02020" },
  { type: "living_room", label: "Living",  icon: "tv",        color: "#7C3AED" },
  { type: "kitchen",     label: "Kitchen", icon: "coffee",    color: "#EA580C" },
  { type: "bathroom",    label: "Bath",    icon: "droplet",   color: "#0284C7" },
  { type: "office",      label: "Office",  icon: "briefcase", color: "#059669" },
  { type: "dining_room", label: "Dining",  icon: "users",     color: "#DB2777" },
];

interface Props { onClose?: () => void; }

function Stepper({ value, onDec, onInc, label }: { value: number; onDec: () => void; onInc: () => void; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.stepperGroup}>
      <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.stepper, { backgroundColor: colors.mutedBg, borderColor: colors.border }]}>
        <ScalePress onPress={onDec} style={[styles.stepBtn, { borderRightColor: colors.border }]} scale={0.85}>
          <Feather name="minus" size={14} color={colors.foreground} />
        </ScalePress>
        <Text style={[styles.stepVal, { color: colors.foreground }]}>{value}</Text>
        <ScalePress onPress={onInc} style={[styles.stepBtn, { borderLeftColor: colors.border }]} scale={0.85}>
          <Feather name="plus" size={14} color={colors.foreground} />
        </ScalePress>
      </View>
    </View>
  );
}

export function RoomPropertiesPanel({ onClose }: Props) {
  const colors = useColors();
  const store = useDesignerStore();
  const room = store.currentPlan?.rooms.find((r) => r.id === store.selectedRoomId);

  if (!room) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card }]}>
        <Feather name="mouse-pointer" size={24} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Select a room to edit it</Text>
      </View>
    );
  }

  const roomMeta = ROOM_TYPES.find((r) => r.type === room.type);
  const roomColor = roomMeta?.color ?? colors.primary;

  const handleType = (type: Room["type"]) => {
    store.pushHistory();
    store.updateRoom(room.id, { type });
    store.calculateDirections();
  };
  const handleDim = (field: "width" | "height", delta: number) => {
    const v = Math.max(2, (room[field] as number) + delta);
    const area = field === "width" ? v * room.height * 4 : room.width * v * 4;
    store.updateRoom(room.id, { [field]: v, area });
    store.calculateDirections();
  };
  const handlePos = (field: "x" | "y", delta: number) => {
    store.updateRoom(room.id, { [field]: Math.max(0, (room[field] as number) + delta) });
    store.calculateDirections();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.head}>
          <View style={[styles.headDot, { backgroundColor: roomColor }]} />
          <Text style={[styles.headTitle, { color: colors.foreground }]}>
            {roomMeta?.label ?? "Room"}
          </Text>
          {onClose && (
            <ScalePress onPress={onClose} style={styles.closeBtn} scale={0.88}>
              <Feather name="x" size={18} color={colors.muted} />
            </ScalePress>
          )}
        </View>

        {/* Type grid */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>ROOM TYPE</Text>
        <View style={styles.typeGrid}>
          {ROOM_TYPES.map((rt) => {
            const isActive = room.type === rt.type;
            return (
              <ScalePress
                key={rt.type}
                onPress={() => handleType(rt.type)}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: isActive ? rt.color + "18" : colors.mutedBg,
                    borderColor: isActive ? rt.color : "transparent",
                  },
                ]}
                scale={0.93}
              >
                <Feather name={rt.icon as any} size={14} color={isActive ? rt.color : colors.muted} />
                <Text style={[styles.typeBtnText, { color: isActive ? rt.color : colors.muted }]}>{rt.label}</Text>
              </ScalePress>
            );
          })}
        </View>

        {/* Dimensions */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>DIMENSIONS</Text>
        <View style={styles.dimRow}>
          <Stepper label="Width (ft)" value={room.width} onDec={() => handleDim("width", -1)} onInc={() => handleDim("width", 1)} />
          <Stepper label="Height (ft)" value={room.height} onDec={() => handleDim("height", -1)} onInc={() => handleDim("height", 1)} />
        </View>

        {/* Position */}
        <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>POSITION</Text>
        <View style={styles.dimRow}>
          <Stepper label="X" value={room.x} onDec={() => handlePos("x", -1)} onInc={() => handlePos("x", 1)} />
          <Stepper label="Y" value={room.y} onDec={() => handlePos("y", -1)} onInc={() => handlePos("y", 1)} />
        </View>

        {/* Info strip */}
        <View style={styles.infoStrip}>
          <View style={[styles.infoChip, { backgroundColor: roomColor + "15" }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Direction</Text>
            <Text style={[styles.infoValue, { color: roomColor }]}>{room.direction}</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Area</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>{room.area} sqft</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.mutedBg }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Size</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{room.width}×{room.height}</Text>
          </View>
        </View>

        {/* Delete */}
        <ScalePress
          onPress={() => { store.deleteRoom(room.id); onClose?.(); }}
          style={[styles.deleteBtn, { backgroundColor: colors.destructiveMuted, borderColor: colors.destructive + "30" }]}
          scale={0.97}
        >
          <Feather name="trash-2" size={15} color={colors.destructive} />
          <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Room</Text>
        </ScalePress>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 0 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  emptyText: { fontSize: 14 },

  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 8 },
  headDot: { width: 10, height: 10, borderRadius: 5 },
  headTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  closeBtn: { padding: 4 },

  groupLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  typeBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
    minWidth: 80,
  },
  typeBtnText: { fontSize: 12, fontWeight: "600" },

  dimRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  stepperGroup: { flex: 1, gap: 6 },
  stepperLabel: { fontSize: 11, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  stepBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderWidth: 0 },
  stepVal: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700" },

  infoStrip: { flexDirection: "row", gap: 8, marginBottom: 14 },
  infoChip: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 3 },
  infoLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  infoValue: { fontSize: 14, fontWeight: "800" },

  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 14, borderWidth: 1,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700" },
});
