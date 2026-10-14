// Screenshots the bank row (A-D, randomize, undo, rekt) under the browser. Usage: node bank-shot.mjs <port> <tag> [width]
import puppeteer from 'puppeteer'
const [PORT, TAG, W = '1600'] = process.argv.slice(2)
const b = await puppeteer.launch({ headless: 'new' }); const p = await b.newPage()
await p.setViewport({ width: +W, height: 1000, deviceScaleFactor: 3 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await new Promise((r) => setTimeout(r, 1500))
const row = await p.evaluateHandle(() => document.querySelector('[data-bank-slot]')?.parentElement)
const bb = await row.boundingBox(); console.log(TAG, bb)
await row.asElement().screenshot({ path: `.superpowers/sdd/shots/bank-${TAG}.png` })
await b.close()
