// X/Y pad: record a path while playing, check it replays into its targets, and that Stop restores them.
// Usage: node .superpowers/sdd/pad-check.mjs <port>
import puppeteer from 'puppeteer'
import fs from 'fs'
const [PORT] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'person-pan.mp4', { type: 'video/mp4' }))
  const el = document.querySelector('[data-stage-drop]')
  for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }))
}, fs.readFileSync('.superpowers/sdd/fixtures/person-pan.mp4').toString('base64'))
await wait(1500)
await p.evaluate(() => { import('/src/hooks/useEffectToggle.ts').then((m) => { m.toggleEffect('pixelate'); m.toggleEffect('rgb_split') }) }); await wait(600)
await p.click('[data-bottom-tab-btn="sequencer"]'); await wait(300)
await p.click('[data-seq-view="pad"]'); await wait(400)
await p.click('[data-pad-tab="pixelate"]'); await wait(400)
const read = () => p.evaluate(async () => { const g = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState(); return { px: g.pixelate.pixelSize, rgb: +g.rgbSplit.amount.toFixed(2), mixPx: g.effectMix.pixelate ?? 1 } })
const out = { targets: await p.evaluate(async () => (await import('/src/stores/padStore.ts')).usePadStore.getState().pads.pixelate), before: await read() }
// Play, then draw a circle for ~2 s (one 2-bar loop at 120 BPM is 4 s)
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedPlay()) }); await wait(300)
const pad = await p.$('[data-pad-surface="pixelate"]'); const bb = await pad.boundingBox()
await p.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.2); await p.mouse.down()
for (let i = 0; i <= 60; i++) { const t = (i / 60) * Math.PI * 2; await p.mouse.move(bb.x + bb.width * (0.5 + 0.35 * Math.sin(t)), bb.y + bb.height * (0.5 - 0.35 * Math.cos(t))); await wait(30) }
await p.mouse.up()
out.recordedSlots = await p.evaluate(async () => { const m = await import('/src/effects/pads/padEngine.ts'); return [...m.getPadPath('pixelate').xs].filter((v) => !Number.isNaN(v)).length })
const seen = new Set(), seenRgb = new Set()
for (let i = 0; i < 25; i++) { const r = await read(); seen.add(r.px); seenRgb.add(r.rgb); await wait(160) }
out.replayPixelSizes = [...seen].sort((a, b) => a - b); out.replayRgb = [...seenRgb].length
await p.screenshot({ path: '.superpowers/sdd/shots/pad-view.png' })
const bottom = await p.$('[data-pad-view]'); await bottom.screenshot({ path: '.superpowers/sdd/shots/pad-view-panel.png' })
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedStop()) }); await wait(500)
out.afterStop = await read()
// Master pad: Dice a path; while playing, All Dry/wet moves every effect's mix; Stop restores them
await p.click('[data-pad-tab="master"]'); await wait(300); await p.click('[data-pad-dice]'); await wait(200)
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedPlay()) }); await wait(300)
const mixes = new Set()
for (let i = 0; i < 15; i++) { const r = await p.evaluate(async () => { const g = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState(); return [+(g.effectMix.pixelate ?? 1).toFixed(2), +(g.effectMix.rgb_split ?? 1).toFixed(2)].join('/') }); mixes.add(r); await wait(150) }
out.masterAllMix = [...mixes].slice(0, 8)
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedStop()) }); await wait(500)
out.afterMasterStop = await p.evaluate(async () => { const g = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore.getState(); return [g.effectMix.pixelate ?? 1, g.effectMix.rgb_split ?? 1] })
console.log(JSON.stringify(out, null, 1), errs.slice(0, 4))
await b.close()
