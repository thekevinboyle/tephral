// Applies the FACE SCAN factory preset to a video and takes a stage shot every 0.7 s, plus fps.
// Usage: node .superpowers/sdd/facescan-run.mjs <port> <video under .superpowers/sdd/> <tag>
import puppeteer from 'puppeteer'
const [PORT, MEDIA, TAG] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await p.setViewport({ width: 1300, height: 1900 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate((src) => { import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = src; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }) }, '/.superpowers/sdd/' + MEDIA)
await p.waitForFunction(() => window.__ready && window.__pipeline, { timeout: 30000 })
await p.evaluate(() => { Promise.all([import('/src/presets/segExp.ts'), import('/src/stores/presetLibraryStore.ts')]).then(([x, lib]) => {
  lib.applyEffects(x.buildFaceScanPreset(Date.now(), lib.captureCurrentEffects()).effects); window.__applied = true
}) })
await p.waitForFunction(() => window.__applied && window.__pipeline.detection.status === 'ready', { timeout: 60000 })
await wait(1500)
const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(n / 2) }; requestAnimationFrame(f) }))
const cs = await p.$$('[data-video-canvas-container] canvas'); let best = null
for (const c of cs) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.a)) best = { c, a: bb.width * bb.height } }
for (let i = 0; i < 4; i++) { await best.c.screenshot({ path: `.superpowers/sdd/shots/facescan-${TAG}-${i}.png` }); await wait(700) }
const info = await p.evaluate(() => ({ people: window.__pipeline.detection.people.tracks.length, faces: window.__pipeline.detection.faces.tracks.length, order: window.__pipeline.composer?.passes?.length }))
console.log(TAG, JSON.stringify({ fps, ...info }), errs.slice(0, 4))
await b.close()
