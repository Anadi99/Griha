/**
 * Griha AI Service — Google Gemini integration
 * Handles: Vastu chat, room scan analysis, layout suggestions
 *
 * API key: set EXPO_PUBLIC_GEMINI_KEY in your .env file
 * Get a free key at: https://aistudio.google.com
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Plan, Room } from "@/lib/store";

/* ── Init ── */
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? "";

function getClient() {
  if (!API_KEY) throw new Error("EXPO_PUBLIC_GEMINI_KEY is not set. Add it to your .env file.");
  return new GoogleGenerativeAI(API_KEY);
}

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

/* ── System context for Vastu ── */
const VASTU_SYSTEM = `You are Griha AI, an expert Vastu Shastra consultant and home design advisor built into the Griha app.

Your expertise:
- Vastu Shastra principles (directions, elements, energy flow)
- Floor plan design and room placement
- Indian home construction and architecture
- Construction cost estimation (Indian market)
- Spatial energy optimization

Rules:
- Be concise and practical — users are designing homes on mobile
- Give specific, actionable advice
- Use simple language, avoid jargon
- When discussing directions, always reference N/S/E/W
- Keep responses under 200 words unless asked for detail
- Format with bullet points when listing multiple items`;

/* ── Types ── */
export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface VastuChatContext {
  plan: Plan | null;
  vastuScore: number;
}

/* ── 1. Vastu AI Chat ── */
export async function chatWithVastuAI(
  messages: ChatMessage[],
  context: VastuChatContext,
  userMessage: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: VASTU_SYSTEM,
    safetySettings: SAFETY,
  });

  // Build context about the current floor plan
  let planContext = "";
  if (context.plan && context.plan.rooms.length > 0) {
    const roomSummary = context.plan.rooms
      .map((r) => `${r.type.replace("_", " ")} facing ${r.direction}`)
      .join(", ");
    planContext = `\n\nCurrent floor plan: "${context.plan.name}"
Rooms: ${roomSummary}
Total area: ${context.plan.totalArea} sqft
Vastu score: ${context.vastuScore}/100
Cost tier: ${context.plan.costTier}`;
  } else {
    planContext = "\n\nNo floor plan loaded yet.";
  }

  // Build chat history
  const history = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(
    userMessage + planContext
  );

  return result.response.text();
}

/* ── 2. AI Room Scan Analysis ── */
export async function analyzeRoomWithAI(
  imageBase64: string,
  roomType: string,
  answers: Record<string, string>
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: SAFETY,
  });

  const answerText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `You are a Vastu Shastra expert analyzing a ${roomType} for energy alignment.

Room details provided by the user:
${answerText}

Look at this room photo and provide:
1. **Vastu Score** (0-100) based on what you can see
2. **Top 3 Issues** — specific problems visible in the room
3. **Top 3 Fixes** — exact, actionable changes to improve energy
4. **What's Good** — positive elements to keep

Be specific about furniture placement, colors, clutter, light, and directions.
Keep each point to 1-2 sentences. Total response under 300 words.`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: "image/jpeg" as const,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  return result.response.text();
}

/* ── 3. AI Layout Generator ── */
export interface LayoutRequirements {
  plotWidth: number;
  plotHeight: number;
  facing: string;
  rooms: string;
  family: string;
  budget: string;
  preferences: string;
  city: string;
}

export async function generateLayoutWithAI(req: LayoutRequirements): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: VASTU_SYSTEM,
    safetySettings: SAFETY,
  });

  const prompt = `Design a Vastu-compliant floor plan for:

Plot: ${req.plotWidth} × ${req.plotHeight} grid units (1 unit ≈ 2 ft)
Plot facing: ${req.facing}
Rooms needed: ${req.rooms}
Family type: ${req.family}
Budget: ${req.budget}
Location: ${req.city}
Special preferences: ${req.preferences || "None"}

Provide:
1. **Room Placement Guide** — which direction each room should be in and why
2. **Layout Tips** — 3 specific Vastu rules for this plot orientation
3. **Priority Order** — which rooms to place first for best energy flow
4. **Warnings** — any combinations to avoid for this family type

Format clearly with headers. Keep it practical and actionable.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/* ── 4. Quick Vastu tip for a single room ── */
export async function getQuickVastuTip(
  roomType: string,
  direction: string,
  issue?: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: SAFETY,
  });

  const prompt = issue
    ? `Quick Vastu fix for a ${roomType} facing ${direction}: ${issue}. Give 2-3 specific remedies in under 80 words.`
    : `Best Vastu tip for a ${roomType} facing ${direction}. One practical tip in under 60 words.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/* ── Helper: convert image URI to base64 ── */
export async function imageUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
