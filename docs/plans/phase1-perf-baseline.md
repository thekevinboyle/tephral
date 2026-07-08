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
main sort loop capped at 96 iterations with **adaptive stride**
(`max(1, streakLength/96)`) plus per-pixel ladder jitter, match window
widened to `stride*0.75 + 1` texels. Worst-case samples 200 -> 152; output
is sample-exact for streakLength <= 96, visually identical to ~192, slight
streak ribbing at 250 (max) — judged within the "minor texture change"
allowance. The plan's 32/48-iteration draft produced clearly visible
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
