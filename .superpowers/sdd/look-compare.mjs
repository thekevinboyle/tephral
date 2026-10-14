// Renders a still through single effects (toggleEffect) and saves one stage screenshot per effect.
// Usage: node .superpowers/sdd/look-compare.mjs <port> <image under .superpowers/sdd/> <tag> id1 id2 ...
import puppeteer from 'puppeteer'
const [PORT, IMG, TAG, ...IDS] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new' }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await p.setViewport({ width: 1600, height: 1100 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate((src) => { import('/src/stores/mediaStore.ts').then((m) => { const img = new Image(); img.onload = () => { m.useMediaStore.getState().setImageElement(img); m.useMediaStore.getState().setSource('file'); window.__ready = true }; img.src = src }) }, '/.superpowers/sdd/' + IMG)
await p.waitForFunction(() => window.__ready, { timeout: 30000 }); await wait(1000)
const stage = async () => { const cs = await p.$$('[data-video-canvas-container] canvas'); let best = null; for (const c of cs) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.a)) best = { c, a: bb.width * bb.height } } return best.c }
for (const id of IDS) {
  console.log(id); await p.evaluate((id) => { import('/src/hooks/useEffectToggle.ts').then((m) => m.toggleEffect(id)) }, id); await wait(2500)
  await (await stage()).screenshot({ path: `.superpowers/sdd/shots/look-${TAG}-${id}.png` })
  await p.evaluate((id) => { import('/src/hooks/useEffectToggle.ts').then((m) => m.toggleEffect(id)) }, id); await wait(300)
}
console.log('done', errs.slice(0, 4)); await b.close()
