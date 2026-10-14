import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { PersonDetectionService, TrackedBox } from '../vision/PersonDetectionService'
import { DEFAULT_SEG_FACELOCK_PARAMS, type SegFaceLockParams } from '../../stores/segStore'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { beatsToSeconds } from './segShared'

const INSETS = 2
/** The overlay canvas is at most this long side; lines and text scale with it. */
const OVERLAY_LONG_SIDE = 1600
/** Display boxes ease towards the detections (which arrive ~15 times a second). */
const EASE = 0.3
const GRAPH = 64

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D overlay;
uniform float hasOverlay;
uniform vec4 insetRect[${INSETS}];  // where each crop is drawn (uv, origin bottom left)
uniform vec4 cropRect[${INSETS}];   // the part of the frame it shows
uniform float insetMode[${INSETS}]; // -1 hidden, 0 clean, 1 mosaic, 2 block, 3 edges, 4 dark
uniform vec2 resolution;
uniform float effectMix;

vec3 crop(vec2 s, vec2 t, float mode, vec4 c) {
  if (mode > 0.5 && mode < 1.5) {
    vec2 q = (floor(t * 9.0) + 0.5) / 9.0;
    return texture2D(inputBuffer, mix(c.xy, c.zw, q)).rgb;
  }
  vec3 col = texture2D(inputBuffer, s).rgb;
  if (mode > 1.5 && mode < 2.5) {
    // An orange block over the middle of the face
    vec2 d = abs(t - vec2(0.5, 0.55));
    if (max(d.x, d.y) < 0.2) col = mix(vec3(1.0, 0.62, 0.1), vec3(0.95, 0.35, 0.05), t.y);
  } else if (mode > 2.5 && mode < 3.5) {
    vec2 e = (c.zw - c.xy) / 160.0;
    float gx = luminance(texture2D(inputBuffer, s + vec2(e.x, 0.0)).rgb) - luminance(texture2D(inputBuffer, s - vec2(e.x, 0.0)).rgb);
    float gy = luminance(texture2D(inputBuffer, s + vec2(0.0, e.y)).rgb) - luminance(texture2D(inputBuffer, s - vec2(0.0, e.y)).rgb);
    col = vec3(smoothstep(0.06, 0.2, length(vec2(gx, gy))));
  } else if (mode > 3.5) {
    col = vec3(step(0.45, luminance(col))) * 0.85;
  }
  return col;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  for (int i = 0; i < ${INSETS}; i++) {
    vec4 r = insetRect[i];
    float m = insetMode[i];
    if (m >= 0.0 && uv.x >= r.x && uv.x <= r.z && uv.y >= r.y && uv.y <= r.w) {
      vec2 t = (uv - r.xy) / (r.zw - r.xy);
      vec4 c = cropRect[i];
      col = crop(mix(c.xy, c.zw, t), t, m, c);
    }
  }
  if (hasOverlay > 0.5) {
    vec4 o = texture2D(overlay, uv);
    col = mix(col, o.rgb, o.a);
  }
  outputColor = vec4(mix(inputColor.rgb, col, effectMix), inputColor.a);
}
`

interface Box { x: number; y: number; w: number; h: number; score: number; id: number }

const pad = (n: number, d = 4) => String(Math.max(0, Math.round(n))).padStart(d, '0')
const hex = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(4, '0').slice(-4)

/**
 * Face lock: the main face gets a bracket with "FACE LOCK" / "EXHIBIT A" and its coordinates, a leader
 * line to an enlarged crop of it in the top left corner (a second face gets a second crop), and
 * readouts sit in the corners with a live trace. Faces come from the face detector; when it finds
 * none, the head of the largest person stands in. Crops glitch now and then on the beat.
 */
export class SegFaceLockEffect extends Effect {
  private detect: PersonDetectionService | null = null
  private p: SegFaceLockParams = { ...DEFAULT_SEG_FACELOCK_PARAMS }
  private width = 1920
  private height = 1080
  private bpm = 120
  private readonly canvas = document.createElement('canvas')
  private readonly ctx = this.canvas.getContext('2d')!
  private readonly overlay = new THREE.CanvasTexture(this.canvas)
  private readonly insetRects = Array.from({ length: INSETS }, () => new THREE.Vector4())
  private readonly cropRects = Array.from({ length: INSETS }, () => new THREE.Vector4())
  private readonly modes = new Array(INSETS).fill(-1)
  private shown: (Box | null)[] = [null, null]
  private sinceFx = 0
  private fxSeed = 1
  private elapsed = 0
  private readonly trace: number[] = new Array(GRAPH).fill(0.5)
  private readonly trace2: number[] = new Array(GRAPH / 2).fill(0.5)
  private walk = 0.5
  private heading = 267.2
  private buf = 0xc9ed

  constructor(params: Partial<SegFaceLockParams> = {}) {
    super('SegFaceLockEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['overlay', new THREE.Uniform(null)],
        ['hasOverlay', new THREE.Uniform(0)],
        ['insetRect', new THREE.Uniform([] as THREE.Vector4[])],
        ['cropRect', new THREE.Uniform([] as THREE.Vector4[])],
        ['insetMode', new THREE.Uniform([] as number[])],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(1)],
      ]),
    })
    this.overlay.colorSpace = THREE.NoColorSpace
    this.overlay.minFilter = THREE.LinearFilter
    this.overlay.generateMipmaps = false
    this.uniforms.get('overlay')!.value = this.overlay
    this.uniforms.get('insetRect')!.value = this.insetRects
    this.uniforms.get('cropRect')!.value = this.cropRects
    this.uniforms.get('insetMode')!.value = this.modes
    this.updateParams(params)
  }

  setDetection(d: PersonDetectionService) { this.detect = d }
  setBpm(bpm: number) { this.bpm = bpm }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(this.width, this.height)
    const k = Math.min(1, OVERLAY_LONG_SIDE / Math.max(this.width, this.height))
    this.canvas.width = Math.max(1, Math.round(this.width * k))
    this.canvas.height = Math.max(1, Math.round(this.height * k))
  }

  /** Faces, largest first; with none, the head of each person (top of the box, a little narrower). */
  private targets(): Box[] {
    const faces = this.detect?.faces.tracks ?? []
    // The clearest face gets the lock: confidence counts as much as size
    if (faces.length) return faces.map((f) => ({ ...f })).sort((a, b) => b.score ** 2 * b.w * b.h - a.score ** 2 * a.w * a.h)
    const people: TrackedBox[] = this.detect?.people.tracks ?? []
    const aspect = this.width / this.height
    return people.slice(0, INSETS).map((t) => {
      const w = t.w * 0.42
      const h = Math.min(t.h * 0.22, (w * aspect) * 1.15)
      return { id: t.id + 1000, x: t.x + (t.w - w) / 2, y: t.y + t.h * 0.02, w, h, score: t.score * 0.8 }
    })
  }

  update(_renderer: THREE.WebGLRenderer, _input: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.sinceFx += deltaTime
    const interval = beatsToSeconds(this.p.fxBeats, this.bpm)
    let newBeat = false
    if (this.sinceFx >= interval - 1e-6) { this.sinceFx = (this.sinceFx - interval) % interval; this.fxSeed++; newBeat = true }

    // Ease the shown boxes towards the detections; drop a slot when its face is gone
    const targets = this.targets()
    for (let i = 0; i < INSETS; i++) {
      const t = targets[i]
      const s = this.shown[i]
      if (!t) { this.shown[i] = null; continue }
      if (!s || s.id !== t.id) { this.shown[i] = { ...t }; continue }
      s.x += (t.x - s.x) * EASE; s.y += (t.y - s.y) * EASE; s.w += (t.w - s.w) * EASE; s.h += (t.h - s.h) * EASE
      s.score = t.score
    }

    const W = this.width, H = this.height, short = Math.min(W, H)
    const size = this.p.insetSize * short
    const iw = size / W, ih = size / H
    const left = 0.04, top = 0.115
    for (let i = 0; i < INSETS; i++) {
      const f = this.shown[i]
      if (!f || i >= this.p.insets) { this.modes[i] = -1; continue }
      // Room for the two text lines under each crop
      const gap = (Math.min(W, H) * 0.017 * 3.6) / H
      const y0 = top + i * (ih + gap)
      this.insetRects[i].set(left, 1 - (y0 + ih), left + iw, 1 - y0)
      // A square crop around the face, `zoom` face-heights tall, kept inside the frame
      const cs = Math.min(short, f.h * H * this.p.zoom)
      const cw = cs / W, ch = cs / H
      const cx = Math.min(1 - cw / 2, Math.max(cw / 2, f.x + f.w / 2))
      const cy = Math.min(1 - ch / 2, Math.max(ch / 2, f.y + f.h / 2))
      this.cropRects[i].set(cx - cw / 2, 1 - (cy + ch / 2), cx + cw / 2, 1 - (cy - ch / 2))
      if (newBeat || this.modes[i] < 0) {
        const r = rand(this.fxSeed * 31 + i)
        this.modes[i] = r < this.p.insetFx ? 1 + Math.floor(rand(this.fxSeed * 7 + i * 3) * 4) : 0
      }
    }

    // Readout values drift a little each frame
    this.walk = Math.min(0.95, Math.max(0.05, this.walk + (Math.random() - 0.5) * 0.12))
    this.trace.push(this.walk); this.trace.shift()
    this.trace2.push(0.5 + (Math.random() - 0.5) * 0.8); this.trace2.shift()
    this.heading = (this.heading + (Math.random() - 0.5) * 0.6 + 360) % 360
    if (newBeat) this.buf = (this.buf * 1103515245 + 12345) & 0xffff

    this.draw()
  }

  private draw() {
    const ctx = this.ctx
    const cw = this.canvas.width, ch = this.canvas.height
    const short = Math.min(cw, ch)
    ctx.clearRect(0, 0, cw, ch)
    const show = this.p.box > 0.5 || this.p.hud > 0.5
    this.uniforms.get('hasOverlay')!.value = show ? 1 : 0
    if (!show) { this.overlay.needsUpdate = true; return }
    const fs = Math.max(8, Math.round(short * 0.017))
    const lw = Math.max(1, short / 700)
    ctx.font = `${fs}px "IBM Plex Mono", ui-monospace, monospace`
    ctx.textBaseline = 'top'
    ctx.globalAlpha = this.p.opacity
    ctx.strokeStyle = '#f4f4f4'
    ctx.fillStyle = '#f4f4f4'
    ctx.lineWidth = lw

    const main = this.shown[0]
    if (this.p.box > 0.5) {
      for (let i = 0; i < INSETS; i++) {
        const f = this.shown[i]
        if (!f) continue
        const bx = f.x * cw, by = f.y * ch, bw = f.w * cw, bh = f.h * ch
        // Bracket: a thin box with heavier corners
        ctx.strokeRect(bx, by, bw, bh)
        const k = Math.min(bw, bh) * 0.18
        ctx.lineWidth = lw * 2
        for (const [x, y, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
          ctx.beginPath(); ctx.moveTo(x + dx * k, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * k); ctx.stroke()
        }
        ctx.lineWidth = lw
        const lock = i === 0 ? 'FACE LOCK' : 'FACE TRACK'
        const exhibit = `EXHIBIT ${String.fromCharCode(65 + i)}`
        // The lock label sits over the box's right edge, the exhibit label off its left edge
        ctx.fillText(lock, bx + bw - ctx.measureText(lock).width, by - fs * 1.4)
        ctx.fillText(exhibit, Math.max(0, Math.min(bx + bw - ctx.measureText(lock).width, bx) - ctx.measureText(exhibit).width - fs), by - fs * 1.4)
        ctx.fillText(`X ${pad((f.x + f.w / 2) * 1000)}  Y ${pad((f.y + f.h / 2) * 1000)}`, bx + bw * 0.1, by + bh + fs * 0.5)
        // Leader line from the crop's corner to the face, with square ends
        if (i < this.p.insets) {
          const r = this.insetRects[i]
          const ix = r.z * cw, iy = (1 - r.y) * ch
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(bx, by); ctx.stroke()
          const d = lw * 3
          ctx.fillRect(ix - d, iy - d, d * 2, d * 2)
          ctx.fillRect(r.x * cw - d, (1 - r.w) * ch - d, d * 2, d * 2)
          // Crop frame and its labels
          ctx.strokeRect(r.x * cw, (1 - r.w) * ch, (r.z - r.x) * cw, (r.w - r.y) * ch)
          if (i === 0) ctx.fillText('LOCK A00', r.z * cw - fs * 5, (1 - r.w) * ch - fs * 1.4)
          ctx.fillText(`[ ] ${hex(this.buf + i * 97)}${hex(f.id * 2654435761)}  FACE  X ${pad(f.x * 1000, 3)} Y ${pad(f.y * 1000, 3)}`, r.x * cw + fs * 1.5, iy + fs * 0.6)
          ctx.fillText(`[>>>${'='.repeat(6 + (this.fxSeed % 5))}]  ${(f.score * 100).toFixed(2)}`, r.x * cw + fs * 1.5, iy + fs * 1.8)
        }
      }
    }

    if (this.p.hud > 0.5) {
      const m = fs * 1.2
      const line = (x: number, y: number, rows: string[]) => rows.forEach((t, k) => ctx.fillText(t, x, y + k * fs * 1.45))
      const conf = main ? main.score : 0
      const cx = main ? main.x + main.w / 2 : 0.5, cy = main ? main.y + main.h / 2 : 0.5
      // Top corners
      line(m, m, ['TGT / RADAR'])
      const tr = 'DEPTH / RANGE'
      line(cw - m - ctx.measureText(tr).width, m, [tr, `Z ${(main ? 1 / Math.max(0.05, main.h * 6) : 0).toFixed(2)}`])
      this.plot(this.trace2, cw - m - fs * 7, m + fs * 3.4, fs * 7, fs * 2.2)
      // Bottom left: scan block and trace
      const blY = ch - m - fs * 13.5
      line(m, blY, ['SCAN  FACE', 'CAM   REAR', `LOCK  ${main ? 1 : 0}`, `CONF  ${conf.toFixed(2)}`, `UV    ${cx.toFixed(2)} ${cy.toFixed(2)}`, `[ - ] BUF ${hex(this.buf)}`])
      const gx = m, gy = ch - m - fs * 4.2, gw = Math.min(cw * 0.3, fs * 16), gh = fs * 3.6
      ctx.strokeRect(gx, gy, gw, gh)
      this.plot(this.trace, gx, gy, gw, gh)
      // Bottom right: nav block and signal bar
      const rows = ['NAV / LINK', `HDG ${this.heading.toFixed(1)}`, `POS ${cx.toFixed(3)} ${cy.toFixed(3)}`, `DST ${(main ? 0.25 / Math.max(0.02, main.h) : 0).toFixed(2)}`,
        `BUS REAR [ - ] POSTIL ${hex(this.buf ^ 0x1c4f)}`, `SIG [${'|'.repeat(Math.round(this.walk * 10)).padEnd(10, '.')}]`]
      const rw = Math.max(...rows.map((t) => ctx.measureText(t).width))
      line(cw - m - rw, ch - m - fs * 1.45 * rows.length, rows)
    }
    ctx.globalAlpha = 1
    this.overlay.needsUpdate = true
  }

  private plot(v: number[], x: number, y: number, w: number, h: number) {
    const ctx = this.ctx
    ctx.beginPath()
    v.forEach((s, i) => {
      const px = x + (i / (v.length - 1)) * w, py = y + h * (1 - s)
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }

  updateParams(params: Partial<SegFaceLockParams>) {
    this.p = { ...this.p, ...params }
    this.uniforms.get('effectMix')!.value = this.p.mix
  }

  dispose() {
    this.overlay.dispose()
    super.dispose()
  }
}

/** Deterministic 0..1 from an integer. */
function rand(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
