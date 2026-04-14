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
  history: Room[][];
  historyIndex: number;

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
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const STORAGE_KEY = "planaura_plans";
const MAX_HISTORY = 50;

function calcDirection(cx: number, cy: number): Room["direction"] {
  const angle = Math.atan2(cy, cx) * (180 / Math.PI);
  const a = (angle + 360) % 360;
  if (a >= 337.5 || a < 22.5) return "E";
  if (a >= 22.5 && a < 67.5) return "SE";
  if (a >= 67.5 && a < 112.5) return "S";
  if (a >= 112.5 && a < 157.5) return "SW";
  if (a >= 157.5 && a < 202.5) return "W";
  if (a >= 202.5 && a < 247.5) return "NW";
  if (a >= 247.5 && a < 292.5) return "N";
  return "NE";
}

export const useDesignerStore = create<DesignerStore>((set, get) => ({
  currentPlan: null,
  savedPlans: [],
  selectedRoomId: null,
  gridSize: 20,
  zoom: 1,
  panX: 0,
  panY: 0,
  history: [],
  historyIndex: -1,

  pushHistory: () => {
    const { currentPlan, history, historyIndex } = get();
    if (!currentPlan) return;
    const snapshot = JSON.parse(JSON.stringify(currentPlan.rooms)) as Room[];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { currentPlan, history, historyIndex } = get();
    if (!currentPlan || historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const rooms = JSON.parse(JSON.stringify(history[newIndex])) as Room[];
    const totalArea = rooms.reduce((s, r) => s + r.area, 0);
    set({
      historyIndex: newIndex,
      currentPlan: { ...currentPlan, rooms, totalArea, updatedAt: new Date().toISOString() },
      selectedRoomId: null,
    });
  },

  redo: () => {
    const { currentPlan, history, historyIndex } = get();
    if (!currentPlan || historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const rooms = JSON.parse(JSON.stringify(history[newIndex])) as Room[];
    const totalArea = rooms.reduce((s, r) => s + r.area, 0);
    set({
      historyIndex: newIndex,
      currentPlan: { ...currentPlan, rooms, totalArea, updatedAt: new Date().toISOString() },
      selectedRoomId: null,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

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
      history: [[]],
      historyIndex: 0,
    });
  },

  loadPlan: (plan: Plan) => {
    const rooms = plan.rooms;
    set({
      currentPlan: plan,
      selectedRoomId: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      history: [JSON.parse(JSON.stringify(rooms))],
      historyIndex: 0,
    });
  },

  savePlan: async () => {
    const { currentPlan, savedPlans } = get();
    if (!currentPlan) return;
    const updated = { ...currentPlan, updatedAt: new Date().toISOString() };
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
      if (data) set({ savedPlans: JSON.parse(data) });
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
    get().pushHistory();
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
    get().pushHistory();
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

  selectRoom: (id: string | null) => set({ selectedRoomId: id }),
  setZoom: (zoom: number) => set({ zoom: Math.max(0.25, Math.min(5, zoom)) }),
  setPan: (x: number, y: number) => set({ panX: x, panY: y }),

  calculateTotalArea: () => {
    const state = get();
    if (!state.currentPlan) return 0;
    return state.currentPlan.rooms.reduce((sum, room) => sum + room.area, 0);
  },

  calculateDirections: () => {
    set((state) => {
      if (!state.currentPlan) return state;
      const updatedRooms = state.currentPlan.rooms.map((room) => ({
        ...room,
        direction: calcDirection(room.x + room.width / 2, room.y + room.height / 2),
      }));
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
