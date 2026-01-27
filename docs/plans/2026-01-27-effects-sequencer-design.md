# Effects Sequencer Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the expanded parameter panel with a probabilistic step sequencer for modulating effect parameters, built around "controlled chance."

**Architecture:** Abstract modulation tracks (not tied to specific effects) that can be routed to any parameter via drag-and-drop. Variable track lengths enable polyrhythms. Per-step probability and ratcheting controls.

**Tech Stack:** React, Zustand, Tailwind CSS

---

## Panel Location

Replaces the current expanded parameter panel (right side, 280px wide). Same position and dimensions.

## Layout Structure

```
┌─────────────────────────────┐
│ SEQUENCER     ▶  120  ┊ 1/4│  ← Header: title, play/stop, BPM, resolution
├─────────────────────────────┤
│ Track 1  ●●○●○●●○●○○●●●○●   │  ← Modulation tracks with step grids
│ Track 2  ●○●○●○●○            │     (variable lengths)
│ Track 3  ●●●●○○○○●●●●○○○○   │
│ + Add Track                 │
├─────────────────────────────┤
│ Mode: Forward ▼  │ Fill │   │  ← Global controls
│ Freeze │ Revert │ Random │⟲ │  ← Snapshot + randomize
└─────────────────────────────┘
```

---

## Track Row Design

```
┌──────────────────────────────────────────────────┐
│ ≡ │ T1 │ ●●○●○●●○│●○○●●●○●│  │ 16 │ → │ ○ │
│   │    │  steps  │        │  │len │mode│solo│
└──────────────────────────────────────────────────┘
```

- **≡** Drag handle: reorder tracks OR drag to parameter to create routing
- **T1** Track name (double-click to rename)
- **Steps** Filled = active, empty = inactive
- **16** Track length (4-64, click to change)
- **→** Mode override (click to cycle, "—" = use global)
- **○** Solo toggle

**Step appearance:**
- Inactive: Empty circle or dim square
- Active: Filled with track color
- Probability < 100%: Partially filled or dashed border
- Has ratchet: Small notches indicating repeat count

**Interactions:**
- Click step: Toggle on/off
- Shift+click step: Open detail popup
- Drag across steps: Paint on/off

---

## Step Detail Popup

Shift+click a step to open:

```
┌─────────────────────────────┐
│ Step 5                    × │
├─────────────────────────────┤
│ Gate Length      ━━━━○──── │  0-100%
│ Length Variation ━━○────── │  0-100% probability
│ Variation Range  ━━━━━○─── │  deviation amount
├─────────────────────────────┤
│ Ratchet          ○ 1 2 3 4 6 8 │
│ Ratchet Prob     ━━━━○──── │
│ Velocity Curve   ╱ ╲ ━ ╱╲  │  up/down/flat/triangle
│ Timing Skew      ━━━○───── │  -50 to +50
├─────────────────────────────┤
│ Probability      ━━━━━━━○─ │  chance step fires
├─────────────────────────────┤
│ Copy │ Paste │ Reset        │
└─────────────────────────────┘
```

**Parameters:**
- **Gate Length:** How long step value holds (0-100% of step duration)
- **Length Variation:** Probability gate length varies
- **Variation Range:** How much gate length can deviate
- **Ratchet division:** 1 (none), 2, 3, 4, 6, 8 repeats
- **Ratchet Probability:** Chance ratchet fires
- **Velocity Curve:** Shape of ratchet intensity (ramp up/down/flat/triangle)
- **Timing Skew:** Negative = rushed, Positive = laid back
- **Probability:** Overall chance step triggers

---

## Routing System

**Creating routes:**
1. Grab track's drag handle (≡)
2. Drag toward effect parameter knobs
3. Valid drop targets highlight
4. Drop on knob to create route
5. Depth slider appears to set modulation amount (default 50%)

**Modulation arc on knobs:**
```
      ╭───╮
    ╱  ●──┼── current value
   │ ████ │   colored arc = mod range
   │ ████ │   (track color)
    ╲────╱
```

- Arc starts at current value, extends showing mod range
- Arc length = modulation depth
- Multiple routings = stacked arcs in different colors
- Click arc to adjust depth or delete

**Track routing indicator:**
```
│ T1 ●●● │  ← dots show number of routings
```

**Removing routes:**
- Click arc, press Delete
- Or right-click arc → "Remove"

---

## Global Controls

```
┌─────────────────────────────────────────────┐
│ Mode: Forward ▼  │  Fill  │  Random  │  ⟲  │
├─────────────────────────────────────────────┤
│     Freeze      │      Revert               │
└─────────────────────────────────────────────┘
```

**Mode dropdown:** Forward, Backward, Pendulum, Random
- Global default; tracks can override

**Fill button:**
- Click to enter fill mode (highlighted)
- Click track to fill all steps
- Click again to clear all steps
- Click Fill to exit mode

**Random button:**
- Click: Randomize all track steps
- Shift+click: Randomize selected track only

**Undo (⟲):** Single-level undo for last randomize

**Freeze / Revert:**
- Freeze: Capture entire sequencer state
- Revert: Restore to frozen state
- Freeze button shows dot when snapshot exists

---

## Playback & Transport

**Header:**
```
│ SEQUENCER     ▶  120  ┊  1/4  │
                │   │       │
                │   │       └─ Resolution (1/4, 1/8, 1/16, 1/32)
                │   └─ BPM (click to edit)
                └─ Play/Stop
```

**Behavior:**
- Independent play/stop control
- Current step highlighted on all tracks
- Each track cycles its own length (polyrhythm)
- When stopped, outputs step 1 value

**Gate Mode (global setting):**
- Trigger: Returns to 0 between steps
- Hold: Maintains previous value

**Recording sync:**
- Option to sync with transport bar record button

---

## Data Model

```typescript
interface SequencerStore {
  // Transport
  isPlaying: boolean
  bpm: number
  stepResolution: '1/4' | '1/8' | '1/16' | '1/32'
  gateMode: 'trigger' | 'hold'

  // Global settings
  globalMode: 'forward' | 'backward' | 'pendulum' | 'random'
  fillModeActive: boolean

  // Tracks
  tracks: Track[]

  // Snapshot
  frozenState: SequencerState | null

  // Routings
  routings: Routing[]
}

interface Track {
  id: string
  name: string
  color: string
  length: number  // 4-64
  modeOverride: StepMode | null
  steps: Step[]
  solo: boolean
}

interface Step {
  active: boolean
  probability: number
  gateLength: number
  gateLengthVariation: number
  variationRange: number
  ratchetDivision: 1 | 2 | 3 | 4 | 6 | 8
  ratchetProbability: number
  velocityCurve: 'up' | 'down' | 'flat' | 'triangle'
  timingSkew: number
}

interface Routing {
  trackId: string
  targetParam: string  // e.g., 'rgb_split.amount'
  depth: number  // -1 to 1
}
```

---

## Implementation Tasks

### Task 1: Create Sequencer Store
- Create `src/stores/sequencerStore.ts`
- Implement all state and actions from data model
- Include transport controls, track CRUD, step editing

### Task 2: Create Sequencer Panel Shell
- Create `src/components/sequencer/SequencerPanel.tsx`
- Replace ExpandedParameterPanel in layout
- Header with transport controls (play, BPM, resolution)

### Task 3: Implement Track Component
- Create `src/components/sequencer/Track.tsx`
- Track row with drag handle, name, step grid, length, mode, solo
- Step click to toggle, shift+click for popup

### Task 4: Implement Step Grid
- Create `src/components/sequencer/StepGrid.tsx`
- Visual steps with color, probability indicator, ratchet indicator
- Drag-to-paint interaction

### Task 5: Implement Step Detail Popup
- Create `src/components/sequencer/StepDetailPopup.tsx`
- All step parameters with sliders and selectors
- Copy/Paste/Reset functionality

### Task 6: Implement Routing System
- Add drag-from-track detection
- Add drop-target highlighting on parameter knobs
- Create routing with depth control

### Task 7: Implement Modulation Arcs
- Modify parameter knobs to show colored arcs
- Arc click to select, adjust, delete routing

### Task 8: Implement Global Controls
- Mode dropdown with per-track override
- Fill mode toggle and track fill behavior
- Random button with shift modifier

### Task 9: Implement Freeze/Revert
- Snapshot capture on Freeze
- State restoration on Revert
- Visual indicator when snapshot exists

### Task 10: Implement Playback Engine
- Step sequencer clock tied to BPM
- Polyrhythmic track cycling
- Gate mode (trigger/hold) output
- Modulation value calculation with probability/ratcheting
