// Headless checks of the slicer's grain scheduler (bundled from src by esbuild first).
import { GrainScheduler } from './tmp/slicerGrains.mjs'
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } else console.log('ok  ', m) }
const base = { sliceCount: 8, sliceSequenceMode: 'forward', grainSize: 100, density: 1, spray: 0, jitter: 0, rate: 1,
  direction: 'forward', reverseProb: 0, envelope: 0, sliceProb: 1, syncToBpm: true, triggerRate: 4, freeze: false }
let seed = 1; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647

// 1. Synced to the transport: one trigger per 16th, slices in order, at (slice + scan)/n
{
  const g = new GrainScheduler(); const starts = []
  for (let f = 0; f <= 120; f++) { // 2 s at 60 fps, 88 BPM
    const now = f * 1000 / 60, beats = now / 1000 * 88 / 60
    const before = g.slice
    g.step(now, base, 0, 88, 4, beats, rng)
    if (g.slice !== before) starts.push(before)
  }
  const expected16ths = Math.floor(2 * 88 / 60 * 4) + 1
  ok(Math.abs(starts.length - expected16ths) <= 1, `88 BPM: ${starts.length} triggers in 2 s (expected ~${expected16ths})`)
  ok(starts.slice(0, 9).join() === '0,1,2,3,4,5,6,7,0', `forward order ${starts.slice(0, 9).join()}`)
}
// 2. Free-running interval follows the BPM (not a fixed 120)
{
  const g = new GrainScheduler(); let n = 0
  for (let f = 0; f <= 600; f++) { const s = g.slice; g.step(f * 1000 / 60, base, 0, 88, 4, null, rng); if (g.slice !== s) n++ }
  const exp = 10 * 88 / 60 * 4
  ok(Math.abs(n - exp) <= 2, `free run at 88 BPM: ${n} triggers in 10 s (expected ~${exp.toFixed(0)})`)
}
// 3. Density: N voices on screen, weights sum to 1
{
  const g = new GrainScheduler(); const s = { ...base, density: 4, spray: 0.3 }
  g.step(0, s, 0.5, 120, 4, null, rng); g.step(16, s, 0.5, 120, 4, null, rng)
  const sum = g.voices.slice(0, g.voiceCount).reduce((a, v) => a + v.weight, 0) + (g.voiceCount ? g.holdWeight : 0)
  ok(g.voiceCount === 4, `density 4 gives ${g.voiceCount} voices`)
  ok(Math.abs(sum - 1) < 1e-6, `weights sum to ${sum.toFixed(4)}`)
}
// 4. Envelope: a new grain fades in over the hold
{
  const g = new GrainScheduler(); const s = { ...base, envelope: 50 }
  g.step(0, s, 0, 120, 4, null, rng)
  const w0 = g.voices[0].weight, h0 = g.holdWeight
  g.step(25, s, 0, 120, 4, null, rng)
  ok(w0 === 0 && h0 === 1, `at birth the grain is at 0 (hold ${h0})`)
  ok(g.voices[0].weight > 0.9 && g.voices[0].weight <= 1, `after its fade-in it is at ${g.voices[0].weight.toFixed(2)}`)
}
// 5. Jitter: grains start late, never early
{
  const g = new GrainScheduler(); const s = { ...base, jitter: 1, density: 8 }
  g.step(0, s, 0, 120, 4, null, rng)
  ok(g.voiceCount < 8, `jitter 100%: ${g.voiceCount} of 8 grains started at once`)
}
// 6. Freeze holds the picture
{
  const g = new GrainScheduler(); g.step(0, base, 0, 120, 4, null, rng); g.step(50, base, 0, 120, 4, null, rng)
  const p = g.playhead; g.step(400, { ...base, freeze: true }, 0, 120, 4, null, rng)
  ok(g.playhead === p, 'freeze keeps the playhead')
}
// 7. Pendulum and reverse orders
for (const [mode, want] of [['pendulum', '0,1,2,3,2,1,0,1'], ['reverse', '0,3,2,1,0,3,2,1']]) {
  const g = new GrainScheduler(); const s = { ...base, sliceCount: 4, sliceSequenceMode: mode }; const seq = []
  for (let i = 0; i < 8; i++) { seq.push(g.slice); g.step(i * 1000, s, 0, 120, 4, null, rng) }
  ok(seq.join() === want, `${mode}: ${seq.join()}`)
}
console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0)
