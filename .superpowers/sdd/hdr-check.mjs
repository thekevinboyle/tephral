// Loads an HDR (HLG) clip paused at its first frame and compares the stage to Apple's tone-mapped
// thumbnail of the same frame (qlmanage): mean RGB, chroma, contrast (luma std dev), mean abs diff on a grid.
// Usage: node .superpowers/sdd/hdr-check.mjs <port> <tag> [video] [reference.png]
import puppeteer from 'puppeteer'
import { PNG } from 'pngjs'
import fs from 'fs'
const [PORT, TAG, VIDEO = 'fixtures/real-hlg.mov', REF = '.superpowers/sdd/tmp/ql/first.mov.png'] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate((src) => import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = src; v.onloadeddata = () => { v.onloadeddata = null; v.pause(); v.currentTime = 0; m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }), '/.superpowers/sdd/' + VIDEO)
await p.waitForFunction(() => window.__ready && window.__warpTest, { timeout: 30000 }); await wait(2000)
const hdr = await p.evaluate(() => window.__warpTest.hdr?.() ?? 'n/a')
if (process.env.RAW) { await p.evaluate(() => window.__warpTest.setHdr(null)); await wait(500) } // the old, unconverted path
const canvases = await p.$$('[data-video-canvas-container] canvas'); let best = null
for (const c of canvases) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.bb.width * best.bb.height)) best = { c, bb } }
const shot = PNG.sync.read(Buffer.from(await best.c.screenshot()))
fs.writeFileSync(`.superpowers/sdd/shots/hdr-${TAG}.png`, PNG.sync.write(shot))
const ref = PNG.sync.read(fs.readFileSync(REF))
// Inner 80% only (the stage has corner ticks and readouts)
const grid = (png) => { const out = []; for (let gy = 0; gy < 24; gy++) for (let gx = 0; gx < 14; gx++) { const x = Math.floor((0.1 + 0.8 * (gx + 0.5) / 14) * png.width), y = Math.floor((0.1 + 0.8 * (gy + 0.5) / 24) * png.height), i = (y * png.width + x) * 4; out.push([png.data[i], png.data[i + 1], png.data[i + 2]]) } return out }
const a = grid(ref), o = grid(shot)
const stats = (g) => { const l = g.map((v) => 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]); const m = l.reduce((s, x) => s + x, 0) / l.length
  return { mean: [0, 1, 2].map((k) => +(g.reduce((s, v) => s + v[k], 0) / g.length).toFixed(1)), chroma: +(g.reduce((s, v) => s + Math.max(...v) - Math.min(...v), 0) / g.length).toFixed(1), contrast: +Math.sqrt(l.reduce((s, x) => s + (x - m) ** 2, 0) / l.length).toFixed(1) } }
let d = 0; a.forEach((v, i) => { for (let k = 0; k < 3; k++) d += Math.abs(v[k] - o[i][k]) })
console.log(TAG, JSON.stringify({ hdr, shot: [shot.width, shot.height], ref: [ref.width, ref.height], apple: stats(a), app: stats(o), meanAbsDiff: +(d / a.length / 3).toFixed(1) }), errs.slice(0, 3))
await b.close()
