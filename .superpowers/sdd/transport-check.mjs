// Master transport: a dropped video waits on its first frame; Space plays and stops sequencer, video and audio
// together; the header's is the only play button in the app. Usage: node transport-check.mjs <port>
import puppeteer from 'puppeteer'
import fs from 'fs'
import { PNG } from 'pngjs'
const [PORT] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
const drop = (sel, file, type) => p.evaluate(async (sel, b64, name, type) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const dt = new DataTransfer(); dt.items.add(new File([bytes], name, { type }))
  const el = document.querySelector(sel)
  for (const t of ['dragenter', 'dragover', 'drop']) el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }))
}, sel, fs.readFileSync('.superpowers/sdd/' + file).toString('base64'), file.split('/').pop(), type)
const state = () => p.evaluate(async () => {
  const seq = (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState()
  const v = (await import('/src/stores/mediaStore.ts')).useMediaStore.getState().videoElement
  const a = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState().audioFileElement
  const header = document.querySelector('[data-transport="play"]')?.getAttribute('aria-pressed')
  return { seq: seq.isPlaying, video: v ? !v.paused : null, audio: a ? !a.paused : null, header }
})
const stageLum = async () => {
  const cs = await p.$$('[data-video-canvas-container] canvas'); let best = null
  for (const c of cs) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.a)) best = { c, a: bb.width * bb.height } }
  const png = PNG.sync.read(Buffer.from(await best.c.screenshot())); let s = 0
  for (let i = 0; i < png.data.length; i += 4) s += png.data[i] + png.data[i + 1] + png.data[i + 2]
  return +(s / (png.data.length / 4) / 3).toFixed(1)
}
const out = {}
await drop('[data-stage-drop]', 'fixtures/person-pan.mp4', 'video/mp4'); await wait(2000)
out.afterVideoDrop = await state(); out.firstFrameLum = await stageLum()
// Scrubbing a paused video must change the picture
const lane = await p.$('[data-media-lane="video"] .seg-media-lane'); const lb = await lane.boundingBox()
await p.mouse.click(lb.x + lb.width * 0.9, lb.y + lb.height / 2); await wait(800)
out.pausedScrubLum = await stageLum()
await drop('[data-media-strip]', 'fixtures/tone-12s.wav', 'audio/wav'); await wait(1500)
out.afterAudioDrop = await state()
await p.mouse.click(800, 300); await p.keyboard.press('Space'); await wait(800)
out.afterSpace = await state()
await p.keyboard.press('Space'); await wait(500)
out.afterSpaceAgain = await state()
out.playButtons = await p.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /^(play|pause|start|stop|preview)/i.test(b.getAttribute('aria-label') || '')).map((b) => b.getAttribute('aria-label')))
await p.click('[data-transport="play"]'); await wait(600)
out.afterHeaderPlay = await state()
await p.click('[data-transport="play"]'); await wait(400)
out.afterHeaderStop = await state()
console.log(JSON.stringify(out, null, 1), errs.slice(0, 4))
await b.close()
