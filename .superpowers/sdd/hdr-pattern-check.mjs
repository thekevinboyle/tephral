// HLG test pattern through the app vs Apple's rendering (qlmanage thumbnail, BT.2020 + 709 curve, shown with
// QuickTime's 1.961 gamma, converted to sRGB). Prints per-step grey and per-patch colour, app vs Apple.
// Usage: node .superpowers/sdd/hdr-pattern-check.mjs <port>   (needs tmp/ql/hlg-pattern.mp4.png from qlmanage)
import puppeteer from 'puppeteer'
import { PNG } from 'pngjs'
import fs from 'fs'
const [PORT] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage()
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.src = '/.superpowers/sdd/fixtures/hlg-pattern.mp4'; v.onloadeddata = () => { v.onloadeddata = null; m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }))
await p.waitForFunction(() => window.__ready && window.__warpTest?.hdr?.(), { timeout: 30000 }); await wait(1500)
const canvases = await p.$$('[data-video-canvas-container] canvas'); let best = null
for (const c of canvases) { const bb = await c.boundingBox(); if (bb && (!best || bb.width * bb.height > best.bb.width * best.bb.height)) best = { c, bb } }
const app = PNG.sync.read(Buffer.from(await best.c.screenshot()))
const ref = PNG.sync.read(fs.readFileSync('.superpowers/sdd/tmp/ql/hlg-pattern.mp4.png'))
const px = (png, fx, fy) => { const i = (Math.round(fy * png.height) * png.width + Math.round(fx * png.width)) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]] }
// Apple: V (BT.2020, 709 curve) -> light V^1.961 -> BT.709 primaries -> sRGB
const M = [[1.6605, -0.5876, -0.0728], [-0.1246, 1.1329, -0.0083], [-0.0182, -0.1006, 1.1187]]
const enc = (c) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)))
const apple = (v) => { const l = v.map((x) => (x / 255) ** 1.961); return M.map((r) => enc(r[0] * l[0] + r[1] * l[1] + r[2] * l[2])) }
let worst = 0, sum = 0, n = 0
const row = (fy, count) => [...Array(count)].map((_, i) => { const fx = (i + 0.5) / count; const a = apple(px(ref, fx, fy)), o = px(app, fx, fy); const d = Math.max(...a.map((x, k) => Math.abs(x - o[k]))); worst = Math.max(worst, d); sum += d; n++; return `${o.join(',')}|${a.join(',')}` })
console.log('grey app|apple', row(0.25, 16).join('  '))
console.log('colour app|apple', row(0.75, 8).join('  '))
console.log(JSON.stringify({ worstChannelDiff: worst, meanMaxDiff: +(sum / n).toFixed(1) }))
await b.close()
