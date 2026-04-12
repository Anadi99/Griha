import { Room, Plan } from "@/lib/store";

export interface VastuIssue {
  id: string;
  roomId: string;
  roomType: Room["type"];
  severity: "high" | "medium" | "low";
  message: string;
}

export interface VastuPositive {
  id: string;
  roomId: string;
  roomType: Room["type"];
  message: string;
}

export interface VastuSuggestion {
  id: string;
  roomId: string;
  priority: "high" | "medium" | "low";
  message: string;
  suggestedDirection?: Room["direction"];
}

export interface VastuAnalysis {
  score: number;
  issues: VastuIssue[];
  positives: VastuPositive[];
  suggestions: VastuSuggestion[];
}

const PREFERRED_DIRECTIONS: Record<Room["type"], Room["direction"][]> = {
  bedroom: ["SW", "W", "NW"],
  kitchen: ["SE", "S"],
  bathroom: ["NW", "N"],
  living_room: ["N", "E", "NE"],
  office: ["N", "E", "NE"],
  dining_room: ["W", "E"],
};

const AVOID_DIRECTIONS: Record<Room["type"], Room["direction"][]> = {
  bedroom: ["N", "NE"],
  kitchen: ["N", "NW"],
  bathroom: ["NE", "E"],
  living_room: ["S", "SW"],
  office: ["S", "SW"],
  dining_room: ["S"],
};

const ROOM_NAMES: Record<Room["type"], string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  living_room: "Living Room",
  office: "Office",
  dining_room: "Dining Room",
};

export function analyzeVastu(plan: Plan): VastuAnalysis {
  const issues: VastuIssue[] = [];
  const positives: VastuPositive[] = [];
  const suggestions: VastuSuggestion[] = [];

  plan.rooms.forEach((room) => {
    const preferred = PREFERRED_DIRECTIONS[room.type];
    const avoid = AVOID_DIRECTIONS[room.type];
    const name = ROOM_NAMES[room.type];

    if (preferred.includes(room.direction)) {
      positives.push({
        id: `pos_${room.id}`,
        roomId: room.id,
        roomType: room.type,
        message: `${name} is well-placed in the ${room.direction} direction`,
      });
    } else if (avoid.includes(room.direction)) {
      issues.push({
        id: `issue_${room.id}_avoid`,
        roomId: room.id,
        roomType: room.type,
        severity: "high",
        message: `${name} should avoid ${room.direction} direction per Vastu principles`,
      });
      const suggestedDir = preferred[0];
      suggestions.push({
        id: `sug_${room.id}_move`,
        roomId: room.id,
        priority: "high",
        message: `Move ${name} to ${suggestedDir} direction for better energy alignment`,
        suggestedDirection: suggestedDir,
      });
    } else {
      suggestions.push({
        id: `sug_${room.id}_improve`,
        roomId: room.id,
        priority: "medium",
        message: `Consider moving ${name} to ${preferred[0]} direction for optimal Vastu energy`,
        suggestedDirection: preferred[0],
      });
    }
  });

  const roomsByType = new Map<Room["type"], Room[]>();
  plan.rooms.forEach((room) => {
    if (!roomsByType.has(room.type)) roomsByType.set(room.type, []);
    roomsByType.get(room.type)!.push(room);
  });

  if ((roomsByType.get("kitchen")?.length ?? 0) > 1) {
    issues.push({
      id: "issue_multiple_kitchens",
      roomId: "",
      roomType: "kitchen",
      severity: "medium",
      message: "Multiple kitchens detected — only one kitchen is recommended",
    });
  }

  let score = 100;
  issues.forEach((issue) => {
    if (issue.severity === "high") score -= 15;
    else if (issue.severity === "medium") score -= 10;
    else score -= 5;
  });
  score += positives.length * 5;
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    issues,
    positives,
    suggestions,
  };
}

export function getVastuScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

export function getVastuScoreStatus(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Improvement";
}
