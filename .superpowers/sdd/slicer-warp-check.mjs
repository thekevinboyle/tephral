// Warp still switches the pipeline input correctly after the input refactor, alone and on top of the slicer.
// Usage: node .superpowers/sdd/slicer-warp-check.mjs <port>
import puppeteer from 'puppeteer'
const [PORT] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errors = []
p.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => { window.__ready = false; import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = '/.superpowers/sdd/fixtures/person-pan.mp4'; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }) })
await p.waitForFunction(() => window.__ready && window.__warpTest && window.__slicerTest, { timeout: 30000 }); await wait(500)
const state = () => p.evaluate(() => { const w = window.__warpTest; const e = window.__slicerTest.engine(); return {
  fedBase: w.pipelineInput() === w.baseInput(), warpTargets: w.compositor()?.targetCount ?? 0, slicerShown: window.__slicerTest.readout.active,
  fedSlicer: !!e && e.outputSize[0] > 0 && w.pipelineInput() !== w.baseInput() } })
const warp = (on, placement = 'before') => p.evaluate((on, placement) => import('/src/stores/warpStore.ts').then((m) => { const s = m.useWarpStore.getState(); s.setPlacement?.(placement); s.setAmount?.(1); s.setEnabled(on) }), on, placement)
const slicer = (on) => p.evaluate((on) => import('/src/stores/slicerStore.ts').then((m) => { const s = m.useSlicerStore.getState(); s.setEnabled(on); s.setIsPlaying(on) }), on)
const out = {}
out.idle = await state()
await warp(true); await wait(1500); out.warpOn = await state()
await warp(false); await wait(300); out.warpOff = await state()
await slicer(true); await wait(2500); out.slicerOn = await state()
await warp(true); await wait(1500); out.slicerAndWarp = await state()
await warp(true, 'after'); await wait(800); out.slicerAndWarpAfter = await state()
await warp(false, 'before'); await slicer(false); await wait(400); out.allOff = await state()
console.log(JSON.stringify(out, null, 1), '\nerrors', JSON.stringify(errors.slice(0, 6)))
await b.close()
