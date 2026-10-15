// Phone layout at iPhone size with a fake camera: camera on, effects added from the sheet, steps set, play,
// Pad drawn, a take recorded. Screenshots at each stage. Usage: node .superpowers/sdd/phone-check.mjs <port|url>
import puppeteer from 'puppeteer'
const [TARGET] = process.argv.slice(2)
const base = TARGET.startsWith('http') ? TARGET : `http://localhost:${TARGET}/`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
await p.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1' })
const shot = (n) => p.screenshot({ path: `.superpowers/sdd/shots/phone-${n}.png` })
await p.goto(base, { waitUntil: 'networkidle2' }); await wait(1500)
const out = { layout: await p.evaluate(() => !!document.querySelector('[data-phone-layout]')) }
await shot('1-empty')
await p.click('.seg-phone-source button'); await wait(2500)                       // Camera
await p.click('.seg-phone-add'); await wait(600)                                   // the effects sheet
await p.type('.seg-phone-fx-search', 'rgb'); await wait(300); await p.click('[data-fx="rgb_split"]'); await wait(200)
await p.evaluate(() => { const i = document.querySelector('.seg-phone-fx-search'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })) })
for (const id of ['pixelate', 'halation']) { await p.evaluate((id) => { const s = document.querySelector('.seg-phone-fx-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, id === 'pixelate' ? 'pixel' : 'halat'); s.dispatchEvent(new Event('input', { bubbles: true })) }, id); await wait(250); await p.click(`[data-fx="${id}"]`); await wait(200) }
await p.evaluate(() => { const s = document.querySelector('.seg-phone-fx-search'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, ''); s.dispatchEvent(new Event('input', { bubbles: true })) }); await wait(200)
await p.click('.seg-phone-fx-cat'); await wait(300)
await shot('2-sheet')
out.afterAdd = await p.evaluate(() => [...document.querySelectorAll('.seg-phone-chip')].map((c) => c.textContent))
await p.click('.seg-phone-sheet-head button'); await wait(500)
const cells = await p.$$('.seg-phone-steps button'); for (const i of [0, 4, 8, 12, 18, 22]) await cells[i]?.click()
await p.click('.seg-phone-play'); await wait(1500)
out.playing = await p.evaluate(async () => (await import('/src/stores/effectSequencerStore.ts')).useEffectSequencerStore.getState().isPlaying)
await shot('3-steps-playing')
await p.click('.seg-phone-views button:nth-child(2)'); await wait(500)
const pad = await p.$('.seg-pad-surface'); const bb = await pad.boundingBox()
await p.touchscreen.touchStart(bb.x + bb.width * 0.2, bb.y + bb.height * 0.5)
for (let i = 0; i <= 30; i++) { const t = i / 30 * Math.PI * 2; await p.touchscreen.touchMove(bb.x + bb.width * (0.5 + 0.3 * Math.cos(t)), bb.y + bb.height * (0.5 + 0.3 * Math.sin(t))); await wait(30) }
await p.touchscreen.touchEnd(); await wait(600)
out.padSlots = await p.evaluate(async () => { const m = await import('/src/effects/pads/padEngine.ts'); const ids = Object.keys((await import('/src/stores/padStore.ts')).usePadStore.getState().pads); return ids.map((id) => [id, [...m.getPadPath(id).xs].filter((v) => !Number.isNaN(v)).length]) })
await shot('4-pad')
out.padFits = await p.evaluate(() => { const vh = innerHeight; const tr = document.querySelector('.seg-phone-transport').getBoundingClientRect().top
  return ['.seg-pad-area', '[data-pad-axis="x"]', '[data-pad-beats]', '[data-pad-clear]'].map((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [sel, Math.round(r.top), Math.round(r.bottom), r.bottom <= tr + 1 && r.top >= 0] }) })
await p.click('.seg-phone-rec'); await wait(2500); await p.click('.seg-phone-rec'); await wait(1500)
out.clip = await p.evaluate(async () => { const c = (await import('/src/stores/clipStore.ts')).useClipStore.getState().clips.at(-1); return c ? [c.blob.type, Math.round(c.blob.size / 1024) + 'KB'] : null })
out.shareEnabled = await p.evaluate(() => !document.querySelector('.seg-phone-share')?.hasAttribute('disabled'))
await p.click('.seg-phone-play'); await wait(400)
console.log(JSON.stringify(out, null, 1), '\nerrors', JSON.stringify(errs.slice(0, 5)))
await b.close()
