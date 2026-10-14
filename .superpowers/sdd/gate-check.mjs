// While playing: an effect with an empty gate track stays at its Dry/wet; one step set gates it (mix moves
// between 0 and open); clearing the step brings the user's Dry/wet back. Usage: node gate-check.mjs <port> [effectId]
import puppeteer from 'puppeteer'
const [PORT, ID = 'rgb_split'] = process.argv.slice(2)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const b = await puppeteer.launch({ headless: 'new' }); const p = await b.newPage(); const errs = []
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)))
await p.setViewport({ width: 1600, height: 1000 })
await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' }); await wait(1500)
const sample = (ms) => p.evaluate(async (id, ms) => {
  const ge = (await import('/src/stores/glitchEngineStore.ts')).useGlitchEngineStore
  const seen = new Set(); const t0 = performance.now()
  await new Promise((r) => { const f = () => { seen.add(+ge.getState().getEffectMix(id).toFixed(2)); performance.now() - t0 < ms ? requestAnimationFrame(f) : r() }; f() })
  return [...seen].sort()
}, ID, ms)
await p.evaluate((id) => { import('/src/hooks/useEffectToggle.ts').then((m) => m.toggleEffect(id)) }, ID); await wait(500)
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedPlay()) }); await wait(300)
const out = { emptyTrack: await sample(1500) }
await p.evaluate((id) => { import('/src/stores/effectSequencerStore.ts').then((m) => { const s = m.useEffectSequencerStore.getState(); s.ensureTrack(id); s.setStepActive(id, 0, true) }) }, ID)
out.oneStep = await sample(3000)
await p.evaluate((id) => { import('/src/stores/effectSequencerStore.ts').then((m) => m.useEffectSequencerStore.getState().setStepActive(id, 0, false)) }, ID)
await wait(800); out.stepCleared = await sample(1000)
await p.evaluate(() => { import('/src/utils/sequencerTransport.ts').then((m) => m.linkedStop()) }); await wait(300)
out.afterStop = await sample(300)
console.log(ID, JSON.stringify(out), errs.slice(0, 3))
await b.close()
