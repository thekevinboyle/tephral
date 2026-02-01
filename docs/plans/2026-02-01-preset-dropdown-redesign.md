# Preset Dropdown Redesign

**Goal:** Convert the 280px preset sidebar into a compact dropdown menu, freeing up screen space.

---

## Layout Change

**Before:** 280px sidebar with full PresetLibraryPanel taking entire height.

**After:**
- Thin ~40px horizontal bar at top of left sidebar area
- Contains a "Presets" button that opens a dropdown
- Remaining sidebar space is empty/minimal

---

## Dropdown Trigger Bar

- Height: 40px
- Contains "Presets" button (left-aligned)
- Clicking opens dropdown below

---

## Dropdown Specifications

**Dimensions:**
- Width: 300px
- Max height: 400px (scrollable content area)
- Position: Below trigger button, left-aligned

**Close behavior:**
- Click outside dropdown
- Press Escape key (unless rename modal is open)
- Click on a preset (after loading)

---

## Dropdown Content (top to bottom)

1. **Header row**
   - "Presets" title (left)
   - Save button with icon (right) - saves current state as new preset

2. **Search bar**
   - Text input with search icon
   - Clear button when text present
   - Filters presets as you type

3. **Preset list area** (scrollable)
   - Folder tree view (default)
   - Flat filtered list (when searching)
   - Preset rows: 32px thumbnail, name
   - Right-click for context menu
   - Click to load preset and close dropdown

4. **Footer row**
   - Import button
   - Export All button

5. **InfoPanel**
   - System info at bottom of dropdown

---

## Component Architecture

**Files to modify:**

| File | Action |
|------|--------|
| `PerformanceLayout.tsx` | Replace 280px sidebar with PresetDropdownBar |
| `PresetLibraryPanel.tsx` | Refactor into PresetDropdownBar + PresetDropdown |

**Component structure:**

```
PresetDropdownBar (40px bar in layout)
├── "Presets" button (trigger)
└── PresetDropdown (portal, positioned below trigger)
    ├── Header (title + save button)
    ├── Search input
    ├── Scrollable content area
    │   └── PresetFolderTree (reused)
    ├── Footer (Import/Export)
    └── InfoPanel (reused)
```

**Reused components (no changes):**
- `PresetFolderTree`
- `PresetContextMenu` / `FolderContextMenu`
- `InfoPanel`
- Rename modal

**Positioning:** Dropdown renders via portal, positioned using `getBoundingClientRect()` of trigger button.

---

## Interaction Details

- Dropdown stays open during:
  - Searching
  - Context menu interactions
  - Rename modal open

- Dropdown closes after:
  - Loading a preset
  - Clicking outside
  - Pressing Escape (when no modal open)
