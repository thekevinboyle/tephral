// Audio loop: with a loop at 2-4 s playing, a click past the loop and a click inside it must both seek, and
// playback must wrap at the loop end. Also drops an audio file on the timeline strip.
// Usage: node .superpowers/sdd/audio-loop-check.mjs <port>
import puppeteer from 'puppeteer'
import fs from 'fs'
const [PORT] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)))
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
// Drop the file on the timeline strip (a synthetic DataTransfer with a real File)
const b64 = fs.readFileSync('.superpowers/sdd/fixtures/tone-12s.wav').toString('base64')
const dropped = await p.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const file = new File([bytes], 'tone-12s.wav', { type: 'audio/wav' })
  const dt = new DataTransfer(); dt.items.add(file)
  const strip = document.querySelector('[data-media-strip]')
  for (const type of ['dragenter', 'dragover', 'drop']) strip.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }))
  await new Promise((r) => setTimeout(r, 1500))
  const s = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState()
  return { source: s.activeSource, el: !!s.audioFileElement }
}, b64)
await p.evaluate(async () => {
  const s = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState()
  const a = s.audioFileElement; a.muted = true
  s.setAudioLoopStart(2); s.setAudioLoopEnd(4); s.setAudioLoopEnabled(true)
  a.currentTime = 2; await a.play()
})
await wait(2600) // runs into 4 s at least once
const wrapped = await p.evaluate(async () => { const a = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState().audioFileElement; return +a.currentTime.toFixed(2) })
const wave = await p.$('[data-audio-waveform]'); const bb = await wave.boundingBox()
const clickAt = async (sec) => { await p.mouse.click(bb.x + bb.width * (sec / 12), bb.y + bb.height / 2); await wait(400); return p.evaluate(async () => +(await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState().audioFileElement.currentTime.toFixed(2)) }
const afterOutside = await clickAt(8)
await wait(800)
const stillOutside = await p.evaluate(async () => +(await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState().audioFileElement.currentTime.toFixed(2))
const afterInside = await clickAt(3)
const loop = await p.evaluate(async () => { const s = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState(); return [s.audioLoopEnabled, s.audioLoopStart, s.audioLoopEnd] })
await wait(1500)
const wrapped2 = await p.evaluate(async () => +(await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState().audioFileElement.currentTime.toFixed(2))
console.log(JSON.stringify({ dropped, wrappedInLoop: wrapped, afterClickAt8: afterOutside, stillPast8: stillOutside, afterClickAt3: afterInside, loopKept: loop, wrapsAgain: wrapped2 }, null, 1), errs.slice(0, 4))
await b.close()
