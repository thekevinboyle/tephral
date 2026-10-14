// Adds an effect while a video plays and checks it is still applied over the next seconds.
// Usage: node .superpowers/sdd/fx-stick-check.mjs <port> <effectId> [play-first: 1|0]
import puppeteer from 'puppeteer'
import fs from 'fs'
import { PNG } from 'pngjs'
const [PORT, ID = 'pixelate', PLAY_FIRST = '1'] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)) })
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'person-pan.mp4', { type: 'video/mp4' }))
  const el = document.querySelector('[data-stage-drop]')
  for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }))
}, fs.readFileSync('.superpowers/sdd/fixtures/person-pan.mp4').toString('base64'))
await wait(2000)
const stage = async () => { const cs = await p.$$('[data-video-canvas-container] canvas'); let best = null; for (const c of cs) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.a)) best = { c, a: bb.width * bb.height } } return best.c }
// Blockiness: share of horizontal neighbour pairs that are identical (pixelate makes this high)
const metric = async () => { const png = PNG.sync.read(Buffer.from(await (await stage()).screenshot())); let same = 0, n = 0
  for (let y = 40; y < png.height - 40; y += 3) for (let x = 0; x < png.width - 1; x++) { const i = (y * png.width + x) * 4; n++; if (Math.abs(png.data[i] - png.data[i + 4]) + Math.abs(png.data[i + 1] - png.data[i + 5]) < 3) same++ }
  return +(same / n).toFixed(3) }
if (PLAY_FIRST === '1') { await p.mouse.click(800, 300); await p.keyboard.press('Space'); await wait(800) }
const before = await metric()
await p.evaluate((id) => { import('/src/hooks/useEffectToggle.ts').then((m) => m.toggleEffect(id)) }, ID)
const after = []
for (let i = 0; i < 6; i++) { await wait(400); after.push(await metric()) }
const st = await p.evaluate(async (id) => { const m = await import('/src/hooks/useEffectToggle.ts'); const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState(); return { active: m.isEffectActive(id), seqPlaying: seq.isPlaying, mix: (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState().effectMix?.[id] } }, ID)
console.log(ID, 'playFirst', PLAY_FIRST, JSON.stringify({ before, after, ...st }), errs.slice(0, 5))
await b.close()
