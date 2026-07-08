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
