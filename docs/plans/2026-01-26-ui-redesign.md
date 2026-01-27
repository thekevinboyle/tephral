# UI Redesign: Three-Column Layout with Multi-Chain Support

## Overview

Restructure the UI into a three-column layout with video preview centered, preset banks on the left, and parameter sliders on the right. Add support for 4 parallel effect chains (A/B/C/D) that can be switched instantly during performance.

## Layout Structure

The UI is organized into horizontal bands from top to bottom:

### 1. Top Bar
- **Left:** cam button, load file button
- Source selection controls, minimal footprint

### 2. Main Content Area (Three Columns)

**Left Column - Preset Banks:**
- Grid of preset slots (2 columns × 6 rows = 12 slots)
- Each slot stores complete chain state: enabled effects + all parameter values
- Click slot to recall state into active chain
- Dedicated "Save" button to save current state to a slot
- Presets are global (not per-chain) - enables copying states between chains
- Empty slots: outlined boxes. Filled slots: visual indicator (filled/labeled)

**Center - Video Preview:**
- Largest area, dominates top half of screen
- Full canvas output with all effects applied

**Right Column - Parameter Panel:**
- Header: effect name + enable toggle
- Full parameter sliders for selected effect (replaces knob-based approach)
- Always shows selected effect's parameters
- Scrollable if parameters exceed visible area
- Complex effects (blob_detect) show all grouped controls here

### 3. Signal Path Bar
- **Left:** "signal path" label
- **Center:** Record button (pill-shaped)
- **Right:** Timecode display (00:00:00)

### 4. Effect Cards Row
- Horizontal row of cards showing active effects in processing order
- Cards are draggable to reorder
- Click card to select (updates parameter panel + graphics panel)
- Shows effects for currently active chain (A/B/C/D)

### 5. Chain Controls Row
- **Left:** A, B, C, D buttons - switch between 4 independent effect chains
- **Right:** Random button, Step Back button
- Active chain visually highlighted
- Switching chains updates: signal path cards, effect grid state, parameter panel

### 6. Bottom Section (Three Areas)

**Left - Effect Grid:**
- All available effects in grid layout
- Visual state reflects active chain (enabled effects highlighted)
- Click: toggles effect on/off AND selects it
- Grid dimensions flexible based on effect count

**Center - Graphics Panel:**
- Animated visualization of selected effect
- No parameter controls (those moved to right column)
- Same visualizations as current: waveforms, patterns, effect-specific animations

**Right - Performance Controls:**
- **Top:** X/Y Pad - 2D control surface for parameter mapping
- **Bottom:** Crossfader - dry/wet mix for active chain

## Key Behaviors

### Multi-Chain System (A/B/C/D)
- 4 independent effect chains, each with own enabled effects and parameters
- Instant switching between chains during performance
- Effect grid shows which effects are enabled on active chain
- Build different looks on each chain, switch live

### Preset System
- Save: Dedicated button → pick slot → saves active chain state
- Recall: Click slot → loads state into active chain
- Cross-chain copying: Save on A, switch to B, recall → B now has A's state

### Selection Model
- Clicking effect in grid: toggles it AND selects it
- Clicking effect card in signal path: selects it
- Selected effect shown in: parameter panel (sliders) + graphics panel (visualization)

### Random/Step Back
- Random: Randomizes effects and parameters on active chain
- Step Back: Reverts to state before randomize

## Component Changes

### New Components
- `ChainSelector` - A/B/C/D buttons with active state
- `PresetBankPanel` - Grid of preset slots with save/recall
- `ParameterSliderPanel` - Full slider-based parameter editor

### Modified Components
- `PerformanceLayout` - Complete restructure to three-column
- `PerformanceGrid` - Add chain-aware enabled state display
- `GraphicPanel` - Remove knobs, visualization only
- `SignalPathBar` - Add record button and timecode

### State Changes
- Add `chainStore` - Manages 4 effect chains, active chain selection
- Add `presetStore` - Manages preset slots, save/recall
- Modify effect stores - Support per-chain state

## Migration Notes

- Current single effect chain becomes chain A
- Existing preset/snapshot functionality migrates to new preset bank
- GraphicPanelV2 splits into: ParameterSliderPanel + GraphicsPanel (viz only)
- XYPad and MixControls stay largely the same, just repositioned
