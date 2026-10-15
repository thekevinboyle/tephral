// Loads an image or video, turns on SEG effects (comma list) and saves a stage shot plus the detections.
// Usage: node .superpowers/sdd/scan-shot.mjs <port> <media under .superpowers/sdd/> <tag> <effect,ids> [waitMs]
import puppeteer from 'puppeteer'
const [PORT, MEDIA, TAG, IDS, WAIT = '3000'] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160))); p.on('console', (m) => { if (/DETECT|Error/.test(m.text())) errs.push(m.text().slice(0, 200)) })
await p.setViewport({ width: +(process.env.VW || 1600), height: +(process.env.VH || 1100) })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate((src) => { import('/src/stores/mediaStore.ts').then((m) => {
  if (/\.(mp4|mov|webm)$/i.test(src)) { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = src; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }
  else { const img = new Image(); img.onload = () => { m.useMediaStore.getState().setImageElement(img); m.useMediaStore.getState().setSource('file'); window.__ready = true }; img.src = src }
}) }, '/.superpowers/sdd/' + MEDIA)
await p.waitForFunction(() => window.__ready && window.__pipeline, { timeout: 30000 }); await wait(800)
await p.evaluate((ids) => { import('/src/hooks/useEffectToggle.ts').then((m) => ids.split(',').forEach((id) => m.toggleEffect(id))) }, IDS)
// SEG='{"updateBackdropParams":{...}}' calls those segStore updaters
if (process.env.SEG) await p.evaluate((j) => { import('/src/stores/segStore.ts').then((m) => { const s = m.useSegStore.getState(); for (const [k, v] of Object.entries(JSON.parse(j))) s[k](v) }) }, process.env.SEG)
await p.waitForFunction(() => ['ready', 'error'].includes(window.__pipeline.detection.status), { timeout: 60000 }).catch(() => {})
await wait(+WAIT)
const info = await p.evaluate(() => { const d = window.__pipeline.detection; const f = (t) => [t.id, +t.x.toFixed(2), +t.y.toFixed(2), +t.w.toFixed(2), +t.h.toFixed(2)]; return { status: d.status, people: d.people.tracks.length, faces: d.faces.tracks.map(f) } })
info.vision = await p.evaluate(async () => { const m = await import('/src/effects/vision/visionWorkerClient.ts'); return [m.visionMode(), m.visionDelegate()] })
const cs = await p.$$('[data-video-canvas-container] canvas'); let best = null
for (const c of cs) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.a)) best = { c, a: bb.width * bb.height } }
await best.c.screenshot({ path: `.superpowers/sdd/shots/scan-${TAG}.png` })
console.log(TAG, JSON.stringify(info), errs.slice(0, 4)); await b.close()
