/**
 * Griha Design Tokens — Obsidian Ocean
 * Spatial Glassmorphism × Technical Brutalism
 * Primary: Sky Blue (#38BDF8) | Secondary: Indigo (#818CF8)
 * Environment: Deep navy void with ambient light leaks
 */

const colors = {
  light: {
    // ── Light mode (warm fallback) ──
    text: "#0F172A",
    tint: "#0284C7",
    background: "#F8FAFC",
    foreground: "#0F172A",
    canvas: "#F1F5F9",
    canvasBorder: "#E2E8F0",
    card: "#FFFFFF",
    cardForeground: "#0F172A",
    surface: "#FFFFFF",
    surfaceElevated: "#F8FAFC",
    glass: "rgba(255,255,255,0.70)",
    glassBorder: "rgba(255,255,255,0.40)",
    glassDark: "rgba(15,23,42,0.04)",
    primary: "#0284C7",
    primaryDark: "#0369A1",
    primaryLight: "#38BDF8",
    primaryForeground: "#FFFFFF",
    primaryMuted: "#E0F2FE",
    primarySubtle: "#F0F9FF",
    accent: "#6366F1",
    accentForeground: "#FFFFFF",
    accentMuted: "#EEF2FF",
    secondary: "#F1F5F9",
    secondaryForeground: "#0F172A",
    muted: "#94A3B8",
    mutedForeground: "#64748B",
    mutedBg: "#F1F5F9",
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    destructiveMuted: "#FEF2F2",
    success: "#22C55E",
    successForeground: "#FFFFFF",
    successMuted: "#F0FDF4",
    warning: "#F59E0B",
    warningForeground: "#FFFFFF",
    warningMuted: "#FFFBEB",
    info: "#38BDF8",
    infoForeground: "#FFFFFF",
    infoMuted: "#E0F2FE",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    borderSubtle: "#F1F5F9",
    input: "#F1F5F9",
    shadow: "rgba(15,23,42,0.06)",
    shadowMd: "rgba(15,23,42,0.12)",
    shadowLg: "rgba(56,189,248,0.15)",
    // Room colors — vibrant on light
    bedroom: "#818CF8",
    kitchen: "#FB923C",
    bathroom: "#34D399",
    living_room: "#38BDF8",
    office: "#A78BFA",
    dining_room: "#FACC15",
  },

  dark: {
    // ── Dark mode — Obsidian Ocean ──
    text: "#DEE3E8",
    tint: "#38BDF8",

    // Deep void backgrounds
    background: "#0D1322",       // obsidian base
    foreground: "#DEE3E8",

    // Canvas — slightly lighter than bg
    canvas: "#0A0F1D",           // deepest void
    canvasBorder: "#1E2A3A",

    // Surface layers (depth system)
    card: "#151B2B",             // surface-container-low
    cardForeground: "#DEE3E8",
    surface: "#191F2F",          // surface-container
    surfaceElevated: "#242A3A",  // surface-container-high

    // Obsidian Glass
    glass: "rgba(13,19,34,0.75)",
    glassBorder: "rgba(255,255,255,0.08)",
    glassDark: "rgba(255,255,255,0.04)",

    // Primary — Sky Blue
    primary: "#38BDF8",          // primary-container / CTA
    primaryDark: "#0284C7",
    primaryLight: "#7DD3FC",
    primaryForeground: "#00354A",
    primaryMuted: "rgba(56,189,248,0.12)",
    primarySubtle: "rgba(56,189,248,0.06)",

    // Accent — Indigo glow
    accent: "#818CF8",
    accentForeground: "#FFFFFF",
    accentMuted: "rgba(129,140,248,0.15)",

    // Secondary
    secondary: "#242A3A",
    secondaryForeground: "#DEE3E8",

    // Muted
    muted: "#4A5568",
    mutedForeground: "#94A3B8",  // slate gray — metadata
    mutedBg: "#1E2A3A",

    // Semantic
    destructive: "#FF6B6B",
    destructiveForeground: "#FFFFFF",
    destructiveMuted: "rgba(255,107,107,0.15)",

    success: "#34D399",
    successForeground: "#FFFFFF",
    successMuted: "rgba(52,211,153,0.12)",

    warning: "#FBBF24",
    warningForeground: "#FFFFFF",
    warningMuted: "rgba(251,191,36,0.12)",

    info: "#38BDF8",
    infoForeground: "#FFFFFF",
    infoMuted: "rgba(56,189,248,0.12)",

    // Borders — "light-saber" etched light
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.14)",
    borderSubtle: "rgba(255,255,255,0.04)",
    input: "#1E2A3A",

    // Shadows
    shadow: "rgba(0,0,0,0.4)",
    shadowMd: "rgba(0,0,0,0.6)",
    shadowLg: "rgba(56,189,248,0.20)",  // sky glow

    // Room colors — luminous on dark
    bedroom: "#A5B4FC",          // soft indigo
    kitchen: "#FDBA74",          // warm orange
    bathroom: "#6EE7B7",         // mint
    living_room: "#7DD3FC",      // sky
    office: "#C4B5FD",           // violet
    dining_room: "#FDE68A",      // amber
  },

  radius: 16,
  radiusSm: 8,
  radiusXs: 4,
  radiusLg: 24,
  radiusXl: 32,
};

export default colors;
