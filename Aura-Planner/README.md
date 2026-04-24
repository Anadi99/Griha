<div align="center">

<br />

<img src="artifacts/planaura/assets/images/icon.png" width="96" height="96" style="border-radius: 24px" />

<br />
<br />

# Griha

### The complete home planning decision engine.

**Design · Analyze · Simulate · Estimate · Compare · Generate**

*Offline-first. No account. No internet. Just open and build.*

<br />

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange?style=flat-square)](https://zustand-demo.pmnd.rs)
[![License](https://img.shields.io/badge/License-MIT-E02020?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey?style=flat-square)](https://expo.dev)

<br />

</div>

---

## The Problem

Building or renovating a home in India involves three expensive, disconnected problems that nobody has solved in one place:

**Visualization** — Most people cannot read architectural drawings. They rely entirely on their architect's sketch, realizing too late that the layout doesn't work for them.

**Vastu compliance** — Over 80% of Indian homeowners want Vastu-compliant homes. Getting a Vastu consultant costs money, takes time, and gives advice after the structure is already built — when changes are expensive or impossible.

**Cost blindness** — People start construction without any idea of what it will cost. They get surprised mid-project, run out of budget, or get overcharged because they had no reference point.

**Griha solves all three — and goes further — in one offline app, for free, before a single brick is laid.**

---

## What is Griha?

Griha (Sanskrit: *गृह* — home) is a mobile-first spatial intelligence platform for iOS and Android. It transforms how people plan, design, and analyze their living spaces by combining:

- A professional-grade 2D floor plan canvas
- Real-time Vastu Shastra energy analysis
- Sunlight and shadow simulation
- Ventilation and airflow analysis
- AI-powered layout generation (offline, rule-based)
- Construction cost estimation with material BOQ
- Location-based climate intelligence
- Photo-based room Vastu scanning
- Side-by-side plan comparison

Everything runs **100% offline**. No account. No subscription. No internet dependency.

---

## Features

### 1. Canvas Designer

A Figma-grade interactive floor plan canvas built from scratch on React Native SVG and PanResponder.

- Draw rooms by dragging on a precision grid
- 6 room types: Bedroom, Living Room, Kitchen, Bathroom, Office, Dining Room
- Select, move, resize with 8-handle bounding box (corners + edges)
- Pinch-to-zoom with stable midpoint — no canvas jumping
- Pan with RAF-based inertia — flick and it glides naturally
- Alignment snap guides across all room edges and centers
- Live W×H dimension badge while dragging or resizing
- Undo / redo with full history (up to 50 steps)
- Room type icons rendered inside each room body
- Compass widget showing selected room's cardinal direction
- Minimap with red viewport indicator
- Export canvas as PNG → native share sheet
- Zero re-renders during gesture — all state in refs

### 2. Vastu Energy Analysis

Real-time Vastu Shastra scoring based on room placement and cardinal directions. Updates live as you design.

- Animated arc gauge (0–100) with color zones
- Per-room issue detection with severity levels (high / medium / low)
- Positive placement recognition
- Actionable suggestions with recommended directions
- Score updates instantly on every room move or resize

**Scoring logic:**
```
Start: 100
  − 15 per high-severity issue
  − 10 per medium-severity issue
  − 5  per low-severity issue
  + 5  per positive placement
  Clamped: [0, 100]
```

### 3. Sunlight Simulation

Simulates how sunlight enters each room throughout the day — no physics engine, pure directional geometry.

- Time slider: 6 AM → 6 PM (13 time steps)
- Per-room lit fraction calculated from compass direction + window positions
- Daily sunlight score per room
- Tags: Morning Sun / Afternoon Sun / All-Day Sun / Low Light / Hot Zone
- Overall sunlight score for the full plan
- Sun arc position for UI rendering

### 4. Ventilation & Airflow Analysis

Rule-based airflow detection across the entire floor plan.

- Cross-ventilation detection (openings on opposite walls)
- Adjacent room airflow paths with strength (strong / moderate / weak)
- Dead zone identification (rooms with no openings)
- Per-room ventilation score and label
- Labels: Good Cross Ventilation / Single Opening / Stagnant Air Zone / Blocked Airflow

### 5. AI Layout Generator (Offline)

Generates 3 Vastu-optimized floor plan layouts from plot size and room requirements — no AI API, pure rule-based logic.

- Input: plot width × height + room count per type
- Output: 3 layout variants
  - **Vastu Optimized** — rooms in ideal Vastu zones
  - **Compact** — space-efficient, maximizes usable area
  - **Open Plan** — spacious with breathing room between zones
- Mini floor plan preview for each layout
- Vastu score + space efficiency % per layout
- One tap to load any layout directly into the Designer

### 6. Room Scan

Photo-based Vastu analysis for existing rooms — no canvas required.

- Take a photo with camera or upload from gallery
- Select room type
- Answer guided questionnaire (5–7 questions, room-specific)
- Get instant Vastu score + detailed report

**Questions include:**
- Entrance direction, window direction
- Clutter level, natural light, ventilation quality
- Bedroom: bed headboard direction, attached bathroom
- Kitchen: cooking direction
- Office: work desk direction

**Results include:**
- Score ring (0–100) with animated counter
- "What to Fix" — specific corrections sorted by priority with Vastu reasoning
- "Issues Found" — what's wrong and why
- "What's Working" — positive elements to maintain

### 7. Cost Estimation

Live construction cost breakdown that updates as you design.

- 3 tiers: Economy (₹1,500/sqft) · Standard (₹2,500/sqft) · Premium (₹4,500/sqft)
- Animated cost counter on tier switch
- Full breakdown: Structure 50% · Interiors 20% · Electrical 15% · Plumbing 15%
- Animated progress bars per category

### 8. BOQ — Bill of Quantities

Material estimation based on standard Indian construction norms.

| Material | Unit | Basis |
|---|---|---|
| Cement (OPC 53) | Bags | 0.4–0.5 bags/sqft |
| TMT Steel | kg | 2.5–3.5 kg/sqft |
| Red Clay Bricks | nos | 8–10/sqft |
| River Sand | cft | 0.6–0.8 cft/sqft |
| Floor Tiles | sqft | 1.1–1.2× area |
| Interior Paint | litres | 0.08–0.12 ltr/sqft |
| Electrical Wiring | metres | 0.5–0.7 m/sqft |
| PVC Pipes | metres | 0.15–0.20 m/sqft |

Per-item cost breakdown with tier multipliers. Not engineering-grade — directional estimation for budget planning.

### 9. Location Intelligence

Offline dataset for 10 major Indian cities with climate-based design recommendations.

**Cities covered:** Mumbai · Delhi · Bangalore · Chennai · Hyderabad · Pune · Kolkata · Ahmedabad · Jaipur · Chandigarh

**Per city data:**
- Climate type (Hot Dry / Hot Humid / Composite / Temperate / Cold)
- Average daily sun hours
- Average annual temperature
- Humidity level
- Construction cost multiplier
- 4 location-specific design tips

**Example tips:**
> *"High humidity — prioritize cross ventilation in all rooms"* — Mumbai
> *"Desert climate — traditional jali screens reduce heat"* — Jaipur
> *"South-facing rooms get maximum winter sun"* — Delhi

### 10. Compare Mode

Side-by-side decision engine for choosing between two plans.

- Select any 2 saved plans
- Score bars: Vastu / Sunlight / Airflow
- Metric table: score, area, cost — winner highlighted in green
- Composite scoring algorithm determines recommended plan
- "Plan X is recommended" banner

### 11. Plans Library

Full local persistence with a polished saved plans library.

- Save, load, rename, delete plans
- Per-card: Vastu score chip, cost estimate chip, room type pills
- Skeleton shimmer loading state
- Staggered card entrance animations

### 12. Marketplace (v1 Preview)

Browse architects, contractors, and building materials. Contact/quote flow coming in v2.

### 13. Onboarding

3-slide onboarding shown once on first launch. Skip-able. Animated icon cards, gradient CTAs.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | React Native 0.81 + Expo 54 | Cross-platform, fast iteration |
| Navigation | Expo Router 6 (file-based) | Type-safe routes, zero config |
| Language | TypeScript 5.9 (strict) | Catch errors at compile time |
| State | Zustand 5 | Minimal, no boilerplate |
| Persistence | AsyncStorage | Offline-first, no backend |
| Canvas | react-native-svg + PanResponder | Zero-lag gestures, native driver |
| Animations | React Native Animated API | Native driver, 60fps |
| Export | react-native-view-shot + Share API | PNG capture + native share |
| Fonts | Inter via @expo-google-fonts | Clean, readable, professional |
| Build | EAS Build (Expo Application Services) | Cloud builds for both stores |

---

## Architecture

```
Griha/
├── app/                          # Expo Router — all screens
│   ├── _layout.tsx               # Root layout + ToastProvider + onboarding gate
│   ├── onboarding.tsx            # 3-slide onboarding (shown once)
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar (8 tabs)
│       ├── index.tsx             # Home screen
│       ├── designer.tsx          # Canvas designer
│       ├── plans.tsx             # Saved plans library
│       ├── scan.tsx              # Photo-based room scan
│       ├── insights.tsx          # Sunlight + Airflow + BOQ + Location
│       ├── generate.tsx          # AI layout generator
│       ├── compare.tsx           # Side-by-side plan comparison
│       └── marketplace.tsx       # Explore tab
│
├── components/
│   ├── FloorPlanCanvas.tsx       # Core canvas — 700 lines, full gesture engine
│   ├── CompassWidget.tsx         # SVG compass with direction tracking
│   ├── VastuPanel.tsx            # Arc gauge + analysis panel
│   ├── CostPanel.tsx             # Animated cost breakdown
│   ├── RoomPropertiesPanel.tsx   # Room editor (type, dims, position)
│   ├── ExportButton.tsx          # PNG capture + native share
│   ├── Toast.tsx                 # Global slide-in toast system
│   └── ScalePress.tsx            # Spring-animated press component
│
├── lib/
│   ├── store.ts                  # Zustand store (plans, rooms, openings, history)
│   ├── vastu-engine.ts           # Vastu scoring algorithm
│   ├── sunlight-engine.ts        # Directional sunlight simulation
│   ├── ventilation-engine.ts     # Airflow and cross-ventilation analysis
│   ├── layout-generator.ts       # Rule-based layout generation
│   ├── boq-engine.ts             # Material quantity estimation
│   ├── location-data.ts          # Offline city/climate dataset
│   ├── cost-calculator.ts        # 3-tier cost estimation
│   ├── room-scan-engine.ts       # Photo scan Vastu analysis
│   └── marketplace.ts            # Mock marketplace data
│
├── constants/
│   └── colors.ts                 # Full light + dark design tokens
│
└── hooks/
    └── useColors.ts              # Theme-aware color hook
```

---

## Design System

**Theme:** Red + White + Glassmorphism — inspired by Apple's spatial UI and Nike's bold minimalism.

| Token | Light | Dark |
|---|---|---|
| Primary | `#E02020` Crimson Red | `#F87171` |
| Background | `#FAFAFA` | `#0A0A0A` |
| Card | `#FFFFFF` | `#141414` |
| Glass | `rgba(255,255,255,0.72)` | `rgba(20,20,20,0.75)` |
| Border Radius | 16px standard | — |
| Button Height | 48px touch target | — |
| Spacing Grid | 8px base unit | — |

**Typography** — Inter (400 · 500 · 600 · 700)

**Dark mode** — full token-level dark palette, automatic system detection

**Glassmorphism** — BlurView panels on iOS, solid fallback on Android

**Haptics** — selection, impact, and notification feedback on every meaningful interaction

---

## Canvas Engine — Technical Notes

The canvas is built on `PanResponder` + `react-native-svg` with a ref-based architecture that avoids React re-renders during gestures.

**Key decisions:**

- All gesture state lives in `useRef` — zero `setState` calls during drag, resize, or pan
- Only `activeDrag` triggers a re-render (the moving room preview)
- Pinch-to-zoom uses stable midpoint math to prevent canvas jumping
- Pan inertia uses RAF-based exponential decay (`velocity × 0.88` per frame)
- Alignment guides computed on every move frame against all room edges and centers
- Room pop-in: spring animation (tension 220, friction 8) for satisfying snap
- Selection scale micro-animation (0.97 → 1.0) on every new room tap
- Minimap renders all rooms as colored rectangles with a live viewport indicator

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Expo Go on your phone, or iOS Simulator / Android Emulator

### Run locally

```bash
# Clone
git clone https://github.com/Anadi99/Griha.git
cd Griha/artifacts/planaura

# Install
pnpm install

# Start dev server
pnpm run dev
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

### Build for distribution

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Preview build — internal testing
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build — store submission
eas build --profile production --platform all
```

---

## Roadmap

### v1 — Current
- [x] 2D canvas designer with full gesture engine
- [x] Real-time Vastu analysis
- [x] Sunlight simulation
- [x] Ventilation analysis
- [x] AI layout generator (offline)
- [x] Room scan (photo-based)
- [x] Cost estimation (3 tiers)
- [x] BOQ material estimation
- [x] Location intelligence (10 cities)
- [x] Compare mode
- [x] Plans library with persistence
- [x] Export as PNG
- [x] Onboarding flow
- [x] Dark mode
- [x] Toast notification system
- [x] EAS build config

### v2 — Planned
- [ ] User accounts + cloud sync
- [ ] 3D walkthrough mode
- [ ] Marketplace — live contact, quotes, purchases
- [ ] AI room suggestions from Vastu score
- [ ] PDF export with full plan report
- [ ] Multi-floor support
- [ ] Collaboration — share plan with architect
- [ ] More cities in location dataset
- [ ] Push notifications

---

## Target Market

| Segment | Use Case |
|---|---|
| Homeowner (India) | Vastu-compliant design before construction |
| Homeowner (existing home) | Room scan → specific rearrangement advice |
| NRI building in India | Plan remotely without a local consultant |
| Architect / Designer | Quick client-facing sketching with instant Vastu feedback |
| Vastu Consultant | Visual aid during consultations |
| Interior Designer | Energy alignment before furniture placement |
| Global user | Spatial layout optimization for any living space |

---

## Why Griha is Different

| Feature | Griha | Floor plan apps | Vastu apps | Cost calculators |
|---|---|---|---|---|
| 2D Canvas Designer | ✅ | ✅ | ❌ | ❌ |
| Real-time Vastu | ✅ | ❌ | ✅ | ❌ |
| Sunlight Simulation | ✅ | ❌ | ❌ | ❌ |
| Ventilation Analysis | ✅ | ❌ | ❌ | ❌ |
| Layout Generator | ✅ | ❌ | ❌ | ❌ |
| Photo Room Scan | ✅ | ❌ | ❌ | ❌ |
| BOQ Estimation | ✅ | ❌ | ❌ | ❌ |
| Location Intelligence | ✅ | ❌ | ❌ | ❌ |
| Compare Mode | ✅ | ❌ | ❌ | ❌ |
| Fully Offline | ✅ | ⚠️ | ⚠️ | ⚠️ |
| No Account Required | ✅ | ❌ | ❌ | ❌ |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

<br />

Built with precision. Designed with intent.

**Griha** — *गृह · Home, by design.*

<br />

</div>
