// Runs hdr-probe.html (HLG video -> WebGL -> readPixels) in Chrome. Usage: node hdr-probe.mjs <port> [src] [headful]
import puppeteer from 'puppeteer'
const [PORT, SRC = 'fixtures/hlg-pattern.mp4', HEADFUL] = process.argv.slice(2)
const b = await puppeteer.launch({ headless: HEADFUL ? false : 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message))
await p.goto(`http://localhost:${PORT}/.superpowers/sdd/hdr-probe.html?src=${SRC}`)
await p.waitForFunction(() => window.__probe, { timeout: 20000 }).catch(() => errs.push('timeout'))
console.log(JSON.stringify(await p.evaluate(() => window.__probe ?? { rs: document.getElementById('v').readyState, err: document.getElementById('v').error?.message })), errs)
await b.close()
