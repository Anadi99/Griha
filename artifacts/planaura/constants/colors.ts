/**
 * Griha Design Tokens
 * Theme: Brown + White — warm, premium, canvas-first
 * Figma precision × Canva simplicity × Airbnb warmth
 */

const colors = {
  light: {
    // Base
    text: "#1C1008",
    tint: "#8B5E3C",

    background: "#FDFAF7",       // warm off-white — never cold
    foreground: "#1C1008",       // deep warm black

    // Canvas surface
    canvas: "#F5F0E8",           // warm parchment — the drawing area
    canvasBorder: "#E8DDD0",

    // Cards & surfaces
    card: "#FFFFFF",
    cardForeground: "#1C1008",
    surface: "#FFFFFF",
    surfaceElevated: "#FAF7F3",

    // Glass surfaces (BlurView)
    glass: "rgba(255,255,255,0.72)",
    glassBorder: "rgba(255,255,255,0.45)",
    glassDark: "rgba(28,16,8,0.04)",

    // Primary — Warm Brown
    primary: "#8B5E3C",          // medium warm brown
    primaryDark: "#6B4423",      // deep espresso
    primaryLight: "#C49A6C",     // caramel
    primaryForeground: "#FFFFFF",
    primaryMuted: "#F5EDE3",     // very light warm tint
    primarySubtle: "#FBF7F3",

    // Accent — Terracotta (CTA, highlights)
    accent: "#C4714A",           // terracotta
    accentForeground: "#FFFFFF",
    accentMuted: "#FAEEE6",

    // Secondary
    secondary: "#F5EDE3",
    secondaryForeground: "#6B4423",

    // Muted
    muted: "#A89080",
    mutedForeground: "#7A6050",
    mutedBg: "#F5EDE3",

    // Semantic
    destructive: "#DC2626",
    destructiveForeground: "#FFFFFF",
    destructiveMuted: "#FEF2F2",

    success: "#16A34A",
    successForeground: "#FFFFFF",
    successMuted: "#F0FDF4",

    warning: "#D97706",
    warningForeground: "#FFFFFF",
    warningMuted: "#FFFBEB",

    info: "#2563EB",
    infoForeground: "#FFFFFF",
    infoMuted: "#EFF6FF",

    // Borders
    border: "#E8DDD0",
    borderStrong: "#D4C4B0",
    borderSubtle: "#F0EAE0",
    input: "#F5EDE3",

    // Shadows
    shadow: "rgba(139,94,60,0.08)",
    shadowMd: "rgba(139,94,60,0.14)",
    shadowLg: "rgba(139,94,60,0.20)",

    // Room type colors — soft, Canva-style
    bedroom: "#C084FC",          // soft purple
    kitchen: "#FB923C",          // warm orange
    bathroom: "#34D399",         // mint
    living_room: "#38BDF8",      // sky blue
    office: "#6366F1",           // indigo
    dining_room: "#FACC15",      // yellow
  },

  dark: {
    text: "#F5EDE3",
    tint: "#C49A6C",

    background: "#120A04",       // deep walnut
    foreground: "#F5EDE3",

    canvas: "#1A1008",           // dark parchment
    canvasBorder: "#2D1F12",

    card: "#1E1208",
    cardForeground: "#F5EDE3",
    surface: "#1E1208",
    surfaceElevated: "#261810",

    glass: "rgba(30,18,8,0.80)",
    glassBorder: "rgba(196,154,108,0.15)",
    glassDark: "rgba(245,237,227,0.04)",

    primary: "#C49A6C",          // caramel in dark mode
    primaryDark: "#A07848",
    primaryLight: "#DDB98A",
    primaryForeground: "#120A04",
    primaryMuted: "#2D1F12",
    primarySubtle: "#1E1208",

    accent: "#D4956A",
    accentForeground: "#120A04",
    accentMuted: "#2D1A0E",

    secondary: "#2D1F12",
    secondaryForeground: "#C49A6C",

    muted: "#5C4030",
    mutedForeground: "#A89080",
    mutedBg: "#261810",

    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    destructiveMuted: "#2D1515",

    success: "#22C55E",
    successForeground: "#FFFFFF",
    successMuted: "#0F2D1A",

    warning: "#F59E0B",
    warningForeground: "#FFFFFF",
    warningMuted: "#2D1F05",

    info: "#3B82F6",
    infoForeground: "#FFFFFF",
    infoMuted: "#0F1D2D",

    border: "#2D1F12",
    borderStrong: "#3D2A18",
    borderSubtle: "#221508",
    input: "#261810",

    shadow: "rgba(0,0,0,0.4)",
    shadowMd: "rgba(0,0,0,0.6)",
    shadowLg: "rgba(196,154,108,0.12)",

    bedroom: "#D8B4FE",
    kitchen: "#FDBA74",
    bathroom: "#6EE7B7",
    living_room: "#7DD3FC",
    office: "#A5B4FC",
    dining_room: "#FDE68A",
  },

  radius: 16,
  radiusSm: 10,
  radiusXs: 6,
  radiusLg: 24,
  radiusXl: 32,
};

export default colors;
