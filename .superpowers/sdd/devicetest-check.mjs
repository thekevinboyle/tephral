// Runs the ?devicetest panel end to end in Chrome with a fake camera and short steps; prints the report.
// Usage: node .superpowers/sdd/devicetest-check.mjs <port|url> [secs]
import puppeteer from 'puppeteer'
const [TARGET, SECS = '6'] = process.argv.slice(2)
const base = TARGET.startsWith('http') ? TARGET : `http://localhost:${TARGET}/`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await p.setViewport({ width: 1400, height: 900 })
await p.goto(`${base}?devicetest&secs=${SECS}`, { waitUntil: 'networkidle2' }); await wait(1500)
await p.evaluate(() => localStorage.removeItem('seg.devicetest')); await p.reload({ waitUntil: 'networkidle2' }); await wait(1500)
const btns = await p.$$('[data-devicetest] button'); await btns[0].click()
await p.waitForSelector('.seg-devtest-report', { timeout: (+SECS * 4 + 60) * 1000 })
const lines = await p.$$eval('.seg-devtest-report > div', (ds) => ds.map((d) => d.textContent))
await (await p.$('[data-devicetest]')).screenshot({ path: '.superpowers/sdd/shots/devicetest-panel.png' })
const tier = await p.evaluate(() => localStorage.getItem('seg.tier'))
console.log(lines.join('\n'), '\ntier:', tier, '\nerrors:', errs.slice(0, 4))
await b.close()
