# Dark Theme Design

Convert the app from light theme to dark brutalist theme matching the marketing site.

## Design Tokens

Create `src/styles/theme.css` with CSS variables:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;
  --bg-surface: #141414;
  --bg-elevated: #1a1a1a;

  /* Borders */
  --border: #2a2a2a;
  --border-light: #333333;

  /* Text */
  --text-primary: #f5f5f5;
  --text-muted: #666666;

  /* Accent */
  --accent: #ff6b35;
  --accent-glow: rgba(255, 107, 53, 0.4);
  --accent-subtle: rgba(255, 107, 53, 0.1);

  /* Typography */
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
}
```

## Color Mapping

| Old Value | New Token | Usage |
|-----------|-----------|-------|
| `#e5e5e5` | `--bg-primary` | Main app background |
| `#ffffff` | `--bg-surface` | Panels, cards |
| `#f5f5f5` | `--bg-surface` | Panel backgrounds |
| `#d0d0d0` | `--border` | All borders |
| `#333333` | `--text-primary` | Main text |
| `#999999` | `--text-muted` | Secondary text |
| `#666666` | `--text-muted` | Labels |

## Component Areas

### Main Layout
- Outer background: `--bg-primary`
- Panel containers: `--bg-surface`
- All borders: `--border`

### Left Sidebar (Presets + Inspector)
- Background: `--bg-surface`
- Section headers: `--text-muted`
- Search input: `--bg-primary` background, `--border` border

### Right Panel (Expanded Parameters)
- Background: `--bg-surface`
- Slider tracks: `--border`
- Slider fills: keep effect colors

### Bottom Section (Grid, Sequencer, XY Pad)
- Card backgrounds: `--bg-surface`
- Grid cells: `--bg-elevated` hover state
- Sequencer steps: darker inactive, brighter active

### Controls
- Primary buttons: `--accent` with glow on hover
- Secondary buttons: transparent with `--border` border
- Inputs: `--bg-primary` background, `--border` border

## Special Considerations

**Keep as-is:**
- Canvas area (already dark)
- Effect button colors (distinct hues pop on dark)
- Routing indicators (colored dots)

**Enhance for dark theme:**
- Active/selected states: add `--accent-glow` box-shadow
- Hover states: slight brightness lift
- Focus rings: `--accent` outline

**Typography:**
- Section headers: uppercase, `letter-spacing: 0.05em`
- Labels: `--text-muted`
- Values/content: `--text-primary`

## Files to Modify

1. `src/styles/theme.css` (new)
2. `src/main.tsx` (import theme)
3. `index.html` (JetBrains Mono font)
4. `PerformanceLayout.tsx`
5. `PresetLibraryPanel.tsx`
6. `InfoPanel.tsx`
7. `ExpandedParameterPanel.tsx`
8. `SequencerPanel.tsx`
9. `Track.tsx`
10. `StepGrid.tsx`
11. `PerformanceGrid.tsx`
12. `EffectButton.tsx`
13. `TransportBar.tsx`
14. `BankPanel.tsx`
15. `XYPad.tsx`
16. `MixControls.tsx`
17. `SliderRow.tsx`
18. `ToggleRow.tsx`
19. `SelectRow.tsx`
20. Various modals

## Implementation

1. Create `src/styles/theme.css` with design tokens
2. Import in `main.tsx` before other styles
3. Add JetBrains Mono font to `index.html`
4. Update components to use CSS variables instead of hardcoded hex values
5. Test all UI states (hover, active, disabled)
