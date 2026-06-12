# BRAZUG Armory — Documentation

This document provides a comprehensive overview of the Armory module, covering its functional design, technical architecture, and integration patterns.

---

## 1. Overview

The Armory module is a specialized component focused on **Mechanics, Stats, and Min-Maxing** for Classic WoW characters within the BRAZUG ecosystem.

---

## 2. Functional Architecture (The 3 Tabs)

The Armory interface is divided into three main areas, providing users with insights into their current character state, future simulations, and build planning.

### A. Aba Geral (Current State)

Designed to answer: _"How is my character right now?"_

- Displays synced Blizzard data + BRAZUG-specific additions.
- Includes Profile (Race, Class, Level, Status), Paper Doll equipment, Attributes, Talents, Professions, BRAZUG-specific Achievements, and Activity History.

### B. Aba Min-Max (Simulation)

Designed to answer: _"How will my character change with different gear?"_

- Allows searching the master item database and virtually equipping/swapping gear.
- Features: Automatic stat recalculation, Set management (saving loadouts), Wishlist, and Best-in-Slot (BIS) lists.

### C. Aba Planner de Talentos (Build Planner)

Designed to answer: _"How will my build look before I spend gold on respec?"_

- Simulation-based talent distribution (like WoWhead).
- Enforces official Classic WoW rules (dependencies, rank limits, 51-point cap).
- Features: Real-time point visualization, build sharing (links), and build saving.

---

## 3. Technical Architecture (MVC)

### Model (`js/models/ArmoryModel.js`)

- **Responsibility**: Data fetching and API communication.
- **Key Methods**: `fetchFullCharacter`, `searchItems`, `getItemDetails`, `triggerSync`.

### View (`js/views/ArmoryView.js`)

- **Responsibility**: UI rendering and DOM manipulation.
- **Key Components**: `renderHeader`, `renderGear` (Paper Doll), `renderStats`, `renderTalents`, `renderProfessions`, `renderPlannerGrid`, `renderTooltip`.

#### Talent Rendering & Layout

- `renderTalents()` flattens all `specialization_groups` to render every available talent tree.
- If talent data includes `talent.row` and `talent.column`, the system renders a Classic 4x7 talent grid.
- If coordinates are missing, the view falls back to a readable talent list, preserving icon, tooltip, description, and rank display.
- Each talent now shows explicit `rank/maxRank` values (for example `2/5`, `1/1`) to match the Wowhead-style UI.
- Visual states are handled with CSS classes: `rank-zero`, `rank-partial`, and `rank-max`.

### Controller (`js/controllers/ArmoryController.js`)

- **Responsibility**: State management and interaction orchestration.
- **Key State**: `_currentCharData`, `_plannerItems`, `_tpState`.
- **Key Features**: Tab switching, stat simulation, talent logic, local "Sets" system.

---

## 4. API Endpoints

| Endpoint                        | Method | Description                               |
| :------------------------------ | :----- | :---------------------------------------- |
| `/api/armory/full/:realm/:name` | `GET`  | Full character data (Blizzard + Profile). |
| `/api/armory/items?q=...`       | `GET`  | Item search (Local master table).         |
| `/api/armory/items/:id`         | `GET`  | Specific item details and tooltip data.   |
| `/api/character/sync`           | `POST` | Force Blizzard sync (Requires Admin JWT). |

---

## 5. Styling & Branding

- **Global Background**: Unified BRAZUG background (Gradients + SVG Grid).
- **Class Specifics**: CSS variables (`--color-warrior`, etc.) allow panels/trees to inherit class colors.
- **Component Proportions**:
  - Paper Doll slots: `46px`.
  - Model frame: `240px x 380px`.
  - Grid gutters: `30px` (cinematic) and `12px` (technical).

---

## 6. Data Reliability & Fallbacks

To ensure a consistent user experience even when external APIs (Blizzard/Armory Module) are unstable, the system implements several layers of data safety.

### Item Enrichment Logic

The backend (`lib/character-routes.cjs`) uses the `wow-classic-items` library as a primary fallback.

- **Trigger**: When an item is fetched via `/api/armory/items/:id` and contains incomplete data (e.g., Name is "Unknown" or `tooltip_data` is null).
- **Action**: The system automatically queries the local library, extracts names, icons, and stats, and **enriches** the database record in real-time.
- **Standard**: Every item must have a valid `icon` (slug format, e.g., `inv_helmet_01`) and a structured `tooltip_data` JSON containing `level`, `stats`, and `spells`.

### Local Icon Proxy

Icons are served through a local proxy to ensure 100% availability.

- **Endpoint**: `/assets/icons/:filename`
- **Mechanism**: If an icon is requested and not found in the local `assets/icons/` folder, the server automatically downloads it from the Blizzard CDN, saves it locally, and serves it. This creates a permanent local cache.

---

## 7. How to Extend

1. **Adding a New Stat**: Update `ArmoryView.renderStats` and ensure the API provides the new data in `extra_data.statistics`.
2. **Changing a Class Color**: Update the `:root` variables in `css/armory.css`.
3. **Modifying the Layout**: Adjust the 3-column grid structure in `ArmoryView.renderGear`.
4. **Refreshing Item Data**: If item data remains incorrect, use the `scripts/fix-items.js` maintenance script to force a library-wide re-sync of the local database.

---

_Created by Gemini CLI for BRAZUG — June 2026_
