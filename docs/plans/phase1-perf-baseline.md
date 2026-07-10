# Phase 1 perf baseline (before)

Stack: RGB split + Echo Trail + Pixel Sort + TAR, source: static image
`anima-morph/IMG_9153.PNG` (1260x2736 portrait PNG) loaded via VIDEO > File,
window ~2560x1440 (canvas render target 657x1161).

- pipeline idle (image loaded, 0 effects): avg 0.053 ms, max 0.115 ms, fps ~18800
- pipeline stack (RGB+TAR+ECHO+SORT): avg 0.095 ms, max 0.140 ms, fps ~10500
  (second sample: avg 0.099 ms, max 0.165 ms — treat ~0.10 ms avg as the number)
- knob drag (RGB AMT, 10s continuous mouse drag, value sweeping 0-5): avg 0.115 ms
  (in-drag samples 0.106-0.130 ms), max spike 0.85 ms, fps ~8700

**Reproducibility note:** this baseline is a *static-image* scenario — browser
window 2560x1440 (viewport), source = `anima-morph/IMG_9153.PNG` via the File
source, canvas 657x1161 — any future before/after comparison must reproduce
exactly this setup. (1280x800 was tried first but this app's grid layout gives
the canvas column only ~107 px at that width with this portrait image, i.e. no
meaningful shader work; 2560x1440 yields canvas clientWidth 657 > 500 and the
effects were confirmed visibly rendering.)

## Measurement notes

- Numbers come from `perfMonitor.getStats()` (the module added in Task 1),
  read in-page via Vite's module graph (`import('/src/utils/perfMonitor.ts')`
  returns the same instance the render loop records into). The StatusBar
  readout agreed with the raw stats at capture time (`0.1ms · 10531fps`).
- The metric is CPU-side `pipeline.render()` duration (WebGL command
  submission), per the task brief — GPU execution is asynchronous and is not
  captured by this monitor. Sub-millisecond values are therefore expected;
  what matters for Tasks 2-8 is the relative before/after delta of this
  number under the exact scenario above.
- Enabling the 4-effect stack roughly doubles CPU-side submission cost vs
  idle (0.053 -> ~0.10 ms avg) and drops the idle-frame headroom fps
  (~18800 -> ~10500).
- Observed during the knob drag (not a pipeline number, but relevant to later
  perf tasks): main-thread mousemove handling was very slow — a scripted
  drag loop targeting ~60 moves/s only achieved ~4 moves/s (43 moves in 10 s),
  i.e. each pointer move triggers a long main-thread task (React re-render
  chain), and pipeline max spiked to 0.85 ms during the drag.

## After Task 4 (param sync moved to zustand subscriptions)

Same scenario as above (RGB+TAR+ECHO+SORT stack, `anima-morph/IMG_9153.PNG`
via File source, 2560x1440 viewport). Measured via Playwright driving
synthetic pointer events at the RGB card's AMT knob (`DragNumberBlock`), same
`perfMonitor.getStats()` method.

- pipeline stack idle (RGB+TAR+ECHO+SORT, no drag): avg 0.108 ms, max 0.150 ms, fps ~9280
- knob drag (RGB AMT, 10s continuous pointer drag, ~60 moves/s target): avg 0.108 ms,
  max 0.155 ms, fps ~9234 — **indistinguishable from idle**, confirming the
  structural `useEffect` (now slimmed to enable/disable/reorder only, gated by
  Task 2's short-circuit) no longer re-runs per param change. Before Task 4:
  avg 0.115 ms with a 0.85 ms max spike during the same drag.
- Main-thread responsiveness during the drag loop also improved: the scripted
  ~60 moves/s driver achieved 155 moves in 10 s (~15.5 moves/s) vs. ~4 moves/s
  (43 moves in 10 s) before Task 4 — consistent with removing the ~300-line
  React re-render chain from the pointermove hot path. (Driver method changed
  from a real-mouse Playwright drag to direct `PointerEvent` dispatch to
  isolate the measurement from browser input-coalescing differences; the
  before/after relative delta is still the meaningful signal.)
- Functional parity spot-checked in-browser: RGB split knob drag, effect
  wet/dry mix drag (grid cell), crossfader Source/Processed snap, Datamosh
  params via the performance grid, and the destruction-mode max-datamosh
  override all still update the canvas live. Face HUD was enabled against the
  static-image source (no webcam in this environment) — MediaPipe face mesh
  initialized and ran per-frame with zero detections, no console errors, no
  crash; `faceHudParams` flow through `paramSync.ts`'s `pushMorph()` was
  confirmed by code review.

## After Task 6 (shared overlay readback)

Scope: `src/components/overlays/sharedReadback.ts` (new) — a single 960x540
`drawImage()` snapshot of the WebGL canvas per main-loop frame
(`advanceReadbackFrame()` called as the first line of `Canvas.tsx`'s
`animate()`), reused by `getSharedFrame()` in `StrandOverlay`, `AcidOverlay`
(both the pixel-read copy and the `preserveVideo` visible composite),
`StippleOverlay`, `AsciiRenderOverlay`, `VisionTrackingOverlay` (both its
box-filter source copy and its downsample copy), and `ContourOverlay` —
replacing each overlay's own independent per-frame `drawImage()` off the
live WebGL canvas.

Same scenario as the Task 4 entry (`anima-morph/IMG_9153.PNG` via File
source, 2560x1440 viewport, canvas render target 657x1161), stack = STRAND
TAR + ACID HALF + Stipple (the brief's designated 3-overlay stack; GLITCH
page hosts STIPPLE, ACID page hosts HALF, STRAND page hosts TAR — all three
enabled simultaneously).

**Method:** two measurements, before vs. after, each captured by
`git stash` / `git stash pop` on the Task 6 files to toggle between the
pre- and post-change code on the same running dev server, then reloading
and re-driving the identical Playwright sequence (File source load → enable
HALF → enable TAR → enable STIPPLE).

1. **`perfMonitor.getStats()` (GPU-pipeline submission time only, per Task 1's
   caveat — this does NOT include overlay readback cost, which happens
   outside `pipeline.render()`):**
   - Before: avg 0.077 ms, max 0.125 ms
   - After: avg 0.083 ms, max 0.130 ms
   - Indistinguishable within noise, as expected — this metric was never
     going to move for a main-thread-only optimization.

2. **rAF callback-to-callback interval, 5 s sample, main-thread total
   frame cost (includes overlay readback):**
   - Before: mean 43.45 ms (108 samples, ~23.0 fps)
   - After: mean 46.42 ms (116 samples, ~21.5 fps)
   - Also indistinguishable / within noise — too coarse a signal given
     Playwright CDP overhead and ~110-sample variance at this frame rate.

3. **Direct GPU-readback call count** (monkey-patched
   `CanvasRenderingContext2D.prototype.drawImage`, counting only calls whose
   source argument is the actual WebGL canvas — i.e. the sync GPU→CPU
   readback the task targets, as opposed to cheap canvas-to-canvas copies
   downstream of the shared snapshot), 3 s sample:
   - Before: 207 calls / 3 s = **69 GPU readbacks/sec** (3 overlays each
     forcing their own readback per rAF tick; ACID's `preserveVideo` path
     adds a second readback when active)
   - After: 59 calls / 3 s = **19.7 GPU readbacks/sec**
   - **~3.5x reduction**, consistent with collapsing 3 overlays' independent
     per-frame readbacks into one shared readback per main-loop tick
     (main-loop fps ≈ 20-23 per the rAF-interval numbers above, so the
     after-count roughly matches "1 readback per main-loop frame").
   This is the metric that actually demonstrates the fix — the other two
   are too coarse/noisy to show a main-thread-only win at this app's frame
   rate and sample size.

**Visual parity:** screenshots of the 3-overlay stack (STRAND TAR + ACID
HALF + Stipple) compared before/after — no visible difference; halftone dot
pattern, tar spread, and stipple particles all render identically. The
brief's `AcidOverlay.tsx:204` `preserveVideo` caveat (composited straight to
the visible canvas from the 960x540 shared snapshot instead of the raw
WebGL canvas) was verified in isolation (ACID HALF only, `preserveVideo`
toggled via direct store call since no UI control exists for it) — no
visible softening at 2560x1440 viewport scale; line 204 was left using
`getSharedFrame()` (no fallback to the raw source needed).

VISION BRIGHT tracking (`VisionTrackingOverlay`, both readback call sites at
~887 and ~891) verified working after the change — bounding boxes, labels,
and trail lines render correctly over bright regions with no console
errors.

## After Task 8 (PixelSort adaptive stride)

Final shader design (differs from the plan's first draft after visual-gate
iteration): loop 1 capped at 48 iterations (stride = streakLength*0.5/48),
main sort loop capped at 96 iterations with **adaptive stride** inside the
original's implicit search range (`min(streakLength, 128)` texels — the old
128-iteration cap doubled as a range clamp, which the first stride draft
wrongly removed, causing ghost-copy artifacts at the UI-max streak of 2000),
plus per-pixel ladder jitter and a `stride*0.75 + 1` texel match window.
Max stride is 128/96 = 1.33, sub-visible. Worst-case samples 201 -> 153
(48+96+8 +1 for loop-2's inclusive zero rung); output is sample-exact for
streakLength <= 96 and verified visually matching at 16 / 120 / 250 / 2000
(UI max per effectParams.ts). The plan's 32/48-iteration draft produced clearly visible
periodic scalloping at max streak and was rejected at the visual gate;
jitter alone and window-widening alone did not cure it.

Perf (same static-image scenario, streakLength 250, intensity 0.7):
- before: pipeline avg 0.073 ms / max 0.110 ms
- after (adaptive): avg 0.088 ms / max 0.145 ms
These CPU-side submission numbers do not discriminate (GPU execution is
async and unmeasured; deltas are run-to-run noise at this canvas size).
The change's benefit is bounded worst-case fragment ALU cost at high
resolution/DPR — a theoretical guarantee, not demonstrated in this
small-canvas scenario. Screenshot evidence: docs/plans/task8-screenshots/.

**Methodology warning for future measurement sessions:** driving zustand
stores via `browser_evaluate` dynamic imports SILENTLY FAILS after any HMR
invalidation — Vite serves the app a `?t=`-versioned module while the
un-versioned import creates a phantom second store instance. Restart the
dev server before store-driven measurement, or drive the real UI.

## After Phase 1 (final)

Full regression pass (Task 9) plus a final repeat of the Task 1 baseline
scenario on a freshly restarted dev server (clean module graph, no HMR
invalidation since restart — confirmed via console: zero `[vite] hmr`/reload
messages for the whole session). Same scenario as the original baseline:
`anima-morph/IMG_9153.PNG` via File source, 2560x1440 viewport, canvas
render target 657x1161.

**Regression pass:** enable/disable/reorder GLITCH RGB+CHROMA+POSTER
(including a sidebar drag-reorder of POSTER above RGB); knob drags on three
different pages (GLITCH RGB AMT, STRAND TAR THRSH, ACID HALF DOT — all via
real trusted Playwright mouse drags, see methodology note below); Echo
Trail off/on/off cycles (MOTION) and Datamosh off/on cycles (DESTROY); the
STRAND TAR + ACID HALF + GLITCH STIPPLE 3-overlay stack; crossfader sweep
(Source 0 -> Processed 100); bypass-all toggle on/off; solo on the TAR
sequencer track; and Face HUD with no webcam available (MediaPipe
initialized and ran — "Graph successfully started running" — zero
detections against the static image, no crash, no console errors beyond
the pre-existing key-spread warning below). **Zero new console errors**
across the entire pass. Every behavior matched expectations vs. master.

**Console audit:** all errors/warnings observed during the pass trace to
three pre-existing, phase-1-unrelated sources, verified by `git log` against
the `fbe2968^..1d69f56` commit range (this phase's 8 prior tasks):
1. A single shared "key prop spread" bug at
   `ExpandedParameterPanel_v2.tsx:179` (a `commonProps` object built with
   `key: param.id` then spread via `{...commonProps}` into whichever Block
   component the param-type switch renders) — present since the file's
   origin commit (`c80a031`, March 2026), untouched by any Phase 1 commit.
   Surfaces under different names (DragNumberBlock, ParamBlock,
   VerticalFaderBlock, BipolarBlock, RulerBlock, ButtonRowBlock) depending
   on which param types are visible, but it is one bug, not six.
2. Three browser `willReadFrequently` Canvas2D advisories
   (`tarSpreadEffect.ts`, `halftoneEffect.ts`, `StippleOverlay.tsx`) — the
   first two are in files never touched this phase; the third's
   `getImageData` call predates Task 6's change (Task 6 only changed what
   gets drawn *into* the offscreen canvas via the shared readback, not the
   subsequent local `getImageData` readback pattern — confirmed via
   `git show 7f7df9f`).
3. Expected MediaPipe WASM/GL initialization log lines when Face HUD is
   enabled (`Sets FaceBlendshapesGraph acceleration...`, `GL version...`,
   `OpenGL error checking is disabled`, `Graph successfully started
   running`) — informational, not errors.

**Perf numbers** (`perfMonitor.getStats()`, read in-page via Vite's module
graph immediately after confirming no HMR invalidation had occurred):

- pipeline idle (image loaded, 0 effects): avg 0.065 ms, max 0.125 ms, fps ~15400
- pipeline stack (RGB+TAR+ECHO+SORT): avg 0.102 ms, max 0.135-0.155 ms
  (two samples), fps ~9800
- knob drag (RGB AMT, real trusted mouse drags via Playwright — six
  alternating up/down drags sweeping the full 0-5 range over ~45s wall
  time, ~10s+ of active dragging — stats read immediately after the final
  drag): avg 0.105 ms, max 0.150 ms, fps ~9569 — **still indistinguishable
  from the idle-stack number**, confirming Task 4's fix holds after all
  subsequent phase-1 changes: the structural `useEffect` in `Canvas.tsx`
  does not re-run on param-only changes, so a live knob drag adds no
  measurable CPU-side submission cost beyond the stack's baseline.

These numbers land within noise of the "After Task 4" entry above (0.108 ms
idle-stack / 0.108 ms drag) — expected, since Tasks 5-8 targeted temporal
capture, overlay readback, and pixel-sort shader bounds, none of which touch
this scenario's per-frame `pipeline.render()` submission cost. The
cumulative phase-1 win visible in *this* metric is entirely the Task 2
(pass caching/short-circuit) and Task 4 (param-sync-off-the-hot-path)
work; Tasks 5-8's wins are on main-thread readback cost and worst-case
shader bounds, which this CPU-submission-only metric was never able to see
(documented at each task's entry above).

**Methodology note — synthetic `PointerEvent` dispatch does not work for
this app's knobs:** `DragNumberBlock`/`ParamBlock`-family controls use
`@use-gesture/react`, whose `pointerDown` handler calls
`element.setPointerCapture(event.pointerId)`. Browsers only register a
pointer as "active" (capturable) for events that originate from real
hardware/OS-level input — a `dispatchEvent(new PointerEvent(...))` from
page-context JS throws `NotFoundError: Failed to execute
'setPointerCapture' ... No active pointer with the given id is found`,
which aborts the gesture-start handler before it captures the drag's start
value or attaches move listeners, so every subsequent synthetic
`pointermove` is silently a no-op (no console error, no value change,
easy to miss). Verified by first confirming `dblclick` *does* work
(midpoint-snap value changed correctly), isolating the failure to the
drag path specifically. **Real interaction must go through Playwright's
`browser_drag` (CDP-level trusted input)**, not `browser_evaluate` +
synthetic events. Because `browser_drag` only accepts element references
(drags start-center to end-center, no arbitrary coordinate deltas), a
temporary absolutely-positioned 1x1-or-larger marker `div` (`z-index:
99999`, `pointer-events: auto`) placed at the desired pixel offset and
targeted by CSS id selector is a reliable way to get a real trusted drag
of a specific pixel delta on a specific control — used throughout this
task's regression pass and final knob-drag measurement.

## Phase 2 effect costs (Task 18 wrap-up)

Measured with Playwright MCP down, via puppeteer
(`.superpowers/sdd/task18-perf.mjs`), same reproducibility setup as every
entry above: `anima-morph/IMG_9153.PNG` via File source, 2560x1440
viewport, canvas render target 657x1161, fresh dev server (no HMR
invalidation), `perfMonitor.getStats()` read in-page via Vite's module
graph. First attempt at this measurement caught a shader-compile stall
inside the 120-frame ring buffer (max 112 ms on the baseline stack, avg
skewed to ~1.0 ms) — re-run with a 5 s warm-up before the first read and a
second read 3 s later to confirm the ring buffer had flushed the compile
spike.

**Baseline stack regression check** (RGB + TAR + ECHO + SORT, the same
stack as every prior entry in this doc — this is a pre-Phase-2 scenario,
confirming Phase 2's 16 new effects/stores/paramSync additions didn't
regress it):

- idle (image loaded, 0 effects): avg 0.063 ms, max 0.110 ms, fps ~15960
- stack (RGB+TAR+ECHO+SORT), sample 1 (5 s after enable): avg 0.138 ms, max 0.190 ms, fps ~7240
- stack, sample 2 (3 s later): avg 0.121 ms, max 0.175 ms, fps ~8230

In line with the "After Phase 1 (final)" entry above (avg 0.102 ms, max
0.135-0.155 ms, fps ~9800) — same order of magnitude, the small increase
sits within this metric's established run-to-run noise band (this doc's
own methodology note: "these CPU-side submission numbers do not
discriminate... deltas are run-to-run noise at this canvas size"). No
regression from Phase 2's additions.

**Per-effect solo cost** (each effect enabled alone at its default
params, all others off, 4 s warm-up before reading stats; values are
`perfMonitor.getStats()` — CPU-side `pipeline.render()` submission time
only, not GPU execution):

| effect | avg ms | max ms | fps |
|---|---|---|---|
| halation | 0.080 | 0.130 | 12468 |
| y2k_digicam | 0.082 | 0.130 | 12270 |
| thermal | 0.082 | 0.130 | 12264 |
| dreamcore | 0.081 | 0.140 | 12352 |
| anamorphic | 0.075 | 0.145 | 13252 |
| flow_smear | 0.109 | 0.155 | 9199 |
| feedback_tunnel | 0.088 | 0.135 | 11326 |
| opium_trails | 0.092 | 0.135 | 10825 |
| rutt_etra | 0.120 | 0.185 | 8336 |
| reaction_diffusion | 0.098 | 0.165 | 10200 |
| physarum | 0.119 | 0.230 | 8392 |
| kaleidoscope | 0.083 | 0.130 | 11982 |
| liquid_morph | 0.082 | 0.145 | 12152 |
| crystallize | 0.084 | 0.130 | 11846 |
| ripple_warp | 0.086 | 0.135 | 11645 |
| fractal_domain | 0.083 | 0.140 | 12036 |

All 16 effects land well under 0.25 ms avg (idle is ~0.06 ms, so every
effect's solo overhead is under ~0.17 ms CPU-side submission cost). The
priciest are `rutt_etra` (mesh-based scanline render) and `physarum`
(100k-agent GPGPU simulation, default agent count), followed by
`flow_smear` (temporal accumulation buffer) — all still sub-millisecond
and consistent with their category (WAVE-3 sims / WAVE-2 temporal costing
more than WAVE-1 single-pass shaders like halation/y2k/thermal/dreamcore/
anamorphic/kaleidoscope/liquid_morph/crystallize/ripple_warp/
fractal_domain, which cluster tightly around 0.08 ms). As with every
other entry in this doc, this metric is CPU submission time only — it
does not capture `physarum`'s or `reaction_diffusion`'s actual GPU
compute cost (async, unmeasured by this monitor), so these two numbers
understate their true rendering cost more than the single-pass shaders'
numbers do.

## Phase 3 (Task 15 wrap-up): STRAND/ACID GPU-readback elimination

**Goal restated:** Phase 3 ported all 27 STRAND/ACID Canvas-2D overlay
effects to GPU passes in `EffectPipeline`, eliminating their per-frame CPU
pixel loops (`getImageData`/`putImageData`) and the shared-readback
(`getSharedFrame()`) consumption those loops needed. `acid_decomp` stays
CPU by design (recursive variance quad-tree); `acid_cloud`/`acid_slit`/
`acid_voronoi` were already independent WebGL sub-effects, untouched by
this phase.

**Method:** same instrumentation as "After Task 6" above (monkey-patched
`CanvasRenderingContext2D.prototype.drawImage`, counting only calls whose
source is the actual WebGL canvas — i.e. a real GPU→CPU readback, not a
cheap canvas-to-canvas copy off the shared snapshot), 3 s sample after a
1.5 s warm-up. Scenario: STRAND TAR + ACID HALF + GLITCH STIPPLE (this
doc's standard 3-overlay stack), `anima-morph/IMG_9153.PNG` via File
source, 2560x1440 viewport.

**Environment change from earlier entries:** Playwright/a real windowed
browser was unavailable for this measurement session; used puppeteer
headless Chrome (`--use-gl=angle`) instead, same as the Phase 2 Task 18
entry above. Headless Chrome has no real display/vsync, so its `rAF`
callback rate is uncapped rather than compositor-throttled — the absolute
readback/sec numbers below are **not comparable** to the windowed-browser
"After Task 6" entry's 19.7/sec figure. To get a valid before/after
comparison anyway, **master was measured in the same headless session**
via a temporary `git worktree` (mirroring Task 6's git-stash-toggle
precedent for apples-to-apples before/after on one running setup), rather
than reusing the older doc entry.

**Results** (3 s samples, same headless session/environment for both
columns):

| scenario | master (before, CPU dispatch) | Phase 3 (after, GPU passes) |
|---|---|---|
| TAR+HALF alone (no Stipple) | 27.3 readbacks/sec | **0.0 readbacks/sec** |
| Stipple alone (no TAR/HALF) | 95.7 readbacks/sec | 99.3 readbacks/sec |
| TAR+HALF+Stipple (3-stack) | 26.0 readbacks/sec | 9.3 readbacks/sec |

**The headline proof:** TAR+HALF alone go from 27.3 readbacks/sec on
master (StrandOverlay/AcidOverlay's CPU dispatch calling `getSharedFrame()`
every frame to feed their `getImageData` pixel loops) to **exactly 0.0 on
this branch** — confirmed by code as well as measurement: neither
`StrandOverlay.tsx` (deleted) nor the current `AcidOverlay.tsx` (readback
gated behind `decompEnabled` only, see Item 1) has any code path that
calls `getSharedFrame()` while TAR/HALF are the only enabled effects. This
is the exact claim Task 15 set out to prove: strand/acid readbacks are
gone.

**Stipple-alone is unchanged** (95.7 vs 99.3/sec, within this metric's
run-to-run noise) — expected, since `StippleOverlay.tsx` was not touched
by Phase 3 and still runs its own independent `requestAnimationFrame`
loop calling `getSharedFrame()` every frame regardless of TAR/HALF.

**The combined 3-stack number went DOWN (26.0 → 9.3), not up towards
Stipple-alone's ~97/sec, which is counter to a naive prediction** ("TAR/HALF
now cost the readback path nothing, so the stack should behave more like
Stipple-alone"). Investigated and attributed to a different, real effect:
`perfMonitor.getStats()` for the same 3-stack sample shows Phase 3's
CPU-submission avg-ms is comparable to master's (0.089 ms vs master's
figure in the same run) but the stack's realized fps drops from Stipple-
alone's ~16450 to ~11200 once TAR+HALF are added — i.e. the two ported
shaders (TAR's ping-pong CA sim, HALF's multi-tap rotated-grid sampling)
add real **GPU-side** execution cost that paces down the browser's overall
frame rate in this uncapped-rAF headless environment, which in turn paces
down how often `advanceReadbackFrame()` (called once per Canvas.tsx main
loop tick) advances the shared-frame stamp that Stipple's readback rides
on. This is a GPU-shader-cost effect, not a CPU-readback regression: the
readback call itself is still exactly "0 or 1 per main-loop tick," and
TAR/HALF's own contribution to that count is verified 0 in isolation
above. Not itself concerning (both effects were already gated by the
same "escape hatch if too costly" review process the whole phase used),
but flagged here for completeness rather than silently reporting only the
flattering isolated number.

**Qualitative confirmation (the more durable claim than any single noisy
readback-count run):** `StrandOverlay.tsx` no longer exists in the
codebase; `AcidOverlay.tsx`'s only remaining `getSharedFrame()` call site
is inside the `decompActive` branch (Item 1). Grep-verified: no import of
`sharedReadback.ts` remains in any ACID/STRAND GPU-port file
(`src/effects/glitch-engine/Acid*.ts` / `Strand*.ts`) — those files read
`inputBuffer` (the postprocessing chain's own texture), never the CPU
2D-canvas readback. The elimination is structural, not merely measured.
