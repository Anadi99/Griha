import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDesignerStore, Room } from "@/lib/store";
import { useColors } from "@/hooks/useColors";

const ROOM_TYPES: Array<{ type: Room["type"]; label: string; icon: string }> = [
  { type: "bedroom", label: "Bedroom", icon: "bed-double-outline" },
  { type: "living_room", label: "Living", icon: "sofa-outline" },
  { type: "kitchen", label: "Kitchen", icon: "chef-hat" },
  { type: "bathroom", label: "Bath", icon: "shower" },
  { type: "office", label: "Office", icon: "desk" },
  { type: "dining_room", label: "Dining", icon: "silverware-fork-knife" },
];

interface RoomPropertiesPanelProps {
  onClose?: () => void;
}

export function RoomPropertiesPanel({ onClose }: RoomPropertiesPanelProps) {
  const colors = useColors();
  const store = useDesignerStore();
  const selectedRoom = store.currentPlan?.rooms.find((r) => r.id === store.selectedRoomId);

  if (!selectedRoom) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.muted }]}>Select a room to edit its properties</Text>
      </View>
    );
  }

  const roomColor = (colors as any)[selectedRoom.type] || colors.primary;

  const handleTypeChange = (type: Room["type"]) => {
    store.updateRoom(selectedRoom.id, { type });
    store.calculateDirections();
  };

  const handleDimChange = (field: "width" | "height", delta: number) => {
    const newVal = Math.max(4, (selectedRoom[field] as number) + delta);
    const area = field === "width" ? newVal * selectedRoom.height * 4 : selectedRoom.width * newVal * 4;
    store.updateRoom(selectedRoom.id, { [field]: newVal, area });
    store.calculateDirections();
  };

  const handlePosChange = (field: "x" | "y", delta: number) => {
    const newVal = Math.max(0, (selectedRoom[field] as number) + delta);
    store.updateRoom(selectedRoom.id, { [field]: newVal });
    store.calculateDirections();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.colorDot, { backgroundColor: roomColor }]} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Room Properties</Text>
          {onClose && (
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ROOM TYPE</Text>
        <View style={styles.typeGrid}>
          {ROOM_TYPES.map((rt) => {
            const isActive = selectedRoom.type === rt.type;
            const c = (colors as any)[rt.type] || colors.primary;
            return (
              <Pressable
                key={rt.type}
                onPress={() => handleTypeChange(rt.type)}
                style={({ pressed }) => [
                  styles.typeBtn,
                  {
                    backgroundColor: isActive ? c + "22" : colors.background,
                    borderColor: isActive ? c : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons name={rt.icon as any} size={18} color={isActive ? c : colors.muted} />
                <Text style={[styles.typeBtnText, { color: isActive ? c : colors.muted }]}>{rt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View style={styles.halfSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>WIDTH</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => handleDimChange("width", -1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.foreground }]}>{selectedRoom.width}</Text>
              <Pressable onPress={() => handleDimChange("width", 1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
          <View style={styles.halfSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>HEIGHT</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => handleDimChange("height", -1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.foreground }]}>{selectedRoom.height}</Text>
              <Pressable onPress={() => handleDimChange("height", 1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>X POSITION</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => handlePosChange("x", -1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.foreground }]}>{selectedRoom.x}</Text>
              <Pressable onPress={() => handlePosChange("x", 1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
          <View style={styles.halfSection}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Y POSITION</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => handlePosChange("y", -1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="minus" size={14} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.stepValue, { color: colors.foreground }]}>{selectedRoom.y}</Text>
              <Pressable onPress={() => handlePosChange("y", 1)} style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="plus" size={14} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.infoChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Direction</Text>
            <Text style={[styles.infoValue, { color: roomColor }]}>{selectedRoom.direction}</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Area</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedRoom.area} sqft</Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            store.deleteRoom(selectedRoom.id);
            onClose?.();
          }}
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="trash-2" size={16} color="#fff" />
          <Text style={styles.deleteBtnText}>Delete Room</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: 340,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 8 },
  empty: { padding: 20, borderTopWidth: 1, alignItems: "center" },
  emptyText: { fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  typeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, minWidth: 80 },
  typeBtnText: { fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  halfSection: { flex: 1 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepValue: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600" },
  infoChip: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  infoLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "700" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#EF4444", borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  deleteBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
