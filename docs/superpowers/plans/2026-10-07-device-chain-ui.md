# Device-Chain UI (Bitwig-inspired): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise and restyle SEG_F4ULT as follows:
- neutral chrome, with colour that carries meaning;
- an effects browser on the left;
- a contextual inspector on the right;
- device cards along the bottom;
- panels toggled from the footer;
- one transport.

Features stay the same.

**Architecture:**
- **Tokens:** values are redefined in `theme.css`, so every existing component picks up the new palette and type at once.
- **Shell:** `layout.css` gains new grid areas.
- **New components:**
  - `EffectBrowserList`, `DeviceChain`, `DeviceCard`, `ModulatorsCard` and `Inspector`;
  - built on the existing stores and on the `useParamControl`, `ParamBar` and `Knob` components from the param-bars work.
- **Retired:** `ChainPanel`'s rows and `CanvasTransportBar`'s separate bar.

**Tech Stack:** React 19, TypeScript, zustand 5, Vite 7, Tailwind. There is no unit-test runner; verification uses the puppeteer harnesses in the gitignored `.superpowers/sdd/`.

**Spec:** `docs/superpowers/specs/2026-10-07-device-chain-ui-design.md`
**Mockup:** `docs/superpowers/specs/assets/2026-10-07-device-chain-ui/mockup.html?d=A` and `A-1440.png`.

## Global Constraints

**Tokens and theme files**
- Tokens live only in `src/styles/theme.css`. Never edit `src/index.css`.
- Neutrals:

  | Role | Value |
  |---|---|
  | gutter | `#0e0f10` |
  | window | `#18191b` |
  | panel | `#222326` |
  | raised | `#2c2d31` |
  | control | `#37383d` |
  | hover | `#45464c` |
  | line | `#3a3b40` |

- Text: primary `#ececee`, secondary `#b4b6bc`, muted `#8d9097`.
- Meaning colours:

  | Role | Value |
  |---|---|
  | `--mod` | `#4fb3ff` |
  | `--rec` | `#ff5a4e` |
  | `--live` | `#b8f35a` |
  | selection | `#f2f2f4` |

  Effect colours are unchanged. Bitwig's orange, logo, names and icons must not be used.

**Shape and type**
- Panels are separated by 2px gutters.
- Radius is 6px for panels and cards, 4px for controls. No shadows.
- Fonts are IBM Plex Sans (400/500/600) for UI and IBM Plex Mono for values. Load both from Google Fonts in `index.html`.
- Normal case everywhere: `.hud-label` becomes 11px/500 with no tracking and no uppercase.

**Copy**
- Use the full effect names from `src/config/effectNames.ts` (Task 4). Short codes like "THRML" must not appear in the UI.
- No em dashes in UI copy.

**Layout sizes**
- Header 44px. Footer 30px.
- Browser 250px and inspector 300px (300px and 340px at 2200px wide or more).
- Bottom panel: 172px for Devices, and for Sequencer it follows the content up to 40vh.
- Below 1100px the browser and inspector become drawers.

**Performance**
- `PerformanceLayout` re-renders about 280 times a second, so every new component is `React.memo` with stable props and narrow zustand selectors.
- Never call `useActiveEffects()` in a component that re-renders on parameter ticks unless it is isolated behind a memo boundary. Prefer a primitive or `useShallow` selector.

**Gates**
- `npm run build` passes.
- eslint shows no new problems in changed files compared with the plan base. BankPanel and EffectButton have pre-existing errors.

**Commits**
- Stage only named files, or use `git add -u` for deletions. Never use `git add -A`.
- End each commit with a blank line and then:

  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UcWJjRYnKuxhHFPUQPD9yZ`

**Harness**
- Run with `PATH=/opt/homebrew/bin:$PATH`.
- Kill and restart Vite on :5173 before every run.
- To enable an effect, use `EFFECT_PARAM_REGISTRY[id].setEnabled(true)`.
- For long async evaluates, use fire-and-poll: an async IIFE sets `window.__x`, then `waitForFunction`. "Promise was collected" is a known flake.
- Every task that changes something visible screenshots it at 1440×900 to `.superpowers/sdd/shots/dc-t<N>-*.png`. The user wants to see progress.

## Review Focus

1. **Assignment mode across panels.** The user clicks a modulator's ● in the Modulators card, then clicks a dial on a device card *or* a bar in the Inspector. Either must route, and the route must show in the Inspector's Modulation list (Task 5 and Task 6 tests).
2. **Selection ping-pong.** Selecting a modulator and then an effect, and the reverse, never leaves the Inspector blank or stale. Deleting the selected effect falls back to the next device, or to the empty state (Task 6 test).
3. **Panel toggles while recording.** Toggling Browser, Inspector or Bottom while recording must not remount the canvas or stop the recording (Task 2 test).
4. **Long chains.** With 12 or more devices the chain scrolls horizontally, the selected card scrolls into view, and the page itself never scrolls sideways (Task 5 test).
5. **Search with no results.** The browser shows "No effects match "…"" and a Clear button. It must not show an empty panel (Task 4 test).

---

### Task 1: Tokens, type and dial restyle

**Files:**
- Modify: `index.html` (Google Fonts link for IBM Plex Sans 400/500/600 and IBM Plex Mono 400/500)
- Modify: `src/styles/theme.css` (redefine tokens; add `--gutter`, `--mod`, `--live`; `.hud-label`, `--font-sans`, `--font-mono`; `body` font)
- Modify: `src/components/performance/Knob.tsx` (`showArc` branch visuals only)
- Modify: `src/components/performance/layout.css` (modulated segments use `--mod`, superseding Ruling R5)
- Modify: `.superpowers/sdd/layout-check.mjs` (`tokens2` mode)

**Interfaces:**
- Produces:
  - CSS variables `--gutter`, `--bg-void` (window), `--bg-primary` (panel), `--bg-surface` (raised), `--bg-elevated` (control), `--bg-hover`, `--border` (line), `--text-primary`, `--text-secondary`, `--text-muted`, `--text-ghost` (= muted), `--mod`, `--rec`, `--live`, `--sel`, `--radius-panel: 6px`, `--radius-ctrl: 4px`, `--font-sans`, `--font-mono`.
  - Existing token names are kept so that existing components follow without edits.

- [ ] **Step 1: Write the failing check.** Add a `tokens2` mode:

```js
if (MODE === 'tokens2') {
  await open(1440, 900)
  const r = await p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const v = (n) => cs.getPropertyValue(n).trim().toLowerCase()
    const body = getComputedStyle(document.body)
    const hud = document.querySelector('.hud-label'); const hs = hud && getComputedStyle(hud)
    return { panel: v('--bg-primary'), mod: v('--mod'), live: v('--live'), font: body.fontFamily, hudCase: hs?.textTransform, hudSpacing: hs?.letterSpacing }
  })
  say('panel token is neutral #222326', r.panel === '#222326')
  say('mod and live tokens', r.mod === '#4fb3ff' && r.live === '#b8f35a')
  say('UI font is IBM Plex Sans', /IBM Plex Sans/.test(r.font))
  say('hud-label is normal case, no tracking', r.hudCase === 'none' && (r.hudSpacing === 'normal' || r.hudSpacing === '0px'))
}
```

- [ ] **Step 2: Run it and confirm it fails.** `node .superpowers/sdd/layout-check.mjs tokens2` should fail on every line.

- [ ] **Step 3: Implement.**
  - Add the font link to `index.html`.
  - In `theme.css`, set the token values from Global Constraints. Add `--font-sans: 'IBM Plex Sans', system-ui, sans-serif` and `--font-mono: 'IBM Plex Mono', ui-monospace, monospace`, and apply `font-family: var(--font-sans)` to `body`.
  - Change `.hud-label` to `font: 500 11px var(--font-sans); letter-spacing: normal; text-transform: none; color: var(--text-muted)`.
  - Set panel radius to `--radius-panel` where `theme.css` defines `--panel-radius`.
  - Remove the HUD frame utilities from `.stage-frame` corner ticks only if they now clash. Keep the readouts.

  Muted `#8d9097` on panel `#222326` measures about 5.0:1. Verify this with `.superpowers/sdd/contrast.mjs`.

- [ ] **Step 4: Restyle the dial.** In `Knob.tsx`'s `showArc` branch:
  - 40px SVG;
  - 3px track in `var(--bg-elevated)`;
  - value arc in the `color` prop at 3px with round caps;
  - a white 2.6px position dot;
  - the modulation range as a 5px `var(--mod)` arc;
  - value below at 11px mono `--text-primary`, label below that at 10.5px `--text-muted`.

  Keep every handler and data attribute.

- [ ] **Step 5: Modulated segments use `--mod`.** In `layout.css`, change both `.param-bar-segs > i[data-mod]` rules to `color-mix(in oklab, var(--mod) …)`. Ruling R5 is superseded, and the spec explains why.

- [ ] **Step 6: Verify.**
  - Run `tokens2`, `settings`, `route`, `chain` and `seg-verify wiring`; all must pass.
  - Run `npm run build` and lint.
  - Screenshot the full app at 1440×900 to `dc-t1-1440.png` and look at it.

- [ ] **Step 7: Commit.** `feat: neutral palette, IBM Plex type, normal-case labels, restyled dials`

---

### Task 2: Shell: panels, footer toggles, drawers

**Files:**
- Modify: `src/stores/uiStore.ts` (add panel state)
- Modify: `src/components/performance/layout.css` (new grid areas: header, browser, stage, inspector, bottom, footer; gutters; drawers under 1100px)
- Modify: `src/components/performance/PerformanceLayout.tsx` (render the areas; temporary content per area, listed below)
- Modify: `src/components/performance/StatusBar.tsx` (becomes the footer: status text, then the toggle buttons, then fps)
- Modify: `.superpowers/sdd/layout-check.mjs` (`shell2` mode)

**Interfaces:**
- Produces, in `uiStore`:

```ts
showBrowser: boolean        // default true
showInspector: boolean      // default true
showBottom: boolean         // default true
bottomTab: 'devices' | 'sequencer'   // default 'devices'
selectedModulator: string | null     // 'lfo-0'..'lfo-3' | 'random' | 'step' | 'envelope' | 'sampleHold' | 'midi' | 'audio'; default null
togglePanel: (p: 'browser' | 'inspector' | 'bottom') => void
setBottomTab: (t: 'devices' | 'sequencer') => void
setSelectedModulator: (id: string | null) => void   // also sets selectedEffectId = null when id != null
```

  - `setSelectedEffect(id)` must also set `selectedModulator = null` when `id != null`.
  - DOM contract: the shell root is `.seg-shell` with `data-area` = `header | browser | stage | inspector | bottom | footer`. The shell root also has `data-browser`, `data-inspector` and `data-bottom` attributes, set to `"on"` or `"off"`.

- **Temporary content per area** (Tasks 4–6 replace it):

  | Area | Temporary content |
  |---|---|
  | browser | the current `EffectsColumn` |
  | inspector | the current `ChainPanel` |
  | bottom | the current `Dock` |

- [ ] **Step 1: Write the failing check.** Add a `shell2` mode. It:
  1. At 1440×900, asserts the six areas exist and the stage has the largest area.
  2. Clicks the footer toggles (`[data-toggle="browser"]`, `[data-toggle="inspector"]`, `[data-toggle="bottom"]`) and asserts the area's `display` is `none` and the stage's width or height grows.
  3. Toggles them back.
  4. At 960×1200, asserts the browser and inspector are `position: fixed` drawers, closed by default. Clicking `[data-toggle="browser"]` opens one; `Escape` closes it.
  5. Review Focus 3: starts a recording through `useRecordingControl` the way the `rec` mode does, toggles all three panels, then asserts the same canvas node is still mounted and `isRecording` is still true. Then it stops the recording.

- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement the store fields**, the grid in `layout.css`, and `PerformanceLayout` with the temporary content listed above.
  - Gutters: give the shell background `var(--gutter)` and `gap: 2px`.
  - Hidden panels: removing them from the grid gives their space to the stage. Use grid-template switches driven by the `data-*` attributes.
  - Drawers below 1100px: `position: fixed`, `top: 44px`, `bottom: 30px`, width 300px, `background: var(--bg-primary)`, `z-index: 40`. Close with Escape and with a click on a translucent scrim.
  - Footer: three toggle buttons labelled Browser, Inspector and Bottom. An on toggle shows a `--live` dot.
- [ ] **Step 4: Verify.**
  - Run `shell2`, plus `menus`, `rec`, `seg-verify wiring`, build and lint.
  - Screenshot `dc-t2-1440.png`, then the same with the browser off as `dc-t2-1440-nobrowser.png`, then `dc-t2-960-drawer.png`.
- [ ] **Step 5: Commit.** `feat: Bitwig-style shell with footer panel toggles and narrow drawers`

---

### Task 3: One transport

**Files:**
- Modify: `src/components/performance/HeaderBar.tsx`. Add the centred transport: play/stop, BPM and timecode. Labels: "Video" and "Audio" above the pickers and "Preset" above the preset trigger.
- Create: `src/components/performance/HeaderTransport.tsx`
- Modify: `src/components/performance/StageArea.tsx`. Remove the `CanvasTransportBar` bar above the frame and render one media strip below the frame: video play/pause, the "SRC: …" label, then `TransportBar`.
- Modify: `src/components/sequencer/SequencerTransport.tsx`. Hide its play/stop and BPM when it is rendered inside the bottom panel (prop `compact`); keep swing, resolution and the other controls.
- Modify: `.superpowers/sdd/layout-check.mjs` (`transport` mode)

**Interfaces:**
- Consumes `useEffectSequencerStore`: `isPlaying`, `play()`, `stop()` (find the real stop or pause action name in the store), `bpm`, `setBpm(n)` and `currentStep`. Timecode is the media element's `currentTime`, as `StageReadouts` does today; it shows `--:--.--` when there is no media.
- Produces `HeaderTransport`, `React.memo`, with no props.

- [ ] **Step 1: Write the failing check (`transport` mode).** It must cover:
  - **Play/stop:** clicking `[data-transport="play"]` sets `isPlaying` true; clicking it again stops.
  - **BPM by keyboard:** focusing `[data-transport="bpm"]`, pressing ArrowUp, then Shift+ArrowUp sets BPM to +1 and then +10.
  - **BPM by drag:** a vertical drag changes BPM.
  - **No duplicates:** exactly one element in the document with `[data-transport="play"]`, and no visible play button inside the bottom panel's sequencer toolbar.
  - **Media strip:** `[data-media="playpause"]` toggles the video element's `paused` when a file source is loaded. Use the `.superpowers/sdd/fixtures/seg-exp-28-reference.mp4` upload pattern from `export-check.mjs`.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement.**
  - BPM is a mono 15px number:
    - draggable vertically, 1 BPM per 4px, Shift for 0.1;
    - double-click to type a value;
    - arrows step it;
    - clamped to the store's own min and max.
  - Play uses `--live` when playing.
  - Each button gets `aria-label` and status-bar text.
- [ ] **Step 4: Verify.** Run `transport`, `shell2`, `rec`, `export-check` and `bands-check ui`, plus build and lint. Screenshot `dc-t3-1440.png`.
- [ ] **Step 5: Commit.** `feat: single header transport; media strip under the output`

---

### Task 4: Effects browser (List and Pads)

**Files:**
- Create: `src/config/effectNames.ts`
- Create: `src/components/performance/EffectBrowserList.tsx`
- Create: `src/components/performance/EffectBrowser.tsx`. Panel header "Effects" with a count, a search box, a List/Pads switch, the body, then a footer section with `BankPanel` and `MiddleSection`.
- Modify: `src/components/performance/PerformanceLayout.tsx` (the browser area renders `EffectBrowser`)
- Modify: `src/components/performance/EffectButton.tsx` (pads show the full name from `effectNames`)
- Delete: `src/components/performance/EffectsColumn.tsx`, if it becomes unreferenced
- Modify: `.superpowers/sdd/layout-check.mjs` (`browser` mode)

**Interfaces:**

```ts
// src/config/effectNames.ts
import { EFFECT_DESCRIPTIONS } from './statusDescriptions'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS, PAGE_NAMES } from './effects'
export interface EffectInfo { id: string; name: string; description: string; color: string; page: number }
/** Full name + one-line description for every effect; name from EFFECT_DESCRIPTIONS ("Name — desc"), else a title-cased label. */
export function getEffectInfo(id: string): EffectInfo
export const EFFECT_CATEGORIES: { name: string; effects: EffectInfo[] }[]   // PAGE_NAMES order, title case ("Acid", …)
```

- Rules:
  - Split each description on the em dash (`—`) to get the name and the description.
  - When an effect has no description, the name is the title-cased label and the description is `''`.
  - Reserved slots (ids containing `reserved`) are excluded.
  - Check every short code that falls back to title case (for example "Thrml" or "Kaleid") and add proper names to the `EFFECT_DESCRIPTIONS` entries that are missing. That is the spec's allowed copy addition. List them in the report.

- `EffectBrowserList` props: `{ query: string }`.
  - Rows carry `data-effect-row={id}`. Clicking a row toggles the effect through the same `state.onToggle` and `ensureTrack` path that `PerformanceGrid` uses: `getEffectState(id).onToggle()`, then `useEffectSequencerStore.getState().ensureTrack(id)`. Extract `getEffectState` from `PerformanceGrid` into `src/hooks/useEffectToggle.ts` so both share it, rather than duplicating it.
  - An effect that is in the chain shows "in chain" and its row text is primary-coloured.

- [ ] **Step 1: Write the failing check (`browser` mode).** It must cover:
  - **Default view:** List is the default, with 6 categories and 92 effect rows in total, counted with every category expanded.
  - **No short codes:** no row text matches `/^[A-Z0-9]{3,7}$/`.
  - **Search:** typing "point" leaves only "Point Cloud" visible.
  - **Toggle:** clicking that row makes `point_cloud` enabled, and the row shows "in chain".
  - **No results (Review Focus 5):** searching "zzzz" shows "No effects match" and a Clear button, and Clear restores the list.
  - **Pads:** switching to Pads shows the grid, where a click still toggles and a vertical drag still changes `effectMix`.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement.**
  - Categories fold with a chevron and show a count. Rows are 28px or taller, laid out as dot, name, then description in muted 11px.
  - Search is case-insensitive over name and description.
  - The List/Pads switch is a two-button segmented control.
- [ ] **Step 4: Verify.** Run `browser`, `effects`, `shell2` and `seg-verify wiring`, plus build and lint. Screenshot `dc-t4-1440-list.png` and `dc-t4-1440-pads.png`.
- [ ] **Step 5: Commit.** `feat: effects browser with full names, descriptions, search and pads mode`

---

### Task 5: Device chain and modulators card

**Files:**
- Create: `src/components/performance/DeviceChain.tsx`, `DeviceCard.tsx` and `ModulatorsCard.tsx`
- Create: `src/components/performance/BottomPanel2.tsx`. Header with "Chain · signal flows left to right", Devices/Sequencer tabs, and Bypass all and Clear. The body is `DeviceChain` or `SequencerContainer`.
- Modify: `PerformanceLayout.tsx` (the bottom area renders `BottomPanel2`)
- Modify: `ChainPanel.tsx`. Move its `ensureTrack`, auto-select, drag-reorder, keyboard and bypass/clear logic into `DeviceChain` and `BottomPanel2`. `ChainPanel` is no longer rendered; Task 6 replaces the inspector area.
- Modify: `.superpowers/sdd/layout-check.mjs` (`devices` mode)

**Interfaces:**
- Consumes:
  - `useParamControl`, `Knob` (with `showArc`, `resetOnDoubleClick` and `paramId`) and `useParamValue`;
  - `EFFECT_PARAM_REGISTRY` (the first 4 numeric params, excluding 0/1 toggles, matching `EffectSettings`);
  - `useGlitchEngineStore` `effectMix` / `setEffectMix`;
  - `useRoutingStore` `effectOrder` / `reorderEffect`;
  - `useEffectDisable`;
  - `toggleEffectBypassed` / `effectBypassed`;
  - `uiStore` `selectedEffectId`, `setSelectedEffect` and `setSelectedModulator`;
  - `useModulationStore` `setAssigningModulator`;
  - `getEffectInfo` from Task 4.
- Produces these DOM hooks:
  - `[data-device-card={id}]`, with `data-selected` and `data-bypassed`;
  - `[data-device-power]`, `[data-device-remove]` and `[data-device-mix]` inside each card;
  - `[data-modulator-slot={id}]` with `[data-modulator-route]`.
- `DeviceCard` is `React.memo` with props `{ effectId: string; index: number; selected: boolean; bypassed: boolean }` and stable handlers. `DeviceChain` derives its id list with a stable `useShallow` selector.

**Modulator slots:**

| Slot | Routing id |
|---|---|
| LFO 1 to LFO 4 | `lfo-0` to `lfo-3` |
| Random | `random` |
| Step | `step` |
| Envelope | `envelope` |
| S&H | `sampleHold` |
| MIDI | `midi` (select only; routing uses MIDI learn in its editor) |
| Audio | `audio` (select only; bands route from its editor) |

- Each slot shows a small live SVG of its output: a sine for LFOs, a step for Step, and so on. Use static shapes coloured `--mod`; they do not need to animate.
- The ● routing button calls `setAssigningModulator(id)`. While assigning, the button pulses and the toolbar text reads "Click or drag a control to route LFO 1".
- Clicking the slot body calls `setSelectedModulator(id)`.

- [ ] **Step 1: Write the failing check (`devices` mode).** It must cover:
  - **Cards:** with SEG_EXP loaded, there are 5 device cards in `effectOrder` order, each with 4 `[data-param-control]` dials and a `[data-device-mix]`.
  - **Selection:** clicking a card sets `selectedEffectId`, and the card gets `data-selected`.
  - **Bypass:** clicking `[data-device-power]` toggles bypass.
  - **Remove:** hovering a card and clicking `[data-device-remove]` disables the effect.
  - **Reorder:** dragging card 1 after card 3 updates `effectOrder`.
  - **Mix:** dragging the mix bar changes `effectMix[id]`.
  - **Routing:** clicking `[data-modulator-slot="lfo-0"] [data-modulator-route]` and then clicking a device dial creates a routing from `lfo-0` to that `paramId`.
  - **Long chains (Review Focus 4):** with 12 or more effects enabled, the chain's `scrollWidth` exceeds its `clientWidth`, the page has no horizontal scroll, and selecting the last effect scrolls its card into view.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement**, matching the mockup's card:
  - 26px side strip with a 3px colour stripe, the power button and the vertical name;
  - a row of 4 dials, each 50px wide;
  - a Mix bar in the effect colour with a percentage readout;
  - 6px radius, and a 1px `--sel` outline when selected;
  - "+" gaps between cards; the final "+" card focuses the browser search input.

  The Sequencer tab renders `SequencerContainer` with `SequencerTransport compact`.
- [ ] **Step 4: Verify.**
  - Run `devices`, `dock` (selectors updated for the new bottom panel), `route`, `seg-verify wiring` and `bands-check ui/gate/mod`, plus build and lint.
  - Screenshot `dc-t5-1440-devices.png` and `dc-t5-1440-sequencer.png`.
- [ ] **Step 5: Commit.** `feat: device chain with modulators card; sequencer as a bottom tab`

---

### Task 6: Inspector

**Files:**
- Create: `src/components/performance/Inspector.tsx`
- Modify: `src/components/performance/EffectSettings.tsx`. Add a `showStrip?: boolean` prop, default `true`. When it is `false`, every numeric param renders as a `ParamBar`.
- Modify: `PerformanceLayout.tsx` (the inspector area renders `Inspector`)
- Delete: `src/components/performance/ChainPanel.tsx` once it is unreferenced, along with any now-dead helpers.
- Modify: `.superpowers/sdd/layout-check.mjs` (`inspector` mode). Update the `settings` and `chain` modes to the new DOM. `chain` becomes a thin alias of `devices`.

**Interfaces:**
- Consumes: `selectedEffectId` and `selectedModulator` (Task 2), `EffectSettings`, `ModulationAssignPanel`, `ModulationContent` (`activeModulator`), `TrackAudioReactivePanel`, `useSequencerStore` routings, and `getEffectInfo`.
- Produces `Inspector`, `React.memo`, with no props.
  - Its root has `data-inspector-mode` set to `effect`, `modulator` or `empty`.
  - The modulation routes list sits under `[data-inspector-routes]`. Each route shows the source name, then "→", then the parameter label, then the amount as a percentage. Clicking × removes the route.

| `data-inspector-mode` | Content |
|---|---|
| `effect` | Header: colour square, full name, "3 of 5 in chain", and a Bypass button. Then `<EffectSettings effectId showStrip={false} />`, the routes for params starting with `${effectId}.`, then the audio band (`TrackAudioReactivePanel effectId`). |
| `modulator` | Header with the modulator's name, then its editor. LFO slots use `ModulationAssignPanel`, scrolled or opened to that LFO if the component supports it. Random, Step, Envelope, S&H and MIDI use `ModulationContent activeModulator` (`random`, `step`, `envelope`, `sh`, `midi`). Audio uses `TrackAudioReactivePanel`. |
| `empty` | "Select a device or modulator to edit it." |

- [ ] **Step 1: Write the failing check (`inspector` mode).** It must cover:
  - **Effect selected:** selecting VOXEL puts the inspector in `effect` mode, with the header "Voxel" and every numeric param as a `.param-bar` (no `[data-knob-strip]`).
  - **Routes:** routing LFO 1 to a bar in the inspector adds a row to `[data-inspector-routes]`; removing it with × deletes the routing.
  - **Selection ping-pong (Review Focus 2):** selecting the `envelope` slot gives `modulator` mode and the envelope editor; selecting a device card switches back to `effect` mode.
  - **Deleting the selected effect:** selection falls back to the next device. With no devices, the mode is `empty`.
- [ ] **Step 2: Run it and confirm it fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.**
  - Run `inspector`, `settings` (updated), `devices`, `route`, `bands-check ui` and `seg-verify wiring`, plus build and lint.
  - Screenshot `dc-t6-1440-effect.png`, `dc-t6-1440-modulator.png` and `dc-t6-1440-empty.png`.
- [ ] **Step 5: Commit.** `feat: contextual inspector for devices and modulators`

---

### Task 7: Labels pass

**Files:**
- Modify the components that render icon-only buttons. Find them with `grep -rn "aria-label\|<svg" src/components` and by looking at the screenshots. At minimum:
  - the crossfader row in `MiddleSection` / `HorizontalCrossfader`;
  - the sequencer toolbar in `SequencerTransport`;
  - the dock rail in `SequencerContainer`;
  - `ClipBin`'s "+" button;
  - the header icons.
- Modify `src/config/statusDescriptions.ts` to add any missing descriptions. Keep the copy free of em dashes.
- Modify: `.superpowers/sdd/layout-check.mjs` (`labels` mode)

- [ ] **Step 1: Write the failing check (`labels` mode).** At 1440×900, with SEG_EXP loaded, check every visible `button` and `[role=button]` in the app:
  - it either has visible text, or has an `aria-label` of 2 or more words;
  - hovering it sets a non-empty status text;
  - no visible text node matches a short effect code from `effects.ts` labels where a full name exists.

  The check fails while any button breaks a rule, and lists the offenders.
- [ ] **Step 2: Run it and confirm it fails.** Record the offender list.
- [ ] **Step 3: Fix every offender.** Prefer a visible short text label when there is room, such as "Solo" or "Random". Otherwise add an `aria-label` and a status description.
- [ ] **Step 4: Verify.** Run `labels`, `shell2`, `devices` and `browser`, plus build and lint. Screenshot `dc-t7-1440.png`.
- [ ] **Step 5: Commit.** `fix: every control is labelled; no short codes in the UI`

---

### Task 8: Final verification and screenshots

**Files:**
- Modify: `.superpowers/sdd/layout-check.mjs` (`dcshots` mode)

- [ ] **Step 1: Screenshots.** At 1440×900, 2560×1080, 1180×800 and 960×1200, capture the app empty and populated (SEG_EXP plus the reference clip) to `.superpowers/sdd/shots/dc-final-<size>-<state>.png`. Build `.superpowers/sdd/shots/dc-compare-1440.png` with ffmpeg: hstack the mockup `A-1440.png` with `dc-final-1440x900-populated.png`, scaled to the same height.
- [ ] **Step 2: Run everything,** with a fresh server each time:
  - the `layout-check` modes `tokens2`, `shell2`, `transport`, `browser`, `devices`, `inspector`, `labels`, `settings`, `route`, `barmath`, `menus`, `rec` and `dcshots`;
  - `seg-verify wiring`;
  - `bands-check ui`, `gate` and `mod`;
  - `export-check`.

  All must pass.
- [ ] **Step 3: Contrast.** Measure muted text on panel and on raised: both must be at least 4.5:1. Measure secondary text on panel too.
- [ ] **Step 4: Gates.** Build passes, and lint shows no new problems compared with the plan base.
- [ ] **Step 5: Hand over.** List the compare sheet and screenshot paths for human review. Do not commit screenshots.
