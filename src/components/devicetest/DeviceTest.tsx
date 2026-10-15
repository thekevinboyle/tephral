import { useEffect, useRef, useState } from 'react'
import { useMediaSource } from '../../hooks/useMediaSource'
import { toggleEffect, isEffectActive } from '../../hooks/useEffectToggle'
import { useWarpStore } from '../../stores/warpStore'
import { usePerfTierStore, TIER_LIMITS } from '../../stores/perfTierStore'
import { perfMonitor } from '../../utils/perfMonitor'
import { visionDelegate, visionMode } from '../../effects/vision/visionWorkerClient'

/*
 * Device test (open the app with ?devicetest). The go/no-go for iOS: on a real phone, does the engine hold
 * 30 fps in the Mobile tier for the whole run without iOS killing the page, and does a recording with audio
 * come out intact? Phases add load step by step (shader effects, the time warp, the person and face effects),
 * then a recording runs on top. Progress is saved every 2 s, so a page iOS killed reports where it died on the
 * next load. Results can be copied or shared.
 */

const KEY = 'seg.devicetest'
const SHADER_FX = ['rgb_split', 'block_displace', 'vhs', 'halation', 'posterize']
const VISION_FX = ['seg_redact', 'seg_facelock']

interface PhaseResult { id: string; label: string; secs: number; fps: number[]; longFrames: number }
interface RecResult { mime: string; sizeKB: number; durationS: number; width: number; height: number; audioS: number; ok: boolean; error?: string }
interface HdrResult { videoFrame: string; greys: number[]; verdict: string }
interface Saved { vision?: string; status: 'running' | 'done'; startedAt: number; mode: string; phase: string; elapsed: number; phases: PhaseResult[]; rec?: RecResult; hdr?: HdrResult; contextLost: boolean; device: Record<string, unknown> }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const pct = (arr: number[], p: number) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const median = (arr: number[]) => pct(arr, 0.5)
const stageCanvas = () => document.querySelector<HTMLCanvasElement>('canvas[data-stage-gl]')

function readSaved(): Saved | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as Saved : null } catch { return null }
}
function writeSaved(s: Saved) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* nothing to keep */ } }

function deviceInfo(): Record<string, unknown> {
  const c = document.createElement('canvas').getContext('webgl2')
  const dbg = c?.getExtension('WEBGL_debug_renderer_info')
  const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
  return {
    ua: navigator.userAgent, screen: `${screen.width}x${screen.height}`, dpr: devicePixelRatio, touch: navigator.maxTouchPoints,
    gpu: c ? (dbg ? c.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER)) : 'no WebGL2',
    maxTexture: c?.getParameter(c.MAX_TEXTURE_SIZE) ?? 0,
    recorder: typeof MediaRecorder === 'undefined' ? [] : types.filter((t) => MediaRecorder.isTypeSupported(t)),
    videoFrame: typeof VideoFrame !== 'undefined', audioWorklet: typeof AudioWorkletNode !== 'undefined',
    tier: usePerfTierStore.getState().tier, limits: TIER_LIMITS.mobile,
  }
}

/**
 * iPhone Safari does not load a video that is not in the page and playing, so play it muted, hidden, then read it.
 * Resolves once a frame is decoded (or after `ms`); the caller removes the element.
 */
async function loadInPage(src: string, ms = 10000): Promise<{ v: HTMLVideoElement; error?: string }> {
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.autoplay = true; v.preload = 'auto'
  v.setAttribute('playsinline', '')
  Object.assign(v.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none' })
  document.body.appendChild(v)
  v.src = src
  let error: string | undefined
  const ready = new Promise<void>((r) => { v.addEventListener('loadeddata', () => r(), { once: true }); v.addEventListener('playing', () => r(), { once: true }) })
  const failed = new Promise<void>((r) => v.addEventListener('error', () => { error = `media error ${v.error?.code ?? '?'}: ${v.error?.message ?? ''}`; r() }, { once: true }))
  v.play().catch((e) => { error = `play(): ${e?.name ?? e}` })
  await Promise.race([ready, failed, wait(ms)])
  if (v.readyState < 2 && !error) error = `not loaded after ${ms / 1000} s (readyState ${v.readyState})`
  return { v, error }
}

/** 60 s (or `secs`) of the stage canvas plus a quiet tone through MediaRecorder, then check both tracks come back. */
async function recordProbe(secs: number, ac: AudioContext): Promise<RecResult> {
  const canvas = stageCanvas()
  if (!canvas || typeof MediaRecorder === 'undefined') return { mime: '', sizeKB: 0, durationS: 0, width: 0, height: 0, audioS: 0, ok: false, error: 'no canvas or MediaRecorder' }
  const video = canvas.captureStream(30)
  const osc = ac.createOscillator(), gain = ac.createGain(), dest = ac.createMediaStreamDestination()
  gain.gain.value = 0.03
  osc.connect(gain).connect(dest)
  osc.start()
  const stream = new MediaStream([...video.getVideoTracks(), ...dest.stream.getAudioTracks()])
  const mime = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
  const chunks: Blob[] = []
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>((r) => { rec.onstop = () => r() })
  rec.start(1000)
  await wait(secs * 1000)
  rec.stop()
  await stopped
  osc.stop()
  stream.getTracks().forEach((t) => t.stop())
  const blob = new Blob(chunks, { type: rec.mimeType || mime })
  lastRecording = blob
  const out: RecResult = { mime: blob.type, sizeKB: Math.round(blob.size / 1024), durationS: 0, width: 0, height: 0, audioS: 0, ok: false }
  try {
    const { v, error } = await loadInPage(URL.createObjectURL(blob))
    let d = v.duration
    if (!Number.isFinite(d)) { v.currentTime = 1e9; await Promise.race([new Promise((r) => { v.ondurationchange = r }), wait(5000)]); d = v.duration }
    Object.assign(out, { durationS: +(+d || 0).toFixed(1), width: v.videoWidth, height: v.videoHeight })
    if (error) out.error = `video: ${error}`
    v.pause(); v.remove()
  } catch (e) { out.error = `video: ${e}` }
  try { out.audioS = +(await ac.decodeAudioData(await blob.arrayBuffer())).duration.toFixed(1) } catch (e) { out.error = (out.error ? out.error + '; ' : '') + `audio: ${e}` }
  out.ok = out.width > 0 && out.durationS > secs * 0.8 && out.audioS > secs * 0.8
  return out
}
let lastRecording: Blob | null = null

/** Does Safari hand WebGL the raw HLG signal (Chrome does) or already tone-map it? Reads a known grey ramp. */
async function hdrProbe(): Promise<HdrResult> {
  const { v, error } = await loadInPage('/devicetest/hlg-pattern.mp4')
  if (error || v.readyState < 2) { v.remove(); return { videoFrame: 'n/a', greys: [], verdict: `could not play the HLG clip (HEVC): ${error ?? 'no frame'}` } }
  await wait(300)
  v.pause()
  let cs = 'n/a'
  try { const f = new VideoFrame(v); cs = JSON.stringify(f.colorSpace.toJSON()); f.close() } catch (e) { cs = `unsupported (${e})` }
  const gl = document.createElement('canvas').getContext('webgl2')
  if (!gl) return { videoFrame: cs, greys: [], verdict: 'no WebGL2' }
  const W = v.videoWidth, H = v.videoHeight
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v)
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  const px = new Uint8Array(4)
  const greys: number[] = []
  for (let i = 1; i < 16; i += 2) { gl.readPixels(Math.round(((i + 0.5) / 16) * W), Math.round(H / 4), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); greys.push(px[1]) }
  // The clip's grey steps are HLG code values i * 17; raw = WebGL got them unchanged
  const raw = greys.filter((g, k) => Math.abs(g - (2 * k + 1) * 17) <= 6).length >= 6
  v.remove()
  return { videoFrame: cs, greys, verdict: raw ? 'raw HLG (the app tone-maps it)' : 'converted by Safari (tone-mapping must be skipped here)' }
}

export function DeviceTest() {
  const { activateWebcam } = useMediaSource()
  const [saved, setSaved] = useState<Saved | null>(() => readSaved())
  const [live, setLive] = useState<{ phase: string; left: number; fps: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const stop = useRef(false)
  const previousCrash = saved?.status === 'running'

  useEffect(() => {
    // A canvas that loses its WebGL context is as bad as a kill; note it
    const c = stageCanvas()
    const lost = () => { const s = readSaved(); if (s) { s.contextLost = true; writeSaved(s) } }
    c?.addEventListener('webglcontextlost', lost)
    return () => c?.removeEventListener('webglcontextlost', lost)
  }, [busy])

  const run = async (mode: 'quick' | 'full') => {
    stop.current = false
    setBusy(true)
    const ac = new AudioContext() // created in the tap, so iOS lets it run
    usePerfTierStore.getState().setTier('mobile')
    const s: Saved = { status: 'running', startedAt: Date.now(), mode, phase: 'camera', elapsed: 0, phases: [], contextLost: false, device: deviceInfo() }
    writeSaved(s); setSaved({ ...s })
    await activateWebcam()
    await wait(1500)
    // ?devicetest&secs=N shortens every step to N s (for checking the test itself)
    const short = Number(new URLSearchParams(location.search).get('secs')) || 0
    const secs = short ? [short, short, short] : mode === 'full' ? [150, 150, 240] : [45, 45, 60]
    const recSecs = short || (mode === 'full' ? 60 : 30)
    const plan: { id: string; label: string; enter: () => void }[] = [
      { id: 'shaders', label: '5 shader effects', enter: () => SHADER_FX.forEach((id) => { if (!isEffectActive(id)) toggleEffect(id) }) },
      { id: 'warp', label: '+ time warp', enter: () => { const w = useWarpStore.getState(); w.loadPreset('Stutter build'); w.patch({ amount: 1 }); w.setEnabled(true) } },
      { id: 'vision', label: '+ person and face effects', enter: () => VISION_FX.forEach((id) => { if (!isEffectActive(id)) toggleEffect(id) }) },
    ]
    /** Sample rendered fps for the step until `secs` pass (or `until` resolves), saving progress every 2 s. */
    const measure = (ph: PhaseResult, until?: Promise<unknown>) => new Promise<void>((done) => {
      let finished = false
      until?.then(() => { finished = true })
      const t0 = performance.now()
      // Rendered frames (perfMonitor.drawn), not display refreshes: the Mobile tier draws every other one
      let last = t0, drawn0 = perfMonitor.drawn, secStart = t0, lastSave = t0
      const tick = (now: number) => {
        if (now - last > 100) ph.longFrames++
        last = now
        if (now - secStart >= 1000) {
          const fps = ((perfMonitor.drawn - drawn0) * 1000) / (now - secStart)
          ph.fps.push(+fps.toFixed(1)); drawn0 = perfMonitor.drawn; secStart = now
          setLive({ phase: ph.label, left: Math.max(0, Math.round(ph.secs - (now - t0) / 1000)), fps: Math.round(fps) })
        }
        if (now - lastSave > 2000) { s.elapsed = Math.round((Date.now() - s.startedAt) / 1000); writeSaved(s); lastSave = now }
        if (stop.current || finished || (!until && now - t0 >= ph.secs * 1000)) { done(); return }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    for (let p = 0; p < plan.length && !stop.current; p++) {
      const ph: PhaseResult = { id: plan[p].id, label: plan[p].label, secs: secs[p], fps: [], longFrames: 0 }
      s.phases.push(ph); s.phase = ph.id
      plan[p].enter()
      await measure(ph)
    }
    if (!stop.current) {
      // Record at the app's recording size (720p), as REC does, and keep measuring while it records
      const ph: PhaseResult = { id: 'record', label: '+ recording at 720p', secs: recSecs, fps: [], longFrames: 0 }
      s.phases.push(ph); s.phase = 'record'; writeSaved(s)
      usePerfTierStore.getState().setRecording(true)
      await wait(300) // the drawing buffer resizes first
      const probe = recordProbe(recSecs, ac)
      await measure(ph, probe)
      s.rec = await probe
      usePerfTierStore.getState().setRecording(false)
      s.phase = 'hdr'; writeSaved(s)
      setLive({ phase: 'HDR check', left: 0, fps: 0 })
      s.hdr = await hdrProbe()
    }
    s.vision = `${visionMode() === 'worker' ? 'in a background worker' : 'on the main thread'}${visionDelegate() ? ` (${visionDelegate()})` : ''}`
    s.status = 'done'; s.elapsed = Math.round((Date.now() - s.startedAt) / 1000)
    writeSaved(s); setSaved({ ...s }); setLive(null); setBusy(false)
    ac.close()
  }

  const report = saved && saved.status === 'done' ? summarize(saved) : null
  const text = report ? `SEG_F4ULT device test\n${report.lines.join('\n')}\n\n${JSON.stringify(saved)}` : ''

  return (
    <div className="seg-devtest" data-devicetest>
      <div className="seg-devtest-title">Device test</div>
      {previousCrash && !busy && (
        <p className="seg-devtest-warn">The last run stopped during <b>{saved!.phase}</b> after {saved!.elapsed} s and never finished: iOS most likely closed the page for using too much memory.</p>
      )}
      {!busy && (
        <>
          <p>Runs the camera through more and more effects in Mobile quality, then records with audio. Keep the phone unlocked and the app in front. Quick: about 3 min. Full: about 10 min.</p>
          <div className="seg-devtest-row">
            <button onClick={() => run('quick')}>Start quick</button>
            <button onClick={() => run('full')}>Start full (10 min)</button>
          </div>
        </>
      )}
      {busy && live && (
        <div className="seg-devtest-live">
          <div>{live.phase}</div>
          <div className="seg-devtest-big">{live.fps ? `${live.fps} fps` : '…'}</div>
          <div>{live.left} s left in this step</div>
          <button onClick={() => { stop.current = true }}>Stop</button>
        </div>
      )}
      {report && !busy && (
        <div className="seg-devtest-report">
          {report.lines.map((l, i) => <div key={i} data-pass={l.startsWith('PASS') || undefined} data-fail={l.startsWith('FAIL') || undefined}>{l}</div>)}
          <div className="seg-devtest-row">
            <button onClick={() => navigator.clipboard?.writeText(text)}>Copy results</button>
            {'share' in navigator && <button onClick={() => navigator.share({ title: 'SEG_F4ULT device test', text }).catch(() => {})}>Share results</button>}
            {lastRecording && 'share' in navigator && (
              <button onClick={() => {
                const ext = lastRecording!.type.includes('mp4') ? 'mp4' : 'webm'
                navigator.share({ files: [new File([lastRecording!], `seg-devicetest.${ext}`, { type: lastRecording!.type })] }).catch(() => {})
              }}>Share test clip</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function summarize(s: Saved) {
  const lines: string[] = []
  // Each step's first 5 s are warm-up (a model loading, a ring filling) when the step is long enough to leave them out
  const steady = (p: PhaseResult) => (p.fps.length > 20 ? p.fps.slice(5) : p.fps)
  const phaseLine = (p: PhaseResult) => {
    const f = steady(p), first = f.slice(0, 30), lastFps = f.slice(-30)
    const drop = median(first) ? Math.round((1 - median(lastFps) / median(first)) * 100) : 0
    return `${p.label}: median ${median(f)} fps, low ${pct(f, 0.1)} fps, ${p.longFrames} stalls, ${drop > 0 ? `${drop}% slower by the end` : 'no slow-down'}`
  }
  s.phases.forEach((p) => lines.push(phaseLine(p)))
  const heavy = s.phases.find((p) => p.id === 'vision') ?? s.phases[s.phases.length - 1]
  const sustain = !!heavy && median(steady(heavy)) >= 27 && pct(steady(heavy), 0.1) >= 20
  lines.push(`${sustain ? 'PASS' : 'FAIL'} 30 fps with everything on (median 27+, low 20+)`)
  lines.push(`${s.contextLost ? 'FAIL' : 'PASS'} the graphics context survived`)
  if (s.rec) lines.push(`${s.rec.ok ? 'PASS' : 'FAIL'} recording: ${s.rec.mime || 'none'}, ${s.rec.durationS} s video ${s.rec.width}x${s.rec.height}, ${s.rec.audioS} s audio, ${s.rec.sizeKB} KB${s.rec.error ? ` (${s.rec.error})` : ''}`)
  if (s.hdr) lines.push(`HDR: ${s.hdr.verdict}; frame colour space ${s.hdr.videoFrame}; greys ${s.hdr.greys.join(',')}`)
  if (s.vision) lines.push(`Vision: ${s.vision}`)
  lines.push(`Device: ${String(s.device.gpu)}, ${String(s.device.screen)} @${String(s.device.dpr)}x, run ${s.elapsed} s`)
  return { lines }
}
