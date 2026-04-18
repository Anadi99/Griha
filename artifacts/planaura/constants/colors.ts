/**
 * PlanAura Design Tokens
 * Theme: Red + White + Glassmorphism
 * Inspired by Apple/Linear — clean, premium, minimal
 */

const colors = {
  light: {
    // Base
    text: "#0A0A0A",
    tint: "#E02020",

    background: "#FAFAFA",
    foreground: "#0A0A0A",

    // Cards & surfaces
    card: "#FFFFFF",
    cardForeground: "#0A0A0A",
    surface: "#FFFFFF",
    surfaceElevated: "#F5F5F5",

    // Glass surfaces (use with BlurView)
    glass: "rgba(255,255,255,0.72)",
    glassBorder: "rgba(255,255,255,0.45)",
    glassDark: "rgba(0,0,0,0.04)",

    // Primary — Crimson Red
    primary: "#E02020",
    primaryDark: "#B91C1C",
    primaryLight: "#F87171",
    primaryForeground: "#FFFFFF",
    primaryMuted: "#FEF2F2",
    primarySubtle: "#FFF5F5",

    // Secondary — warm neutral
    secondary: "#F5F5F5",
    secondaryForeground: "#0A0A0A",

    // Muted
    muted: "#A3A3A3",
    mutedForeground: "#737373",
    mutedBg: "#F5F5F5",

    // Accent — deep rose/pink for highlights
    accent: "#F43F5E",
    accentForeground: "#FFFFFF",
    accentMuted: "#FFF1F2",

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
    border: "#E5E5E5",
    borderStrong: "#D4D4D4",
    borderSubtle: "#F0F0F0",
    input: "#F5F5F5",

    // Shadows
    shadow: "rgba(0,0,0,0.06)",
    shadowMd: "rgba(0,0,0,0.10)",
    shadowLg: "rgba(224,32,32,0.15)",

    // Room type colors
    bedroom: "#E02020",
    kitchen: "#EA580C",
    bathroom: "#0284C7",
    living_room: "#7C3AED",
    office: "#059669",
    dining_room: "#DB2777",
  },

  dark: {
    text: "#FAFAFA",
    tint: "#F87171",

    background: "#0A0A0A",
    foreground: "#FAFAFA",

    card: "#141414",
    cardForeground: "#FAFAFA",
    surface: "#141414",
    surfaceElevated: "#1C1C1C",

    glass: "rgba(20,20,20,0.75)",
    glassBorder: "rgba(255,255,255,0.10)",
    glassDark: "rgba(255,255,255,0.04)",

    primary: "#F87171",
    primaryDark: "#EF4444",
    primaryLight: "#FCA5A5",
    primaryForeground: "#0A0A0A",
    primaryMuted: "#2D1515",
    primarySubtle: "#1F0F0F",

    secondary: "#1C1C1C",
    secondaryForeground: "#FAFAFA",

    muted: "#525252",
    mutedForeground: "#A3A3A3",
    mutedBg: "#1C1C1C",

    accent: "#FB7185",
    accentForeground: "#0A0A0A",
    accentMuted: "#2D1520",

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

    border: "#262626",
    borderStrong: "#333333",
    borderSubtle: "#1C1C1C",
    input: "#1C1C1C",

    shadow: "rgba(0,0,0,0.4)",
    shadowMd: "rgba(0,0,0,0.6)",
    shadowLg: "rgba(248,113,113,0.12)",

    bedroom: "#F87171",
    kitchen: "#FB923C",
    bathroom: "#38BDF8",
    living_room: "#A78BFA",
    office: "#4ADE80",
    dining_room: "#F472B6",
  },

  radius: 16,
  radiusSm: 10,
  radiusXs: 6,
  radiusLg: 24,
  radiusXl: 32,
};

export default colors;
