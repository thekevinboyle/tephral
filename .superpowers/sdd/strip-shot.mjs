// Loads a video and an audio file, sets a loop, and screenshots the media strip under the stage.
// Usage: node .superpowers/sdd/strip-shot.mjs <port> <tag>
import puppeteer from 'puppeteer'
import fs from 'fs'
const [PORT, TAG] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage()
await p.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => { import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = '/.superpowers/sdd/fixtures/person-pan.mp4'; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }) })
await p.waitForFunction(() => window.__ready, { timeout: 30000 })
const b64 = fs.readFileSync('.superpowers/sdd/'+(process.env.AUDIO||'fixtures/tone-12s.wav')).toString('base64')
await p.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const s = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState()
  s.setAudioFile(URL.createObjectURL(new File([bytes], 'track.m4a', { type: 'audio/mp4' })), 'tone-12s.wav'); s.setActiveSource('file')
  await new Promise((r) => setTimeout(r, 1200))
  const st = (await import('/src/stores/audioSourceStore.ts')).useAudioSourceStore.getState()
  st.audioFileElement.muted = true; st.setAudioLoopStart(3); st.setAudioLoopEnd(6); st.setAudioLoopEnabled(true); st.audioFileElement.currentTime = 4; st.audioFileElement.play()
}, b64)
await wait(1500)
const strip = await p.$('[data-media-strip]')
await strip.screenshot({ path: `.superpowers/sdd/shots/strip-${TAG}.png` })
const bb = await strip.boundingBox(); console.log(TAG, bb)
await b.close()
