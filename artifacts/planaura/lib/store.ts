import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Room {
  id: string;
  type: "bedroom" | "kitchen" | "bathroom" | "living_room" | "office" | "dining_room";
  x: number;
  y: number;
  width: number;
  height: number;
  direction: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  area: number;
  label?: string;
}

export interface Plan {
  id: string;
  name: string;
  rooms: Room[];
  totalArea: number;
  vastuScore: number;
  costEstimate: number;
  costTier: "basic" | "standard" | "premium";
  createdAt: string;
  updatedAt: string;
}

interface DesignerStore {
  currentPlan: Plan | null;
  savedPlans: Plan[];
  selectedRoomId: string | null;
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;

  createNewPlan: (name: string) => void;
  loadPlan: (plan: Plan) => void;
  savePlan: () => Promise<void>;
  loadSavedPlans: () => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addRoom: (room: Omit<Room, "id">) => void;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  selectRoom: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  calculateTotalArea: () => number;
  calculateDirections: () => void;
}

const STORAGE_KEY = "planaura_plans";

export const useDesignerStore = create<DesignerStore>((set, get) => ({
  currentPlan: null,
  savedPlans: [],
  selectedRoomId: null,
  gridSize: 20,
  zoom: 1,
  panX: 0,
  panY: 0,

  createNewPlan: (name: string) => {
    const now = new Date().toISOString();
    set({
      currentPlan: {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        rooms: [],
        totalArea: 0,
        vastuScore: 0,
        costEstimate: 0,
        costTier: "standard",
        createdAt: now,
        updatedAt: now,
      },
      selectedRoomId: null,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  },

  loadPlan: (plan: Plan) => {
    set({
      currentPlan: plan,
      selectedRoomId: null,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  },

  savePlan: async () => {
    const { currentPlan, savedPlans } = get();
    if (!currentPlan) return;

    const updated = currentPlan.updatedAt !== new Date().toISOString()
      ? { ...currentPlan, updatedAt: new Date().toISOString() }
      : currentPlan;

    const existing = savedPlans.findIndex((p) => p.id === updated.id);
    let newPlans: Plan[];
    if (existing >= 0) {
      newPlans = [...savedPlans];
      newPlans[existing] = updated;
    } else {
      newPlans = [updated, ...savedPlans];
    }

    set({ savedPlans: newPlans, currentPlan: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPlans));
  },

  loadSavedPlans: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const plans: Plan[] = JSON.parse(data);
        set({ savedPlans: plans });
      }
    } catch (_) {}
  },

  deletePlan: async (id: string) => {
    const { savedPlans, currentPlan } = get();
    const newPlans = savedPlans.filter((p) => p.id !== id);
    set({
      savedPlans: newPlans,
      currentPlan: currentPlan?.id === id ? null : currentPlan,
    });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPlans));
  },

  addRoom: (room: Omit<Room, "id">) => {
    set((state) => {
      if (!state.currentPlan) return state;
      const newRoom: Room = {
        ...room,
        id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      const updatedRooms = [...state.currentPlan.rooms, newRoom];
      const totalArea = updatedRooms.reduce((sum, r) => sum + r.area, 0);
      return {
        currentPlan: {
          ...state.currentPlan,
          rooms: updatedRooms,
          totalArea,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  updateRoom: (id: string, updates: Partial<Room>) => {
    set((state) => {
      if (!state.currentPlan) return state;
      const updatedRooms = state.currentPlan.rooms.map((room) =>
        room.id === id ? { ...room, ...updates } : room
      );
      const totalArea = updatedRooms.reduce((sum, r) => sum + r.area, 0);
      return {
        currentPlan: {
          ...state.currentPlan,
          rooms: updatedRooms,
          totalArea,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  deleteRoom: (id: string) => {
    set((state) => {
      if (!state.currentPlan) return state;
      const updatedRooms = state.currentPlan.rooms.filter((r) => r.id !== id);
      const totalArea = updatedRooms.reduce((sum, r) => sum + r.area, 0);
      return {
        currentPlan: {
          ...state.currentPlan,
          rooms: updatedRooms,
          totalArea,
          updatedAt: new Date().toISOString(),
        },
        selectedRoomId: state.selectedRoomId === id ? null : state.selectedRoomId,
      };
    });
  },

  selectRoom: (id: string | null) => {
    set({ selectedRoomId: id });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.3, Math.min(4, zoom)) });
  },

  setPan: (x: number, y: number) => {
    set({ panX: x, panY: y });
  },

  calculateTotalArea: () => {
    const state = get();
    if (!state.currentPlan) return 0;
    return state.currentPlan.rooms.reduce((sum, room) => sum + room.area, 0);
  },

  calculateDirections: () => {
    set((state) => {
      if (!state.currentPlan) return state;
      const updatedRooms = state.currentPlan.rooms.map((room) => {
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;
        const angle = Math.atan2(centerY, centerX) * (180 / Math.PI);
        const normalizedAngle = (angle + 360) % 360;
        let direction: Room["direction"] = "N";
        if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) direction = "E";
        else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) direction = "SE";
        else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) direction = "S";
        else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) direction = "SW";
        else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) direction = "W";
        else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) direction = "NW";
        else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) direction = "N";
        else if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) direction = "NE";
        return { ...room, direction };
      });
      return {
        currentPlan: {
          ...state.currentPlan,
          rooms: updatedRooms,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },
}));
