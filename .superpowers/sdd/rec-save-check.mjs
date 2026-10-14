// Records 2 s with the header REC button and checks the recording is saved to disk (and is in the clip bin).
// Usage: node .superpowers/sdd/rec-save-check.mjs <port>
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
const [PORT] = process.argv.slice(2)
const dir = path.resolve('.superpowers/sdd/tmp/downloads'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160))); p.on('console', (m) => { if (/Recording/.test(m.text())) errs.push(m.text().slice(0, 160)) })
const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir })
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => { import('/src/stores/mediaStore.ts').then((m) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.src = '/.superpowers/sdd/fixtures/person-pan.mp4'; v.oncanplay = () => { v.oncanplay = null; v.play(); m.useMediaStore.getState().setVideoElement(v); m.useMediaStore.getState().setSource('file'); window.__ready = true } }) })
await p.waitForFunction(() => window.__ready, { timeout: 30000 }); await wait(800)
const mp4 = await p.evaluate(() => MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.640028') || MediaRecorder.isTypeSupported('video/mp4'))
await p.click('[data-rec]'); await wait(2200); await p.click('[data-rec]')
let files = []
for (let i = 0; i < 20 && !(files = fs.readdirSync(dir).filter((f) => !f.endsWith('.crdownload'))).length; i++) await wait(500)
const status = await p.evaluate(() => document.body.innerText.match(/Recording saved as [^\n]+/)?.[0] ?? null)
const clips = await p.evaluate(async () => (await import('/src/stores/clipStore.ts')).useClipStore.getState().clips.map((c) => [c.blob.type, Math.round(c.blob.size / 1024) + 'KB', +c.duration.toFixed(1)]))
let probe = null
if (files[0]) probe = execSync(`ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=format_name,duration -of compact "${path.join(dir, files[0])}"`).toString().trim()
console.log(JSON.stringify({ browserCanRecordMp4: mp4, files, status, clips, probe }, null, 1), errs.slice(0, 5))
await b.close()
