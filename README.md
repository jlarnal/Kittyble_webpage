# Kittyble Web UI

**Functional Specification Document**

A single-page application (SPA) for managing the Kittyble automated pet kibble dispenser, designed to run on ESP32 hardware with SPIFFS filesystem.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Application Architecture](#4-application-architecture)
5. [Data Structures](#5-data-structures)
6. [API Endpoints](#6-api-endpoints)
7. [Pages & Features](#7-pages--features)
8. [Components](#8-components)
9. [Modals](#9-modals)
10. [State Management](#10-state-management)
11. [Styling & Theme](#11-styling--theme)
12. [Build & Deployment](#12-build--deployment)
13. [Glossary](#13-glossary)

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| **Project Name** | Kittyble Web UI |
| **Version** | 1.0.0 |
| **Type** | Single Page Application (SPA) |
| **Target Platform** | ESP32 with SPIFFS/LittleFS |
| **Purpose** | Web interface for automated pet kibble dispenser management |

### Key Capabilities

- Real-time tank level monitoring with visual fill indicators
- Multi-tank refill workflows (add or set mode, grams or liters)
- Recipe creation with multi-ingredient percentage blending
- WiFi network scanning and configuration
- Servo motor PWM calibration
- Firmware OTA updates
- Time synchronization with timezone detection

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Preact | ^10.19.3 |
| **Routing** | preact-router | ^4.1.2 |
| **Styling** | Tailwind CSS | ^3.4.0 |
| **Build Tool** | Vite | ^5.0.8 |
| **Minifier** | Terser | ^5.26.0 |
| **CSS Processing** | PostCSS + Autoprefixer | ^10.4.16 |

### Why Preact?

Preact is a ~3KB alternative to React, making it ideal for embedded systems with limited storage. The SPIFFS filesystem on ESP32 benefits significantly from the reduced bundle size.

---

## 3. Project Structure

```
Kittyble_webpage/
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Root component with routing
│   ├── index.css                # Global Tailwind styles
│   ├── components/
│   │   ├── Header.jsx           # Top header (battery, status, errors)
│   │   └── Navigation.jsx       # Bottom navigation bar
│   ├── hooks/
│   │   └── useApi.jsx           # API context provider & methods
│   └── pages/
│       ├── Dashboard.jsx        # Home page with tank overview
│       ├── Tanks.jsx            # Tank management & refill
│       ├── Recipes.jsx          # Recipe editor
│       ├── Settings.jsx         # WiFi, scale, firmware
│       └── Calibration.jsx      # Servo PWM calibration
├── public/
│   └── kitty-icon.svg           # Application logo
├── index.html                   # HTML entry point
├── vite.config.js               # Vite + ESP32 build config
├── tailwind.config.js           # Theme customization
├── postcss.config.js            # PostCSS configuration
└── package.json                 # Dependencies & scripts
```

---

## 4. Application Architecture

### Routing Structure

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Home page with tank overview and quick actions |
| `/tanks` | Tanks | Tank management, editing, and refill |
| `/recipes` | Recipes | Recipe creation and editing |
| `/settings` | Settings | WiFi, scale, firmware, reboot |
| `/settings/calibration` | Calibration | Servo PWM tuning |

### Component Hierarchy

```
App.jsx
├── ApiProvider (Context)
├── Header.jsx
├── Router
│   ├── Dashboard.jsx
│   ├── Tanks.jsx
│   ├── Recipes.jsx
│   ├── Settings.jsx
│   └── Calibration.jsx
└── Navigation.jsx
```

### Layout

- **Header**: Sticky top bar with logo, system state, battery, and error indicators
- **Main Content**: Scrollable area with bottom padding for navigation
- **Navigation**: Fixed bottom bar with 4 main routes

---

## 5. Data Structures

### 5.1 System Status

```typescript
interface Status {
  battery: number        // 0-100 percentage
  state: string          // "IDLE" | "FEEDING" | "DISPENSING" | "ERROR" | "CONNECTING"
  error: string          // "ERR_NONE" | "ERR_SCALE" | etc.
  last_feed_time: string // "HH:MM" format
  last_recipe: string    // Recipe name or "None"
}
```

### 5.2 Tank

```typescript
interface Tank {
  uid: number            // Unique identifier (converted to hex for display/API)
  busIndex: number       // Physical slot number (0-indexed)
  name: string           // Display name (max 43 characters)
  density: number        // Kibble density in kg/L
  capacity: number       // Tank volume in Liters
  remainingWeight: number // Current contents in grams
}
```

**Configuration Status**: A tank is considered "configured" when `density > 0 AND capacity > 0`.

**Weight Calculations**:
```javascript
maxCapacityGrams = capacity * density * 1000
fillPercentage = (remainingWeight / maxCapacityGrams) * 100
```

### 5.3 Recipe

```typescript
interface Recipe {
  id: number             // Auto-increment identifier
  name: string           // Recipe display name
  is_enabled: boolean    // Whether recipe is active
  daily_weight: number   // Total grams dispensed per day
  servings: number       // Number of meals per day
  ingredients: Ingredient[]
}

interface Ingredient {
  tank_uid: number       // Reference to tank UID
  percentage: number     // 0-100, all ingredients must sum to 100%
}
```

### 5.4 Scale

```typescript
interface Scale {
  weight_g: number       // Current weight reading in grams
}
```

---

## 6. API Endpoints

All endpoints are prefixed with `/api`.

### 6.1 System

| Endpoint | Method | Description | Payload |
|----------|--------|-------------|---------|
| `/status` | GET | Get system status | - |
| `/system/time` | POST | Sync device time | `{epoch: number, tz?: string}` |
| `/system/reboot` | POST | Reboot device | - |
| `/system/update` | POST | Firmware update | `multipart/form-data` |

### 6.2 Tanks

| Endpoint | Method | Description | Payload |
|----------|--------|-------------|---------|
| `/tanks` | GET | List all tanks | - |
| `/tanks/{hexUid}` | PUT | Update tank | `{name?, density?, capacity?, remainingWeight?}` |
| `/tanks/{hexUid}/calibration` | POST | Set servo PWM | `{servo_idle_pwm: number}` |

### 6.3 Feeding

| Endpoint | Method | Description | Payload |
|----------|--------|-------------|---------|
| `/feed/immediate/{hexUid}` | POST | Dispense from tank | `{amount_grams: number}` |
| `/feeding/stop` | POST | Stop active feeding | - |

### 6.4 Recipes

| Endpoint | Method | Description | Payload |
|----------|--------|-------------|---------|
| `/recipes` | GET | List all recipes | - |
| `/recipes` | POST | Create/update recipe | Recipe object |
| `/recipes/{id}` | DELETE | Delete recipe | - |

### 6.5 Scale

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scale` | GET | Get current weight |
| `/scale/tare` | POST | Zero the scale |

### 6.6 WiFi

| Endpoint | Method | Description | Payload |
|----------|--------|-------------|---------|
| `/wifi/scan` | GET | Scan networks | - |
| `/wifi/connect` | POST | Connect to network | `{ssid: string, password: string}` |

---

## 7. Pages & Features

### 7.1 Dashboard (`/`)

The landing page providing system overview and quick actions.

**Sections**:

1. **Hero**: Logo with greeting and system state indicator
2. **Status Card**: Last feed time and active recipe
3. **Quick Actions**:
   - "Feed Now" - Dispenses 20g from first tank
   - "STOP" - Emergency stop (visible only during feeding)
4. **Tank Grid**: 2-column grid showing all tanks with:
   - Slot number badge
   - Tank name (or "Unnamed Tank")
   - Hex UID
   - Weight display (or "Not configured" badge)
   - Fill percentage bar (green/amber/red)

**Setup Prompt Modal**: Automatically appears for unconfigured tanks with options:
- "Configure Now" - Navigate to Tank Manager and auto-start edit mode on the unconfigured tank
- "Don't remind me" - Permanently dismiss (localStorage)
- "Later" - Session dismiss (sessionStorage)

### 7.2 Tank Manager (`/tanks`)

Comprehensive tank configuration and refill interface.

**Tank Card (View Mode)**:
- Slot badge + "Not configured" badge (if applicable)
- Tank name and hex UID
- Density (kg/L) and Capacity (L) stats
- "Edit" and "Refill" buttons

**Tank Card (Edit Mode)**:
- Animated glimmering cyan border to highlight active editing
- Name input (max 43 chars, cannot be empty)
- UID display (read-only)
- Density input (kg/L)
- Capacity input (L)
- Validation error display
- Save/Cancel buttons

**Auto-Edit from Dashboard**: When clicking "Configure Now" on the setup prompt, the tank UID is stored in sessionStorage and the Tank Manager automatically enters edit mode for that tank.

**Refill Feature**:
- Mode toggle: "Add to tank" vs "Set value"
- Unit toggle: Grams (g) vs Liters (L)
- "Fill to max" button (orange)
- Preset buttons:
  - Grams: 400g, 800g, 1kg, 1.5kg, 2kg, 3kg, 4kg, 7kg
  - Liters: 0.5L, 1L, 1.5L, 2L, 3L, 4L, 5L, 8L
- Custom amount input
- Confirmation modal with overflow warning

### 7.3 Recipe Studio (`/recipes`)

Recipe creation and management interface.

**List View**:
- Recipe cards with enabled indicator (green/gray dot)
- Recipe name, daily weight, and servings count
- Edit and Delete buttons
- "New" button in header

**Editor View**:
- Recipe name input
- Grams per day input
- Servings input
- Ingredient mixer:
  - Tank selector dropdown
  - Percentage input
  - Add/remove ingredient buttons
  - Max 6 ingredients
  - Must sum to 100% (±0.1% tolerance)

### 7.4 Settings (`/settings`)

System configuration and maintenance.

**Sections**:

1. **Scale**: Live weight display with "Tare" button
2. **WiFi**: Network scan, list with signal strength, connect with password
3. **Servo Calibration**: Link to calibration page
4. **Firmware Update**: File input for `.bin` uploads
5. **Restart Device**: Red danger button for reboot

### 7.5 Calibration (`/settings/calibration`)

Servo motor PWM tuning for each tank.

**Features**:
- Warning banner about PWM ranges (500-2500µs)
- Per-tank calibration cards:
  - Tank name and slot
  - Range slider (500-2500µs)
  - Number input field
  - "Test & Set Idle" button
- Default PWM: 1500µs

---

## 8. Components

### 8.1 Header (`components/Header.jsx`)

Sticky top navigation bar.

**Left Section**:
- Kittyble logo
- Application title
- System state badge (color-coded)

**Right Section**:
- Error indicator (red pulsing badge if error present)
- Battery display:
  - Percentage text
  - Visual battery bar
  - Color: green (>50%), amber (>20%), red (≤20%)

### 8.2 Navigation (`components/Navigation.jsx`)

Fixed bottom tab bar.

**Tabs**:
| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Home | `/` |
| 🥫 | Tanks | `/tanks` |
| 📜 | Recipes | `/recipes` |
| ⚙️ | Settings | `/settings` |

Active tab indicated with cyan underline and text color.

---

## 9. Modals

### 9.1 Setup Prompt Modal (Dashboard)

Triggered automatically for unconfigured tanks.

**Content**:
- Tank slot, name, and UID display
- Explanation text
- Three action buttons

**Dismissal Storage**:
- `localStorage`: `kittyble_dismissed_tank_setup` (permanent)
- `sessionStorage`: `kittyble_session_dismissed_tanks` (tab session)

### 9.2 Refill Modal (Tanks)

Two-step refill workflow.

**Step 1 - Amount Selection**:
- Mode toggle (Add/Set)
- Unit toggle (g/L)
- Fill to max button
- Preset grid
- Custom input option

**Step 2 - Confirmation**:
- Tank name and current weight
- Amount being added/set
- New total calculation
- Overflow warning with capping notice

---

## 10. State Management

### 10.1 Global State (useApi Context)

**Location**: `src/hooks/useApi.jsx`

**State Shape**:
```javascript
{
  data: {
    status: {...},
    tanks: [...],
    recipes: [...],
    scale: {...}
  },
  loading: boolean,
  error: string | null
}
```

**Available Methods**:

| Method | Description |
|--------|-------------|
| `apiCall(endpoint, options)` | Generic HTTP caller |
| `refreshStatus()` | Fetch system status |
| `refreshTanks()` | Fetch all tanks |
| `refreshRecipes()` | Fetch all recipes |
| `refreshScale()` | Fetch scale reading |
| `feedImmediate(uid, grams)` | Dispense from tank |
| `stopFeed()` | Stop feeding |
| `updateTank(uid, data)` | Update tank config |
| `calibrateTank(uid, pwm)` | Set servo PWM |
| `updateRecipe(recipe)` | Create/update recipe |
| `deleteRecipe(id)` | Delete recipe |
| `tareScale()` | Zero scale |
| `scanWifi()` | Scan networks |
| `connectWifi(ssid, pass)` | Connect to network |
| `reboot()` | Reboot device |
| `toHexUid(uid)` | Convert UID to hex string |

### 10.2 Initialization Flow

1. Attempt extended time sync with POSIX timezone
2. Fallback to simple epoch sync if unsupported
3. Load status, tanks, and recipes in parallel
4. Continue even if time sync fails

### 10.3 Local Storage Keys

| Key | Purpose |
|-----|---------|
| `kittyble_dismissed_tank_setup` | Permanently dismissed tank setup prompts |
| `kittyble_session_dismissed_tanks` | Session-scoped dismissed prompts |

---

## 11. Styling & Theme

### 11.1 Color Palette

**Dark Theme** (always active):

| Token | Hex | Usage |
|-------|-----|-------|
| `dark-bg` | `#0f0f0f` | Main background |
| `dark-surface` | `#1a1a1a` | Secondary surfaces |
| `dark-card` | `#262626` | Card backgrounds |
| `accent-primary` | `#22d3ee` | Primary actions (cyan) |
| `accent-secondary` | `#a78bfa` | Secondary elements (purple) |
| `accent-tertiary` | `#fb7185` | Tertiary elements (pink) |
| `success` | `#10b981` | Success states (green) |
| `warning` | `#f59e0b` | Warning states (amber) |
| `error` | `#ef4444` | Error states (red) |

**Tank Level Colors**:
| Level | Color | Threshold |
|-------|-------|-----------|
| Full | Green `#10b981` | ≥40% |
| Medium | Amber `#f59e0b` | 15-40% |
| Low | Red `#ef4444` | <15% |

### 11.2 CSS Utility Classes

| Class | Purpose |
|-------|---------|
| `.btn` | Base button styles |
| `.btn-primary` | Cyan primary button |
| `.btn-secondary` | Dark bordered button |
| `.btn-danger` | Red danger button |
| `.card` | Dark card container |
| `.input` | Form input styling |
| `.heading-section` | Section heading |

### 11.3 Responsive Design

- Mobile-first approach
- 4px base spacing unit
- Full-width cards with padding
- 2-column grids for tanks and actions
- Touch-optimized button sizes (min 44px)

---

## 12. Build & Deployment

### 12.1 Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:3000
```

**Dev Server Features**:
- Hot module replacement (HMR)
- API proxy to `http://192.168.1.61` (ESP32 device)

### 12.2 Production Build

```bash
npm run build        # Build to /data directory
```

**Build Process**:
1. Clear Vite cache
2. Bundle and minify with Vite/Terser
3. Gzip text assets (.js, .css, .html, .svg)
4. Flatten directory structure
5. Copy to `../KibbleT5/data` for firmware integration

**Output Optimizations**:
- Relative base path (`./`) for SPIFFS compatibility
- No asset subdirectories (flat structure)
- Gzipped files for ESP32 automatic decompression

### 12.3 ESP32 Integration

- Files served from SPIFFS filesystem
- ESP32 HTTP server auto-decompresses `.gz` files
- Minimal storage footprint (~100KB total)

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **UID** | Unique Identifier for a tank (numeric, displayed as hex) |
| **Hex UID** | 16-character uppercase hexadecimal tank identifier |
| **Density** | Kibble weight per volume (kg/L) |
| **Capacity** | Tank volume in Liters |
| **PWM** | Pulse Width Modulation for servo control (500-2500µs) |
| **SPIFFS** | SPI Flash File System on ESP32 |
| **Tare** | Zero/reset the scale |
| **Recipe** | Predefined feeding configuration with tank mix |
| **Ingredient** | Tank + percentage pair in a recipe |
| **Serving** | Single meal portion from daily weight |

---

## License

Proprietary - All rights reserved.

---

*Generated: January 2026*
