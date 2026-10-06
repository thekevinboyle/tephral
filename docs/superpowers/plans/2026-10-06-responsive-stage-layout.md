# Responsive Stage Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild SEG_F4ULT's main layout as the approved direction A "Stage". The output is the largest area at every size. The rest of the screen holds an Effects column, a Chain + Settings column, a bottom Dock (its own column on ultrawide), and a stronger monochrome HUD look.

**Architecture:** `PerformanceLayout` becomes a CSS-grid shell with named areas and three breakpoints, defined in a new `layout.css`. Three new focused components fill the areas, and existing components are reused inside them:
- `StageArea` frames the canvas.
- `ChainPanel` replaces both `EffectCardStack` and the removed `SharedEffectTabsBar` rail.
- `Dock` wraps the sequencer and modulation tabs.

Visual tokens change in `theme.css` only.

**Tech Stack:** React 19, TypeScript, Tailwind, zustand 5, Vite 7. Verification uses puppeteer scripts under `.superpowers/sdd/` (gitignored), `npm run build` (tsc), and eslint on changed files.

**Spec:** `docs/superpowers/specs/2026-10-06-responsive-stage-layout-design.md`. The mockup is in `docs/superpowers/specs/assets/2026-10-06-stage-layout/`: `layout.html?d=A`, `A-laptop.png`, `A-ultrawide.png`, `A-narrow.png`.

## Global Constraints

- Breakpoints:
  - ≥ 2200 px is ultrawide, with 4 columns: Effects `minmax(340px,16vw)`, Stage `1fr`, Chain `minmax(320px,15vw)`, Dock `minmax(560px,26vw)`.
  - 1100–2199 px is laptop, with 3 columns: Effects `minmax(300px,22vw)`, Stage `1fr`, Chain `minmax(280px,20vw)`. The Dock spans the bottom.
  - Below 1100 px is narrow, with 2 columns: Stage (about 46vh) on top, then Effects | Chain, then Dock, then Status. The page scrolls vertically.
- Layout is CSS only (grid areas, media queries, container queries). There is no JS layout maths.
- The output is the largest on-screen area at all three test sizes: 1440×900, 2560×1080 and 960×1200.
- No clipped labels (`scrollWidth ≤ clientWidth + 1`), and no overlapping A/B/C/D/UNDO/REKT buttons or page tabs.
- Colour comes only from active effects, except that REC stays red. Panels have a 0–2 px radius, no shadows, and 1 px rules between them.
- Type is JetBrains Mono throughout. Labels are 10 px uppercase and tracked, values are 12 px with tabular numerals, and BPM is 18 px bold.
- Muted, helper and empty-state text has contrast ≥ 4.5:1 against its background.
- Tokens are edited only in `src/styles/theme.css`. `src/index.css` is stale and must not be touched.
- Behaviour must not change: effect enable/reorder/bypass/remove, sequencer and p-locks, modulation, audio bands/gate/MOD, recording, export, presets/banks, crossfader, and the SEG person mask. Selecting a chain row sets `uiStore.selectedEffectId` via `setSelectedEffect`.
- Lint gate: new files must be eslint-clean, and modified files must not gain problems against the task base. Repo-wide lint already fails on master.
- Commits end with the session attribution trailers after a blank line. Stage only named files and never use `git add -A`.

## Review Focus

1. **Every effect disabled while one is selected.** The Settings area must fall back to its teaching empty state, the Dock must collapse to its header, and nothing may throw. → Task 3 Step 6.
2. **Window resized across a breakpoint while recording.** Recording continues, the canvas keeps rendering, and there are no console errors. Remounting the canvas would break the capture ref. → Task 2 Step 6.
3. **A long effect or preset name, or a 16-track chain.** The chain rows and dock scroll inside their own areas, the page does not grow, and nothing clips or pushes the Stage smaller than its minimum. → Task 3 Step 7, Task 5 Step 5.
4. **Source set to None (no video).** The Stage frame still reserves the 16:9 placeholder size, and the HUD readouts show sensible defaults rather than NaN or undefined. → Task 2 Step 5.
5. **Drag-reordering a chain row onto itself or to the end.** It must be a no-op or move to the end, matching the old rail's semantics exactly. → Task 3 Step 5.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/theme.css` | tokens: tinted neutrals, radius, shadows, contrast, type tiers, HUD frame utilities |
| `src/components/performance/layout.css` (create) | grid areas + breakpoints for the shell; container-query rules for inner wraps |
| `src/components/performance/PerformanceLayout.tsx` | the shell: areas only, no per-panel styling |
| `src/components/performance/StageArea.tsx` (create) | output frame (fit, ticks, ruler, HUD readouts) + canvas bars + clip bin |
| `src/components/performance/ChainPanel.tsx` (create) | chain rows (select/reorder/bypass/remove/clear-all/bypass-all), auto-select + ensureTrack, settings + audio band of the selected effect, empty states |
| `src/components/performance/EffectsColumn.tsx` (create) | grid + bank + crossfader + preset library, stacked |
| `src/components/performance/Dock.tsx` (create) | sequencer + modulation tabs; height follows content (capped), empty state |
| `src/components/performance/BankPanel.tsx` | 6-slot grid for A/B/C/D/UNDO/REKT (no fixed 48 px widths) |
| `src/components/performance/PerformanceGrid.tsx` | page tabs wrap via container query (class hook only) |
| `src/components/performance/HeaderBar.tsx` | hosts `PresetDropdownBar`; secondary fields hide on narrow instead of clipping |
| `src/components/performance/EffectCardStack.tsx`, `src/components/sequencer/SharedEffectTabsBar.tsx` | deleted once unused (Task 3) |
| `.superpowers/sdd/layout-check.mjs` (create, gitignored) | harness: modes `tokens`, `shell`, `chain`, `effects`, `dock`, `shots`, `resize` |

---

### Task 1: Theme tokens + HUD utilities

**Files:**
- Modify: `src/styles/theme.css` (the `:root` token block at the top; append the utilities at the end, after the motion foundation)
- Create: `.superpowers/sdd/layout-check.mjs` (`tokens` mode)

**Interfaces:**
- Produces these CSS custom properties: `--panel-radius: 2px`, `--shadow-panel: none` and `--shadow-panel-lg: none`, a tinted `--bg-*` scale, and raised `--text-muted`/`--text-ghost`.
- Produces these classes: `.hud-label`, `.hud-value`, `.hud-bpm`, `.stage-frame`, `.stage-tick` (with modifiers `.tl` `.tr` `.bl` `.br`), `.stage-ruler`, `.stage-readout` (with modifiers `.tl` `.tr` `.bl` `.br`), `.rule-b` (bottom 1 px rule), `.surface-raised-row`.

- [ ] **Step 1: Write the failing check**

Create `.superpowers/sdd/layout-check.mjs`:

```js
// Usage: node .superpowers/sdd/layout-check.mjs <mode>  (fresh dev server on :5173)
import puppeteer from 'puppeteer'
const MODE = process.argv[2]
const SIZES = { laptop: [1440, 900], ultrawide: [2560, 1080], narrow: [960, 1200] }
const errors = []
const b = await puppeteer.launch({ headless: process.env.HEADED ? false : 'new' })
const p = await b.newPage()
p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error' && !/listener indicated|key.*prop/.test(m.text())) errors.push(m.text().slice(0, 200)) })
let pass = true
const say = (k, ok) => { console.log(`${k}: ${ok ? 'OK' : 'FAIL'}`); if (!ok) pass = false }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const open = async (w, h) => { await p.setViewport({ width: w, height: h }); await p.goto('http://localhost:5173/', { waitUntil: 'networkidle2' }); await wait(1200) }

if (MODE === 'tokens') {
  await open(1440, 900)
  const r = await p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const v = (n) => cs.getPropertyValue(n).trim()
    const toRGB = (c) => { const d = document.createElement('div'); d.style.color = c; document.body.appendChild(d); const o = getComputedStyle(d).color; d.remove(); return o.match(/[\d.]+/g).slice(0, 3).map(Number) }
    const lum = ([r, g, bl]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl) }
    const ratio = (a, b2) => { const [x, y] = [lum(toRGB(a)), lum(toRGB(b2))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
    return {
      radius: v('--panel-radius'), shadow: v('--shadow-panel'),
      mutedOnPrimary: ratio(v('--text-muted'), v('--bg-primary')),
      ghostOnPrimary: ratio(v('--text-ghost'), v('--bg-primary')),
      mutedOnSurface: ratio(v('--text-muted'), v('--bg-surface')),
      hasUtils: ['hud-label', 'stage-frame', 'stage-readout'].every((c) => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.selectorText && r.selectorText.includes('.' + c)) } catch { return false } })),
    }
  })
  console.log(JSON.stringify(r))
  say('panel radius ≤ 2px', parseFloat(r.radius) <= 2)
  say('panel shadow removed', r.shadow === 'none')
  say('muted text ≥ 4.5:1 on primary', r.mutedOnPrimary >= 4.5)
  say('ghost text ≥ 4.5:1 on primary', r.ghostOnPrimary >= 4.5)
  say('muted text ≥ 4.5:1 on surface', r.mutedOnSurface >= 4.5)
  say('HUD utilities defined', r.hasUtils)
}

// (later tasks add modes here)

say('no page errors', errors.length === 0)
errors.slice(0, 5).forEach((e) => console.log(' ERR:', e))
await b.close()
console.log(pass ? `LAYOUT ${MODE} CHECK: PASS` : `LAYOUT ${MODE} CHECK: FAIL`)
process.exit(pass ? 0 : 1)
```

- [ ] **Step 2: Run it to verify it fails**

Start a fresh dev server with `lsof -ti:5173 | xargs kill; npm run dev > /tmp/claude-501/vite.log 2>&1 &`, wait about 6 s, then run `PATH=/opt/homebrew/bin:$PATH node .superpowers/sdd/layout-check.mjs tokens`.

Expected: FAIL. The radius is 8px, the shadow is set, `--text-ghost` contrast is about 2.4:1, and the utilities are missing.

- [ ] **Step 3: Edit the tokens in `theme.css`**

In the top `:root` block, replace these values:

```css
  --bg-void: oklch(0.17 0.006 270);
  --bg-primary: oklch(0.205 0.006 270);
  --bg-surface: oklch(0.225 0.007 270);
  --bg-elevated: oklch(0.255 0.007 270);
  --bg-hover: oklch(0.29 0.008 270);
  --panel-radius: 2px;
  --border: oklch(0.32 0.008 270);
  --border-emphasis: oklch(0.42 0.008 270);
  --border-light: oklch(0.29 0.008 270);
  --text-primary: oklch(0.95 0.004 270);
  --text-secondary: oklch(0.80 0.006 270);
  --text-muted: oklch(0.70 0.006 270);
  --text-ghost: oklch(0.64 0.006 270);
  --shadow-panel: none;
  --shadow-panel-lg: none;
```

Leave every other token as it is. Then verify the contrast in Step 4. If `--text-ghost` misses 4.5:1 on `--bg-surface`, raise its lightness in 0.02 steps until it passes, and record the final value in the report.

- [ ] **Step 4: Append the HUD utilities to the end of `theme.css`**

```css
/* ── HUD type tiers ───────────────────────────────────────── */
.hud-label { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-muted); }
.hud-value { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.hud-bpm   { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-primary); }

/* ── Rules and raised rows (no cards) ─────────────────────── */
.rule-b { border-bottom: 1px solid var(--border); }
.surface-raised-row { background: var(--bg-surface); box-shadow: inset 0 0 0 1px var(--border-emphasis); }

/* ── Output stage frame ───────────────────────────────────── */
.stage-frame { position: relative; }
.stage-tick { position: absolute; width: 14px; height: 14px; border-color: var(--text-secondary); border-style: solid; pointer-events: none; }
.stage-tick.tl { left: -8px; top: -8px; border-width: 1px 0 0 1px; }
.stage-tick.tr { right: -8px; top: -8px; border-width: 1px 1px 0 0; }
.stage-tick.bl { left: -8px; bottom: -8px; border-width: 0 0 1px 1px; }
.stage-tick.br { right: -8px; bottom: -8px; border-width: 0 1px 1px 0; }
.stage-ruler { position: absolute; left: 0; right: 0; bottom: -16px; height: 6px; pointer-events: none;
  background: repeating-linear-gradient(90deg, var(--text-ghost) 0 1px, transparent 1px 10%); }
.stage-readout { position: absolute; z-index: 2; pointer-events: none; font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 10px; letter-spacing: .12em; color: var(--text-secondary); background: oklch(0.17 0.006 270 / .72); padding: 3px 6px; }
.stage-readout.tl { left: 10px; top: 10px; } .stage-readout.tr { right: 10px; top: 10px; }
.stage-readout.bl { left: 10px; bottom: 10px; } .stage-readout.br { right: 10px; bottom: 10px; }
```

If `--font-mono` doesn't exist, find the existing mono font variable with `grep -n "font" src/styles/theme.css | head` and use it instead of `--font-mono`. Use the same fallback stack.

- [ ] **Step 5: Run the check to verify it passes**

Fresh server, then run the `tokens` mode. Expected: PASS.

- [ ] **Step 6: Build, lint, look**

`npm run build` must exit 0. Then open the app, take a screenshot at 1440×900 (`.superpowers/sdd/shots/layout-t1.png`), and confirm the panels now have square corners and the muted text is readable.

- [ ] **Step 7: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: HUD tokens — tinted neutrals, square panels, readable muted text, stage utilities"
```

---

### Task 2: Layout shell + Stage

**Files:**
- Create: `src/components/performance/layout.css`
- Create: `src/components/performance/StageArea.tsx`
- Create: `src/components/performance/Dock.tsx` (thin first version: sequencer + modulation tabs)
- Modify: `src/components/performance/PerformanceLayout.tsx` (replace the returned JSX grid)
- Modify: `.superpowers/sdd/layout-check.mjs` (add the `shell` mode)

**Interfaces:**
- Consumes: Task 1 classes.
- Produces these components and attributes:
  - `<StageArea canvasRef={…} onCanvasElement={…} />`, which renders `CanvasTransportBar`, the framed `Canvas` with `ClipBin`, and `TransportBar`.
  - `<Dock />`, which renders `SequencerContainer hideTabsBar` and `BottomPanel`.
  - Area elements carry `data-area="header|effects|stage|chain|dock|status"`, for the checks.

- [ ] **Step 1: Write the failing check**

Add a `shell` mode to `layout-check.mjs`:

```js
if (MODE === 'shell') {
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    await open(w, h)
    const r = await p.evaluate(() => {
      const box = (a) => { const el = document.querySelector(`[data-area="${a}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, area: b.width * b.height } }
      const areas = Object.fromEntries(['header', 'effects', 'stage', 'chain', 'dock', 'status'].map((a) => [a, box(a)]))
      const frame = document.querySelector('[data-stage-frame]')?.getBoundingClientRect()
      return { areas, frameArea: frame ? frame.width * frame.height : 0, rail: !!document.querySelector('[data-legacy-tab-rail]'),
        scrollW: document.documentElement.scrollWidth, vw: innerWidth }
    })
    const a = r.areas
    const present = Object.values(a).every(Boolean)
    say(`${name}: all six areas present`, present)
    if (!present) continue
    say(`${name}: stage is the largest area`, ['effects', 'chain', 'dock'].every((k) => a.stage.area > a[k].area))
    say(`${name}: no horizontal page overflow`, r.scrollW <= r.vw + 1)
    if (name === 'ultrawide') say('ultrawide: dock is a right-hand column (x > chain.x, full-ish height)', a.dock.x > a.chain.x && a.dock.h > a.stage.h * 0.8)
    if (name === 'laptop') say('laptop: dock spans the bottom under stage', a.dock.y >= a.stage.y + a.stage.h - 2 && a.dock.w > a.stage.w)
    if (name === 'narrow') say('narrow: stage first, effects and chain side by side below', a.stage.y < a.effects.y && Math.abs(a.effects.y - a.chain.y) < 2 && a.effects.x < a.chain.x)
    say(`${name}: framed output ≥ 60% of stage area`, r.frameArea >= a.stage.area * 0.6 || name === 'narrow')
    await p.screenshot({ path: `.superpowers/sdd/shots/layout-shell-${name}.png` })
  }
}
```

The `data-stage-frame` element is the aspect-locked output frame. The 60% assertion is skipped on narrow screens, where height is the limit.

- [ ] **Step 2: Run it to verify it fails**

Run the `shell` mode on a fresh server. Expected: FAIL, with "all six areas present" failing because no `data-area` attributes exist yet.

- [ ] **Step 3: Create `layout.css`**

```css
/* SEG_F4ULT shell: direction A "Stage" (see docs/superpowers/specs/2026-10-06-responsive-stage-layout-design.md) */
.seg-shell {
  height: 100vh; width: 100vw; overflow: hidden;
  display: grid; gap: 1px; background: var(--border);
  grid-template-columns: minmax(300px, 22vw) minmax(0, 1fr) minmax(280px, 20vw);
  grid-template-rows: 44px minmax(0, 1fr) auto 24px;
  grid-template-areas:
    "header  header header"
    "effects stage  chain"
    "dock    dock   dock"
    "status  status status";
}
.seg-shell > [data-area] { background: var(--bg-primary); min-width: 0; min-height: 0; overflow: hidden; position: relative; }
.seg-shell > [data-area="header"]  { grid-area: header; }
.seg-shell > [data-area="effects"] { grid-area: effects; display: flex; flex-direction: column; container-type: inline-size; }
.seg-shell > [data-area="stage"]   { grid-area: stage; background: var(--bg-void); }
.seg-shell > [data-area="chain"]   { grid-area: chain; display: flex; flex-direction: column; overflow-y: auto; }
.seg-shell > [data-area="dock"]    { grid-area: dock; max-height: 34vh; display: flex; flex-direction: column; overflow-y: auto; }
.seg-shell > [data-area="status"]  { grid-area: status; }

@media (min-width: 2200px) {
  .seg-shell {
    grid-template-columns: minmax(340px, 16vw) minmax(0, 1fr) minmax(320px, 15vw) minmax(560px, 26vw);
    grid-template-rows: 44px minmax(0, 1fr) 24px;
    grid-template-areas:
      "header  header header header"
      "effects stage  chain  dock"
      "status  status status status";
  }
  .seg-shell > [data-area="dock"] { max-height: none; }
}

@media (max-width: 1099.98px) {
  .seg-shell {
    height: auto; min-height: 100vh; overflow-y: auto;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: 44px 46vh auto auto 24px;
    grid-template-areas:
      "header  header"
      "stage   stage"
      "effects chain"
      "dock    dock"
      "status  status";
  }
  .seg-shell > [data-area="dock"] { max-height: none; }
  .seg-hide-narrow { display: none !important; }
}
```

- [ ] **Step 4: Create `StageArea.tsx`**

`StageArea` takes over the old right column's canvas block unchanged in behaviour. It keeps the same `Canvas` ref wiring, `ClipBin`, `CanvasTransportBar` and `TransportBar`. It drops the `IrisScanner` filler and adds the frame.

```tsx
import { forwardRef, useEffect, useRef, useState } from 'react'
import { Canvas } from '../Canvas'
import { ClipBin } from './ClipBin'
import { CanvasTransportBar } from './CanvasTransportBar'
import { TransportBar } from './TransportBar'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'

/** Rolling frames-per-second from requestAnimationFrame (display cadence, not render cost). */
function useFps(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let raf = 0, n = 0, t0 = performance.now()
    const tick = () => {
      n++
      const now = performance.now()
      if (now - t0 >= 500) { setFps(Math.round((n * 1000) / (now - t0))); n = 0; t0 = now }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

/** The output stage: aspect-locked frame that fits the free space, with HUD readouts. */
export const StageArea = forwardRef<HTMLCanvasElement>(function StageArea(_props, canvasRef) {
  const videoAspect = useMediaStore((s) => s.videoAspect) ?? 16 / 9
  const videoElement = useMediaStore((s) => s.videoElement)
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const band = useEffectSequencerStore((s) => {
    const t = selectedEffectId ? s.tracks[selectedEffectId] : undefined
    return t?.audioReactive.enabled ? t.audioReactive.band : null
  })
  const activeBank = useRoutingStore((s) => s.activeBank)
  const fps = useFps()
  const [time, setTime] = useState(0)
  const timeRaf = useRef(0)
  useEffect(() => {
    const tick = () => { setTime(videoElement ? videoElement.currentTime : performance.now() / 1000); timeRaf.current = requestAnimationFrame(tick) }
    timeRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(timeRaf.current)
  }, [videoElement])

  const fmtHz = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`)

  return (
    <div className="h-full flex flex-col">
      <CanvasTransportBar />
      <div className="flex-1 min-h-0" style={{ containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div
          data-stage-frame
          className="stage-frame"
          style={{
            aspectRatio: String(videoAspect),
            width: `min(100cqw, calc(100cqh * ${videoAspect}))`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div className="absolute inset-0 overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
            <Canvas ref={canvasRef} />
            <ClipBin />
          </div>
          <span className="stage-tick tl" /><span className="stage-tick tr" /><span className="stage-tick bl" /><span className="stage-tick br" />
          <span className="stage-readout tl">● LIVE {fps} FPS</span>
          <span className="stage-readout tr">BANK {activeBank === null ? '—' : String.fromCharCode(65 + activeBank)}</span>
          <span className="stage-readout bl">{fmtTime(time)}</span>
          {band && <span className="stage-readout br">BAND {fmtHz(band.lowHz)}–{fmtHz(band.highHz)}</span>}
          <div className="stage-ruler" />
        </div>
      </div>
      <TransportBar />
    </div>
  )
})
```

Before writing the file, check these four things against the current code:
- **`Canvas` import and ref type.** Look at how `PerformanceLayout` imports `Canvas` and passes `ref={canvasRef}` today, and match it exactly. If `Canvas` is a default export, or its ref type differs, follow the existing usage.
- **`activeBank` type.** Confirm it is `number | null` with `grep -n "activeBank" src/stores/routingStore.ts`.
- **`useMediaStore` fields.** Check that `videoAspect` and `videoElement` exist with `grep -n "videoAspect\|videoElement" src/stores/mediaStore.ts`.
- **`TransportBar` placement.** If it was not previously rendered directly under the canvas, keep it where `PerformanceLayout` had it, inside the stage column, and note this in the report.

- [ ] **Step 5: Create `Dock.tsx` (first version)**

```tsx
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { BottomPanel } from './BottomPanel'

/** Bottom dock (laptop/narrow) or right column (ultrawide): sequencer above, modulation tabs below. */
export function Dock() {
  return (
    <>
      <div className="min-h-0" style={{ flex: '1 1 auto' }}>
        <SequencerContainer hideTabsBar />
      </div>
      <div className="flex-shrink-0" style={{ marginTop: 'auto' }}>
        <BottomPanel />
      </div>
    </>
  )
}
```

Use the same import paths `PerformanceLayout` uses today.

- [ ] **Step 6: Rewrite the `PerformanceLayout` grid**

Replace the returned JSX with the shell below. Keep every hook, ref and effect above `return` exactly as it is, including `canvasRef`, `setCanvasElement`, `captureRef`, `useRecordingCapture` and the canvas-capture effect. Keep the trailing `<ClipDetailModal />`, `<ModulationLines />` and `<DestructionOverlay />`.

```tsx
  return (
    <div className="seg-shell grid-substrate">
      <div data-area="header" className="panel-header"><HeaderBar /></div>
      <div data-area="effects">
        {/* Task 4 replaces this block with <EffectsColumn /> */}
        <div style={{ flex: '1 1 auto', minHeight: 0 }}><PerformanceGrid /></div>
        <div className="rule-b" style={{ height: 52, flexShrink: 0 }}><BankPanel /></div>
        <div style={{ minHeight: 'var(--row-middle)', flexShrink: 0 }}><MiddleSection /></div>
      </div>
      <div data-area="stage"><StageArea ref={canvasRef} /></div>
      <div data-area="chain">
        {/* Task 3 replaces this with <ChainPanel /> */}
        <EffectCardStack />
      </div>
      <div data-area="dock"><Dock /></div>
      <div data-area="status"><StatusBar /></div>

      <ClipDetailModal />
      <ModulationLines />
      <DestructionOverlay />
    </div>
  )
```

Then make these changes:
- Add `import './layout.css'` at the top of the file.
- Remove the `SharedEffectTabsBar` import and render. Task 3 moves its side effects into `ChainPanel`. Until Task 3 lands, the temporary `EffectCardStack` covers settings, and track creation (`ensureTrack`) still happens on grid toggle via `PerformanceGrid`'s `wrappedToggle`.
- Remove the `IrisScanner` filler and the old canvas column.

If `Canvas`'s ref was previously a callback ref (`setCanvasElement`), pass the same callback through `StageArea` unchanged. Choose whichever variant matches the existing code, and say which in the report.

- [ ] **Step 7: Run the `shell` check to verify it passes**

Fresh server. Expected: PASS at all three sizes. Look at the three `layout-shell-*.png` screenshots.

- [ ] **Step 8: Review Focus 2 and 4**

Extend `shell` with two checks:

1. **Resize while recording (Review Focus 2).**
   - At 1440×900, start a recording through the store. Find the action with `grep -n "startRecording\|setRecording\|isRecording" src/stores/recordingStore.ts` and use it.
   - Resize the viewport to 960×1200, wait 600 ms, then resize to 2560×1080 and wait 600 ms.
   - Assert that the recording is still active, that `document.querySelector('[data-stage-frame] canvas')` is the same element as before (the canvas was not remounted), and that there were no console errors.
   - Stop the recording.
2. **Source None (Review Focus 4).** With the media source set to None, assert that the `data-stage-frame` box has a 16:9 ratio (±0.02) and that no readout text contains `NaN` or `undefined`.

- [ ] **Step 9: Build, lint, commit**

```bash
git add src/components/performance/layout.css src/components/performance/StageArea.tsx src/components/performance/Dock.tsx src/components/performance/PerformanceLayout.tsx
git commit -m "feat: responsive stage shell — grid areas, 3 breakpoints, framed output with HUD readouts"
```

---

### Task 3: Chain panel (replaces card stack + tab rail)

**Files:**
- Create: `src/components/performance/ChainPanel.tsx`
- Modify: `src/components/performance/PerformanceLayout.tsx` (render `<ChainPanel />` in the chain area)
- Delete: `src/components/performance/EffectCardStack.tsx` and `src/components/sequencer/SharedEffectTabsBar.tsx`, once `grep -rn` confirms there are no other importers. Keep `EffectTabsBar.tsx` if anything else imports it, and delete it otherwise.
- Modify: `.superpowers/sdd/layout-check.mjs` (add the `chain` mode)

**Interfaces:**
- **Consumes:**
  - `useActiveEffects()` → `{ sortedEffects: { id, label, color, primaryValue, primaryLabel }[] }`
  - `useUIStore` → `selectedEffectId`, `setSelectedEffect`, `setStatusText`
  - `useEffectSequencerStore` → `ensureTrack`, `removeTrack`
  - `useRoutingStore` → `effectOrder`, `reorderEffect(fromIndex, toIndex)`
  - `useGlitchEngineStore` → `bypassActive`, `setBypassActive`, `effectBypassed`, `toggleEffectBypassed`
  - `useEffectDisable()` → `{ disableEffect }`
  - `EffectParameters_v2({ effectId })` from `./ExpandedParameterPanel_v2`
  - `TrackAudioReactivePanel({ effectId })` from `../sequencer/TrackAudioReactivePanel`
  - `getUIStatusText` from `../../config/statusDescriptions`
- **Produces:** `<ChainPanel />`. Each row has the attributes `data-chain-row={id}` and `data-selected`. The Clear-all button has `data-chain-clear` and the Bypass-all button has `data-chain-bypass`.

- [ ] **Step 1: Write the failing check**

Add a `chain` mode. Enable three effects through their stores: VOXEL via `useSegStore().setVoxelEnabled(true)`, plus CRYSTL and KALEID via `useTrendStore` `setCrystallizeEnabled`/`setKaleidoscopeEnabled`. Then assert:

```js
if (MODE === 'chain') {
  await open(1440, 900)
  const enable = () => p.evaluate(async () => {
    const seg = (await import('/src/stores/segStore.ts')).useSegStore.getState()
    const tr = (await import('/src/stores/trendStore.ts')).useTrendStore.getState()
    seg.setVoxelEnabled(true); tr.setCrystallizeEnabled(true); tr.setKaleidoscopeEnabled(true)
  })
  await enable(); await wait(500)
  const rows = await p.$$eval('[data-chain-row]', (els) => els.map((e) => e.getAttribute('data-chain-row')))
  say('chain lists active effects in order', JSON.stringify(rows.slice().sort()) === JSON.stringify(['crystallize', 'kaleidoscope', 'seg_voxel'].sort()))
  const st = () => p.evaluate(async () => {
    const ui = (await import('/src/stores/uiStore.ts')).useUIStore.getState()
    const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState()
    const rt = (await import('/src/stores/routingStore.ts')).useRoutingStore.getState()
    const gl = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState()
    return { sel: ui.selectedEffectId, tracks: Object.keys(seq.tracks), order: rt.effectOrder.filter((i) => ['crystallize', 'kaleidoscope', 'seg_voxel'].includes(i)), bypass: gl.bypassActive, voxBypassed: !!gl.effectBypassed.seg_voxel }
  })
  let s = await st()
  say('auto-selects an active effect', rows.includes(s.sel))
  say('ensures a sequencer track per active effect', ['crystallize', 'kaleidoscope', 'seg_voxel'].every((i) => s.tracks.includes(i)))
  // click selects
  const rowBox = async (id) => (await p.$(`[data-chain-row="${id}"]`)).boundingBox()
  let bx = await rowBox('kaleidoscope'); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(200)
  s = await st(); say('clicking a row selects it', s.sel === 'kaleidoscope')
  say('settings render for the selected effect', await p.$eval('[data-chain-settings]', (e) => e.getAttribute('data-chain-settings')) === 'kaleidoscope')
  // per-row bypass
  await p.click('[data-chain-row="seg_voxel"] [data-row-bypass]'); await wait(150)
  s = await st(); say('row bypass toggles effectBypassed', s.voxBypassed === true)
  await p.click('[data-chain-row="seg_voxel"] [data-row-bypass]'); await wait(150)
  // bypass all
  await p.click('[data-chain-bypass]'); await wait(150); s = await st(); say('bypass-all sets bypassActive', s.bypass === true)
  await p.click('[data-chain-bypass]'); await wait(150)
  // double-click removes (disable + removeTrack)
  bx = await rowBox('crystallize'); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2, { clickCount: 2 }); await wait(300)
  s = await st(); say('double-click removes effect + its track', !s.tracks.includes('crystallize') && !(await p.$('[data-chain-row="crystallize"]')))
  // clear all
  await p.click('[data-chain-clear]'); await wait(300)
  say('clear-all removes every row', (await p.$$('[data-chain-row]')).length === 0)
}
```

- [ ] **Step 2: Run it to verify it fails**

Run the `chain` mode. Expected: FAIL, because there are no `data-chain-row` elements.

- [ ] **Step 3: Create `ChainPanel.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { EffectParameters_v2 } from './ExpandedParameterPanel_v2'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'

/**
 * Right column: the effect chain (signal order, top → bottom) and the selected
 * effect's settings + audio band. Owns what the old left tab rail did:
 * selection, auto-select, ensureTrack per active effect, drag reorder,
 * per-effect bypass, double-click remove, clear-all and bypass-all.
 */
export function ChainPanel() {
  const { sortedEffects } = useActiveEffects()
  const { selectedEffectId, setSelectedEffect, setStatusText } = useUIStore()
  const ensureTrack = useEffectSequencerStore((s) => s.ensureTrack)
  const removeTrack = useEffectSequencerStore((s) => s.removeTrack)
  const { effectOrder, reorderEffect } = useRoutingStore()
  const { bypassActive, setBypassActive, effectBypassed, toggleEffectBypassed } = useGlitchEngineStore()
  const { disableEffect } = useEffectDisable()

  const ids = useMemo(() => sortedEffects.map((e) => e.id), [sortedEffects])

  // Every active effect gets a sequencer track (was SharedEffectTabsBar)
  useEffect(() => { for (const id of ids) ensureTrack(id) }, [ids, ensureTrack])

  // Keep a valid selection (was SharedEffectTabsBar)
  useEffect(() => {
    if (selectedEffectId && !ids.includes(selectedEffectId)) setSelectedEffect(ids[0] ?? null)
    else if (!selectedEffectId && ids.length > 0) setSelectedEffect(ids[0])
  }, [ids, selectedEffectId, setSelectedEffect])

  // Drag reorder: same semantics as EffectTabsBar (drop above/below a row, or at the end)
  const dragged = useRef<string | null>(null)
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null)
  const drop = useCallback((targetId: string, after: boolean) => {
    const src = dragged.current
    dragged.current = null
    setOver(null)
    if (!src || src === targetId) return
    const from = effectOrder.indexOf(src)
    let to = targetId === '__end__' ? effectOrder.length - 1 : effectOrder.indexOf(targetId) + (after ? 1 : 0)
    if (targetId !== '__end__' && from < to) to--
    if (from !== -1 && to >= 0 && from !== to) reorderEffect(from, to)
  }, [effectOrder, reorderEffect])

  const remove = useCallback((id: string) => { disableEffect(id); removeTrack(id) }, [disableEffect, removeTrack])
  const selected = selectedEffectId && ids.includes(selectedEffectId) ? selectedEffectId : null

  return (
    <>
      <div className="flex items-baseline gap-2.5 px-3.5 py-2.5 rule-b flex-shrink-0">
        <span className="hud-label" style={{ color: 'var(--text-secondary)' }}>Chain</span>
        <span className="hud-label" style={{ letterSpacing: '.06em', textTransform: 'none' }}>signal flows top → bottom</span>
        <span className="flex-1" />
        <button data-chain-bypass className="hud-label px-2 py-1" title="Bypass all effects"
          style={{ border: `1px solid ${bypassActive ? 'var(--danger)' : 'var(--border-emphasis)'}`, color: bypassActive ? 'var(--danger)' : 'var(--text-secondary)' }}
          onClick={() => setBypassActive(!bypassActive)}
          onMouseEnter={() => setStatusText(getUIStatusText('bypassAll'))} onMouseLeave={() => setStatusText(null)}>Bypass</button>
        <button data-chain-clear className="hud-label px-2 py-1" title="Clear all effects" disabled={ids.length === 0}
          style={{ border: '1px solid var(--border-emphasis)', color: 'var(--text-secondary)', opacity: ids.length ? 1 : 0.4 }}
          onClick={() => { for (const id of ids) remove(id) }}
          onMouseEnter={() => setStatusText(getUIStatusText('clearAll'))} onMouseLeave={() => setStatusText(null)}>Clear</button>
      </div>

      {sortedEffects.length === 0 ? (
        <p className="px-3.5 py-3.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          <b style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Click an effect</b> in the grid to add it to the end of the chain.
        </p>
      ) : (
        <div className="flex-shrink-0">
          {sortedEffects.map((e, i) => {
            const isSel = e.id === selected
            const isBypassed = !!effectBypassed[e.id]
            const marker = over?.id === e.id ? (over.after ? 'inset 0 -2px 0 var(--text-primary)' : 'inset 0 2px 0 var(--text-primary)') : undefined
            return (
              <div key={e.id} data-chain-row={e.id} data-selected={isSel || undefined}
                draggable
                onDragStart={(ev) => { dragged.current = e.id; ev.dataTransfer.effectAllowed = 'move' }}
                onDragOver={(ev) => { ev.preventDefault(); const r = ev.currentTarget.getBoundingClientRect(); setOver({ id: e.id, after: ev.clientY > r.top + r.height / 2 }) }}
                onDragLeave={() => setOver(null)}
                onDrop={(ev) => { ev.preventDefault(); drop(e.id, over?.after ?? false) }}
                onDragEnd={() => { dragged.current = null; setOver(null) }}
                onClick={() => setSelectedEffect(e.id)}
                onDoubleClick={() => remove(e.id)}
                className={`grid items-center gap-2.5 px-3.5 py-2.5 rule-b cursor-pointer ${isSel ? 'surface-raised-row' : ''}`}
                style={{ gridTemplateColumns: '18px 1fr auto auto', boxShadow: marker, opacity: isBypassed ? 0.45 : 1 }}>
                <span className="hud-label" style={{ letterSpacing: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="flex items-center gap-2 text-[12px] truncate" style={{ letterSpacing: '.08em', color: 'var(--text-primary)' }}>
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: e.color, boxShadow: isBypassed ? 'none' : `0 0 6px ${e.color}` }} />
                  <span className="truncate" title={e.label}>{e.label}</span>
                </span>
                <span className="hud-label" style={{ letterSpacing: '.06em' }}>{e.primaryLabel} <b className="hud-value" style={{ fontWeight: 500 }}>{e.primaryValue}</b></span>
                <button data-row-bypass title={isBypassed ? 'Un-bypass' : 'Bypass'} className="hud-label px-1.5"
                  onClick={(ev) => { ev.stopPropagation(); toggleEffectBypassed(e.id) }}
                  style={{ color: isBypassed ? 'var(--text-primary)' : 'var(--text-muted)' }}>{isBypassed ? 'OFF' : 'ON'}</button>
              </div>
            )
          })}
          <div onDragOver={(ev) => ev.preventDefault()} onDrop={(ev) => { ev.preventDefault(); drop('__end__', true) }} style={{ height: 10 }} />
          <p className="px-3.5 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>Drag to reorder · double-click to remove.</p>
        </div>
      )}

      {selected ? (
        <div data-chain-settings={selected} className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: 8 }}><EffectParameters_v2 effectId={selected} /></div>
          <div style={{ borderTop: '1px solid var(--border)' }}><TrackAudioReactivePanel effectId={selected} /></div>
        </div>
      ) : (
        sortedEffects.length > 0 && (
          <p className="px-3.5 py-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>Select an effect in the chain to edit it.</p>
        )
      )}
    </>
  )
}
```

Before writing the file, check these points:
- **Hook names.** Confirm `setStatusText` lives on `useUIStore`, and that `effectBypassed` and `toggleEffectBypassed` live on `useGlitchEngineStore`. Use grep for both.
- **`getUIStatusText` keys.** Confirm `'bypassAll'` and `'clearAll'` exist. The old rail used them, so they should.
- **Rail behaviours.** Copy anything else the old rail's `EffectTabsBar` did into `ChainPanel`, for example solo or mute indicators, if the row needs them to stay functional, and list each one in the report. Find them with `grep -n "onClick\|onDoubleClick\|onContextMenu" src/components/sequencer/EffectTabsBar.tsx`. In particular, check what a plain click on a tab did at lines ~40-43; it may toggle bypass with a modifier key. Preserve any modifier behaviour on the row.

- [ ] **Step 4: Mount it and delete the old components**

1. In `PerformanceLayout`, replace `<EffectCardStack />` with `<ChainPanel />`.
2. Check for other importers with `grep -rn "EffectCardStack\|SharedEffectTabsBar\|EffectTabsBar" src`.
3. Delete each file that no longer has an importer, and note each deletion in the report.

`PresetDropdownBar` lived inside `EffectCardStack`. Task 4 moves it to the header. Until then, render it at the top of `ChainPanel`'s header row so presets stay reachable. Task 4 removes it from there.

- [ ] **Step 5: Run the check to verify it passes, plus Review Focus 5**

Run the `chain` mode on a fresh server and expect PASS. Then extend the mode to drag the first row onto itself, and assert the order is unchanged. Drag it into the end zone, and assert it is last.

- [ ] **Step 6: Review Focus 1**

Extend the mode with the selected effect being disabled:
1. Select VOXEL, then disable every effect through the stores.
2. Assert that the "Click an effect" empty state is shown.
3. Assert that `[data-chain-settings]` is absent.
4. Assert there are no console errors.

- [ ] **Step 7: Review Focus 3**

Enable 12 effects. Assert that the `chain` area scrolls internally: its `scrollHeight` exceeds its `clientHeight`, `document.documentElement.scrollHeight ≤ innerHeight + 1` at 1440×900, and the Stage area height is unchanged within 2 px.

- [ ] **Step 8: Build, lint, commit**

```bash
git add src/components/performance/ChainPanel.tsx src/components/performance/PerformanceLayout.tsx
git rm src/components/performance/EffectCardStack.tsx src/components/sequencer/SharedEffectTabsBar.tsx   # only those confirmed unused
git commit -m "feat: chain panel — rows, reorder, bypass, remove, clear-all; settings + audio band for the selection"
```

---

### Task 4: Effects column, bank grid, header presets

**Files:**
- Create: `src/components/performance/EffectsColumn.tsx`
- Modify: `src/components/performance/BankPanel.tsx`. In its returned JSX, replace the two `CornerFrame` rows that use fixed `width: 48` buttons with one 6-slot grid.
- Modify: `src/components/performance/PerformanceGrid.tsx`. Add `className="seg-page-tabs"` to the page-tab row container, the `flex items-center gap-0.5` div that maps `PAGE_NAMES`.
- Modify: `src/components/performance/layout.css`. Add the container-query rules for the tabs.
- Modify: `src/components/performance/HeaderBar.tsx`. Host `PresetDropdownBar`, and add `seg-hide-narrow` to secondary fields.
- Modify: `src/components/performance/ChainPanel.tsx`. Remove the temporary `PresetDropdownBar`.
- Modify: `src/components/performance/PerformanceLayout.tsx`. Render `<EffectsColumn />`.
- Modify: `.superpowers/sdd/layout-check.mjs`. Add the `effects` mode.

**Interfaces:**
- Consumes: `PerformanceGrid`, `BankPanel`, `MiddleSection`, `PresetLibraryPanel({ canvasRef? })`, `PresetDropdownBar({ canvasRef? })`.
- Produces: `<EffectsColumn canvasRef={…} />`. The bank grid buttons have `data-bank-slot`.

- [ ] **Step 1: Write the failing check**

Add an `effects` mode. Run it at all three sizes, and also force the effects column narrower at laptop by setting the viewport to 1180×800.

```js
if (MODE === 'effects') {
  for (const [w, h] of [[1440, 900], [2560, 1080], [960, 1200], [1180, 800]]) {
    await open(w, h)
    const r = await p.evaluate(() => {
      const col = document.querySelector('[data-area="effects"]')
      const clipped = [...col.querySelectorAll('button, [role="tab"], span')].filter((el) => el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent.trim())
      const slots = [...document.querySelectorAll('[data-bank-slot]')].map((el) => el.getBoundingClientRect())
      const overlap = slots.some((a, i) => slots.some((b2, j) => j > i && a.left < b2.right - 0.5 && b2.left < a.right - 0.5 && a.top < b2.bottom - 0.5 && b2.top < a.bottom - 0.5))
      const tabs = [...document.querySelectorAll('.seg-page-tabs > *')].map((el) => el.getBoundingClientRect())
      const tabOverlap = tabs.some((a, i) => tabs.some((b2, j) => j > i && a.left < b2.right - 0.5 && b2.left < a.right - 0.5 && a.top < b2.bottom - 0.5 && b2.top < a.bottom - 0.5))
      const tabsVisible = tabs.length === 6 && tabs.every((t) => t.right <= col.getBoundingClientRect().right + 1)
      const presetsInHeader = !!document.querySelector('[data-area="header"] [data-preset-dropdown]')
      return { clipped, overlap, slots: slots.length, tabOverlap, tabsVisible, presetsInHeader }
    })
    say(`${w}: no clipped labels in effects column`, r.clipped.length === 0)
    if (r.clipped.length) console.log('   clipped:', r.clipped.slice(0, 8))
    say(`${w}: 6 bank slots, no overlap`, r.slots === 6 && !r.overlap)
    say(`${w}: all 6 page tabs visible, no overlap`, r.tabsVisible && !r.tabOverlap)
    say(`${w}: preset picker in header`, r.presetsInHeader)
  }
}
```

The `data-preset-dropdown` attribute is added to the `PresetDropdownBar` root in this task. The attribute is presentational, so it is safe to add.

- [ ] **Step 2: Run it to verify it fails**

Expected: FAIL. The cause is clipped tabs or labels and/or overlapping bank buttons at 1180 px, plus the preset picker not being in the header.

- [ ] **Step 3: Bank grid**

In `BankPanel.tsx`'s returned JSX, render the four bank buttons, then RANDOM (if present), UNDO and REKT, as children of one grid:

```tsx
<div className="h-full w-full grid items-center" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) repeat(2, minmax(0, 1.3fr))', gap: 6, padding: '8px 14px' }}>
  {/* each bank button / UNDO / REKT: wrap in <span data-bank-slot className="h-full min-w-0"> … </span> and change width: 48 → width: '100%' */}
</div>
```

Keep every handler, title, disabled state, long-press or save behaviour and status-text hover exactly as it is. Only the container and the widths change.

If there is a RANDOM button as well, which makes 7 controls, use `repeat(4, minmax(0,1fr)) repeat(3, minmax(0,1.2fr))` instead. The check then expects 7 slots, so update `r.slots === 6` to match the real count and note it in the report.

Remove the `CornerFrame` wrappers. They are decorative rounded frames, which the spec bans as cards. Delete their import if it becomes unused.

- [ ] **Step 4: Page tabs wrap via container query**

Append to `layout.css`:

```css
/* Effects column: page tabs never clip; 6 across when wide, 3×2 when narrow */
.seg-page-tabs { display: grid !important; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 2px !important; width: 100%; }
.seg-page-tabs > * { justify-content: center; min-width: 0; letter-spacing: .06em !important; }
@container (max-width: 330px) { .seg-page-tabs { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
```

Add `seg-page-tabs` to the tab row's className in `PerformanceGrid.tsx`, keeping its existing classes. Make the outer centring wrapper (`flex items-center justify-center mb-1.5 px-1`) full width by adding `w-full`.

- [ ] **Step 5: `EffectsColumn.tsx`**

```tsx
import { PerformanceGrid } from './PerformanceGrid'
import { BankPanel } from './BankPanel'
import { MiddleSection } from './MiddleSection'
import { PresetLibraryPanel } from '../presets/PresetLibraryPanel'

/** Left column: effect pages + grid, bank slots, crossfader, then the preset library (fills + scrolls). */
export function EffectsColumn({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <>
      <div className="flex items-baseline gap-2.5 px-3.5 py-2.5 rule-b flex-shrink-0">
        <span className="hud-label" style={{ color: 'var(--text-secondary)' }}>Effects</span>
      </div>
      <div className="flex-shrink-0" style={{ height: 'clamp(240px, 38vh, 380px)' }}><PerformanceGrid /></div>
      <div className="flex-shrink-0 rule-b" style={{ height: 52 }}><BankPanel /></div>
      <div className="flex-shrink-0 rule-b" style={{ minHeight: 'var(--row-middle)' }}><MiddleSection /></div>
      <div className="flex-1 min-h-0 overflow-y-auto"><PresetLibraryPanel canvasRef={canvasRef} /></div>
    </>
  )
}
```

The grid height is fixed by a clamp, not by the old constant 224 px. That stops it eating the whole column on tall ultrawide screens, while the presets library absorbs the remaining height. In `PerformanceLayout`, replace the effects block with `<EffectsColumn canvasRef={canvasRef} />`, passing the same ref type the preset components expect.

- [ ] **Step 6: Header hosts presets; no clipping**

In `HeaderBar.tsx`:
1. Render `<PresetDropdownBar canvasRef={…} />`, or without the prop if the header has no ref, in the header row after the audio source picker. Add `data-preset-dropdown` to `PresetDropdownBar`'s root element.
2. Add `seg-hide-narrow` to secondary header items, meaning anything other than the logo, the video and audio pickers, and REC.
3. Make the row `min-w-0` so the remaining items never clip.

Also remove the temporary `PresetDropdownBar` from `ChainPanel`.

- [ ] **Step 7: Run the check to verify it passes**

Run the `effects` mode on a fresh server. Expected: PASS at all four sizes. Re-run the `shell` and `chain` modes too.

- [ ] **Step 8: Build, lint, commit**

```bash
git add src/components/performance/EffectsColumn.tsx src/components/performance/BankPanel.tsx src/components/performance/PerformanceGrid.tsx src/components/performance/layout.css src/components/performance/HeaderBar.tsx src/components/performance/ChainPanel.tsx src/components/performance/PerformanceLayout.tsx src/components/presets/PresetDropdownBar.tsx
git commit -m "feat: effects column — wrapping page tabs, 6-slot bank grid, preset library; presets in header"
```

---

### Task 5: Dock behaviour

**Files:**
- Modify: `src/components/performance/Dock.tsx`
- Modify: `.superpowers/sdd/layout-check.mjs` (`dock` mode)

**Interfaces:**
- Consumes: `useActiveEffects()` (track count = active effects), `SequencerContainer`, `BottomPanel`.
- Produces: the Dock root has `data-dock-empty` when there are no tracks.

- [ ] **Step 1: Write the failing check**

```js
if (MODE === 'dock') {
  await open(1440, 900)
  const dockH = () => p.$eval('[data-area="dock"]', (e) => e.getBoundingClientRect().height)
  const empty0 = await dockH()
  const emptyFlag = await p.$('[data-dock-empty]')
  say('empty: dock collapses (≤ 140px) and shows the teaching hint', empty0 <= 140 && !!emptyFlag && (await p.$eval('[data-area="dock"]', (e) => e.textContent.includes('get a lane automatically'))))
  await p.evaluate(async () => { const s = (await import('/src/stores/segStore.ts')).useSegStore.getState(); s.setVoxelEnabled(true); s.setMatterEnabled(true) })
  await wait(400); const two = await dockH()
  await p.evaluate(async () => { const t = (await import('/src/stores/trendStore.ts')).useTrendStore.getState(); for (const k of ['setCrystallizeEnabled', 'setKaleidoscopeEnabled', 'setRippleWarpEnabled', 'setFractalDomainEnabled', 'setLiquidMorphEnabled', 'setThermalEnabled', 'setHalationEnabled', 'setDreamcoreEnabled', 'setY2kEnabled', 'setAnamorphicEnabled']) t[k]?.(true) })
  await wait(400); const many = await dockH()
  say('dock grows with tracks', two > empty0 && many >= two)
  say('dock capped at 34vh', many <= 900 * 0.34 + 2)
  say('page does not scroll at laptop', await p.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1))
}
```

- [ ] **Step 2: Run it to verify it fails**

Expected: FAIL, because the empty dock is taller than 140 px and has no hint.

- [ ] **Step 3: Implement**

```tsx
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { BottomPanel } from './BottomPanel'
import { useActiveEffects } from '../../hooks/useActiveEffects'

/** Sequencer + modulation tabs. Height follows track count (capped by layout.css); collapses when empty. */
export function Dock() {
  const { sortedEffects } = useActiveEffects()
  const empty = sortedEffects.length === 0
  return (
    <div className="flex flex-col h-full min-h-0" data-dock-empty={empty || undefined}>
      {empty ? (
        <p className="px-3.5 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>Effects you enable get a lane automatically.</p>
      ) : (
        <div className="min-h-0 overflow-y-auto" style={{ flex: '0 1 auto' }}>
          <SequencerContainer hideTabsBar />
        </div>
      )}
      <div className="flex-shrink-0" style={{ marginTop: 'auto' }}>
        <BottomPanel />
      </div>
    </div>
  )
}
```

If `SequencerContainer` forces `height: 100%` internally, so the dock can't size to its content, find the root style with `grep -n "h-full\|height: '100%'" src/components/sequencer/SequencerContainer.tsx src/components/sequencer/UnifiedSequencerPanel.tsx | head`. Then give the container a prop or class that lets it size to its content when docked. Keep the change minimal and note it in the report.

On ultrawide, the dock is a full-height column (`layout.css` sets `max-height: none`). There the sequencer area should fill: use `flex: 1 1 auto` when `matchMedia('(min-width: 2200px)')` matches. A CSS rule is preferred, because it avoids JS:

```css
@media (min-width: 2200px) { .seg-shell > [data-area="dock"] > div > .min-h-0 { flex: 1 1 auto !important; } }
```

Add it to `layout.css`, or use a dedicated class such as `seg-dock-seq` on the sequencer wrapper div and target that instead. A dedicated class is cleaner.

- [ ] **Step 4: Run the check to verify it passes**

Run the `dock` mode on a fresh server. Expected: PASS. Re-run `shell`.

- [ ] **Step 5: Review Focus 3 (16 tracks)**

The `dock` mode's 12-effect step already exercises scrolling. Add one assertion: when `scrollHeight > clientHeight`, the dock's sequencer wrapper is scrollable (`overflowY` is `auto`) and the stage height is unchanged within 2 px compared with the two-track state.

- [ ] **Step 6: Build, lint, commit**

```bash
git add src/components/performance/Dock.tsx src/components/performance/layout.css
git commit -m "feat: dock sizes to its tracks (capped), collapses with a hint when empty"
```

---

### Task 6: Screenshots vs mockup, regressions, resize, contrast

**Files:**
- Modify: `.superpowers/sdd/layout-check.mjs` (`shots` and `resize` modes)

- [ ] **Step 1: Add the `shots` mode**

For each size (laptop, ultrawide, narrow) × state:
- **empty:** a fresh load.
- **populated:** load the SEG_EXP factory preset via `usePresetLibraryStore.getState().loadFromDB()` and then `loadPreset('factory_seg_exp')`. Also set the media source to the reference reel fixture so the output has content (`.superpowers/sdd/fixtures/seg-exp-28-reference.mp4`, loaded the same way `seg-verify.mjs` `loadFixture` does).

Save each screenshot as `.superpowers/sdd/shots/final-<size>-<state>.png`. Then build side-by-side sheets with ffmpeg: `hstack` of the mockup `docs/superpowers/specs/assets/2026-10-06-stage-layout/A-<size>.png` and `final-<size>-populated.png`, scaled to the same height, written to `.superpowers/sdd/shots/compare-<size>.png`.

- [ ] **Step 2: Add the `resize` mode (live reflow)**

1. At 960×1200, with the populated state, start recording.
2. Step the viewport width through 960, 1100, 1440, 2200 and 2560, waiting 400 ms at each.
3. Assert there are no console errors, the canvas element is the same node throughout, the recording is still active, and the `shell` placement assertions hold at the end width.

- [ ] **Step 3: Run everything**

Use a fresh server before each run. Run the layout modes `tokens`, `shell`, `chain`, `effects`, `dock`, `resize` and `shots`. Then run the regressions:
- `node .superpowers/sdd/seg-verify.mjs wiring`
- `node .superpowers/sdd/bands-check.mjs ui`
- `node .superpowers/sdd/bands-check.mjs gate`
- `node .superpowers/sdd/bands-check.mjs mod`

For the regressions, update any selectors broken by the moved components. Because `TrackAudioReactivePanel` now lives in the chain panel and not behind the bottom tab, `bands-check ui` must open it by selecting the chain row instead of `bottomPanelTab: 'Audio'`. If the bottom tab still renders it too, both paths are fine. Record any harness edits in the report.

All runs must PASS. If the known flake "Protocol error: Promise was collected" appears, re-run once and note it.

- [ ] **Step 4: Gates**

`npm run build` must exit 0. eslint must be clean on the new files, with no new problems in modified files compared with the branch base `d63d2c2`.

- [ ] **Step 5: Hand over the comparison sheets**

List the paths of the three `compare-*.png` sheets in the report, for human review before merge. Do not commit screenshots.

---

## Self-Review Notes

**Spec coverage:**

| Spec item | Covered by |
|---|---|
| Areas and breakpoints | T2 |
| Effects column | T4 |
| Stage | T2 |
| Chain + settings | T3 |
| Dock | T2 (first version), T5 |
| Header | T4 |
| Removed rail | T3 |
| Visual tokens and type tiers | T1 |
| HUD frame | T1 utilities, T2 readouts |
| Empty states | T3 (chain, settings), T5 (dock) |
| Contrast | T1 |
| Motion | No new motion is added. State changes reuse the existing classes. |
| Test 1, layout | T2, T4 |
| Test 2, overlaps | T4 |
| Test 3, screenshots | T6 |
| Test 4, regressions | T6 |
| Test 5, live resize | T2, T6 |
| Test 6, contrast | T1 |

**Lookups that the plan asks the implementer to confirm.** Each one names the grep to run and what to do with the result:
- the `Canvas` ref style;
- the recording store's start and stop actions;
- `EffectTabsBar`'s click and modifier behaviour;
- the extra RANDOM bank button;
- the font variable;
- `SequencerContainer`'s root height.

**Type consistency.** These names are used identically across T2–T6: `data-area`, `data-stage-frame`, `data-chain-row`, `data-chain-settings`, `data-row-bypass`, `data-chain-clear`, `data-chain-bypass`, `data-bank-slot`, `data-preset-dropdown`, `data-dock-empty`, `.seg-shell`, `.seg-page-tabs` and `.seg-hide-narrow`.
