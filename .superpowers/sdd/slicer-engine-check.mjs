// GPU slicer engine end to end: loads person-pan.mp4, opens the slicer panel (buffer fills), turns the slicer on,
// plays it from the header transport at 88 BPM, then measures and checks:
// fps, setInputTexture/s, heap, ring order, frame and output sizes, trigger rate vs BPM, mix/layer, import, off = nothing held.
// Usage: node .superpowers/sdd/slicer-engine-check.mjs <port> <tag>
import puppeteer from 'puppeteer'
const [PORT, TAG = 'after'] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] }); const p = await b.newPage(); const errors = []
p.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
p.on('console', (m) => { if (m.type() === 'error' || /WebGL|GL_INVALID|shader/i.test(m.text())) errors.push(m.text().slice(0, 200)) })
await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => { window.__ready = false; import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.src = '/.superpowers/sdd/fixtures/person-pan.mp4'; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }) })
await p.waitForFunction(() => window.__ready && window.__pipeline && window.__slicerTest, { timeout: 30000 })
const st = (fn, arg) => p.evaluate((fn, arg) => import('/src/stores/slicerStore.ts').then((m) => { const s = m.useSlicerStore.getState(); return new Function('s', 'arg', fn)(s, arg) }), fn, arg)
const res = {}
res.beforePanelEngine = await p.evaluate(() => !!window.__slicerTest.engine())
await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(300)
await p.click('button[aria-label="Video slicer"]'); await wait(4500) // the open panel fills the buffer
res.filledWhileOff = await p.evaluate(() => ({ frames: window.__slicerTest.readout.frames, capacity: window.__slicerTest.readout.capacity }))
await p.evaluate(() => import('/src/stores/effectSequencerStore.ts').then((m) => m.useEffectSequencerStore.getState().setBpm(88)))
await st('s.setEnabled(true)')
await p.click('[data-transport="play"]'); await wait(1200)
res.slicerPlayingFromHeader = await st('return s.isPlaying')
res.videoMenu = await p.evaluate(() => document.querySelector('[data-area="header"]')?.innerText.replace(/\s+/g, ' ').slice(0, 120))

// 4 s measurement
const m = await p.evaluate(() => new Promise((resolve) => {
  const pl = window.__pipeline; let setInput = 0; const orig = pl.setInputTexture.bind(pl); pl.setInputTexture = (t) => { setInput++; return orig(t) }
  const longs = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(e.duration))); po.observe({ entryTypes: ['longtask'] })
  const eng = window.__slicerTest.engine(); let triggers = 0; let lastSlice = eng.grains.slice
  const iv = []; let last = performance.now(); const t0 = last
  const tick = (t) => { iv.push(t - last); last = t; if (eng.grains.slice !== lastSlice) { triggers++; lastSlice = eng.grains.slice } if (t - t0 < 4000) requestAnimationFrame(tick); else done() }
  requestAnimationFrame(tick)
  const done = () => {
    po.disconnect(); pl.setInputTexture = orig; iv.sort((a, b) => a - b)
    const ring = eng.ring; let ordered = true
    for (let k = 1; k < ring.size; k++) if (!(ring.at(k).t > ring.at(k - 1).t)) ordered = false
    resolve({ fps: +(iv.length / 4).toFixed(1), p95: +iv[Math.floor(iv.length * 0.95)].toFixed(1), longTasks: longs.length,
      setInputTexturePerSec: +(setInput / 4).toFixed(1), triggersPerSec: +(triggers / 4).toFixed(2), expectedPerSec: +(88 / 60 * 4).toFixed(2),
      ringFrames: ring.size, ringOrdered: ordered, frameSize: [ring.frameWidth, ring.frameHeight], outputSize: eng.outputSize,
      gpuMB: +(ring.targetCount * ring.frameWidth * ring.frameHeight * 4 / 1e6).toFixed(0),
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(0) : null,
      pipelineFedSlicer: pl.inputTexture === eng.outputSize && false || window.__warpTest.pipelineInput() !== window.__warpTest.baseInput() })
  }
}))
Object.assign(res, m)
await p.screenshot({ path: `.superpowers/sdd/shots/slicer-engine-${TAG}-replace.png` })
// Density / envelope sanity on the live engine
await st("s.updateGrainParams({ density: 4, envelope: 40, spray: 0.4, grainSize: 300 })"); await wait(300)
res.maxVoicesAtDensity4 = await p.evaluate(() => new Promise((r) => { const e = window.__slicerTest.engine(); let mx = 0; const t0 = performance.now(); const f = () => { mx = Math.max(mx, e.grains.voiceCount); performance.now() - t0 < 800 ? requestAnimationFrame(f) : r(mx) }; f() }))
for (const mode of ['mix', 'layer']) {
  await st(`s.setOutputMode('${mode}'); s.setBlendMode('difference')`); await wait(700)
  res[`${mode}Output`] = await p.evaluate(() => window.__slicerTest.engine().outputSize)
  await p.screenshot({ path: `.superpowers/sdd/shots/slicer-engine-${TAG}-${mode}.png` })
}
await st("s.setOutputMode('replace'); s.updateGrainParams({ density: 2, envelope: 20, spray: 0.2, grainSize: 100 })")
// Import 45 synthetic frames
res.imported = await p.evaluate(async () => {
  const frames = []; for (let i = 0; i < 45; i++) { const d = new ImageData(480, 270); for (let j = 0; j < d.data.length; j += 4) { d.data[j] = i * 5; d.data[j + 1] = 80; d.data[j + 2] = 255 - i * 5; d.data[j + 3] = 255 } frames.push(d) }
  const store = (await import('/src/stores/slicerStore.ts')).useSlicerStore
  store.getState().setCaptureState('imported') // as the panel does: state and frames in the same task
  window.__slicerTest.commands.importFrames = frames
  await new Promise((r) => setTimeout(r, 500))
  const e = window.__slicerTest.engine(); return { frames: e.ring.size, frameSize: [e.ring.frameWidth, e.ring.frameHeight] }
})
await st("s.setCaptureState('live')"); await p.evaluate(() => { window.__slicerTest.commands.clear = true })
// Off with the panel closed: nothing held, the pipeline gets the original texture back
await p.click('[data-transport="play"]'); await wait(200)
await st('s.setEnabled(false)')
await p.click('button[aria-label="Step sequencer"]').catch(() => {}); await wait(600)
res.off = await p.evaluate(() => { const e = window.__slicerTest.engine(); return { viewersClosed: true, ringTargets: e.ring.targetCount, output: e.outputSize, originalInput: window.__warpTest.pipelineInput() === window.__warpTest.baseInput() } })
res.slicerStoppedFromHeader = !(await st('return s.isPlaying'))
console.log(TAG, JSON.stringify(res, null, 1), '\nerrors', JSON.stringify(errors.slice(0, 8)))
await b.close()
