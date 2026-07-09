import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { getSharedFrame } from '../../components/overlays/sharedReadback'

// GPU port of src/components/overlays/strand/strandWebEffect.ts (CPU ground
// truth, effect id 'strand_web') — HYBRID CPU-points / GPU-lines design.
//
// The first all-GPU port (per-cell 8-neighbour fragment web on a fixed 24x14
// grid) failed review: it read as uniform starbursts and collapsed to ~2
// segments in the sparse (threshold=0.85) case where the CPU shows a 15+-node
// connected chain. The CPU's "sort ALL bright points by distance and connect
// each to its globally-nearest N" has no faithful bounded per-pixel formula,
// so this rework runs that exact algorithm on the CPU and hands the resulting
// segments to the GPU as a uniform list to rasterise.
//
// PER-FRAME CPU STEP (update()):
//   1. Read the Phase-1 shared readback canvas via getSharedFrame(
//      renderer.domElement) — the already-paid-for 960x540 CPU copy of the
//      composited WebGL output. getImageData is called at most ONCE per frame
//      (getSharedFrame's stamp gate collapses repeat reads to a single
//      drawImage; we call getImageData once inside this method), and update()
//      itself is only invoked while the effect's EffectPass is in the active
//      chain — i.e. only while strand_web is ENABLED. On disable the pass is
//      removed from the composer, update() stops being called, no CPU work
//      runs, and no timers are left behind (clean drop).
//   2. Replicate the CPU algorithm EXACTLY, but in the 960x540 sample space:
//      a fixed 20px grid, keep the single brightest pixel above `threshold`
//      per cell (brightness = (r+g+b)/(3*255) on raw sRGB bytes, matching the
//      CPU verbatim — no linearisation, since the CPU sampled canvas bytes).
//      Both the grid stride (20px) AND the max connection distance (200px)
//      live in the SAME 960x540 space, so their RATIO (connection reach = 10
//      cells) is identical to the CPU's 20px/200px at its own resolution —
//      the web topology depends on reach-in-cells, not absolute pixels, so
//      this reproduces the CPU's connectivity independent of canvas size.
//      Each point connects to its distance-sorted nearest `maxConnections`
//      within 200px, exactly as the CPU does.
//   3. Points capped at POINT_CAP (brightest kept) and segments at SEG_CAP
//      (shortest kept — preserves the tight local mesh in the dense case).
//      These bound the uniform arrays; the CPU's practical counts in the
//      sparse/mid cases sit well under the caps, so parity there is faithful.
//
// GPU STEP (fragment shader): rasterise the uniform segment list via
// distance-to-segment glow (bounded ≤SEG_CAP iterations, runtime uSegCount)
// plus a dot glow at each bright point (≤POINT_CAP), matching the CPU's line
// width (1+glowIntensity), cyan→hot traveling particle, screen blend and
// per-point dot radius/alpha. Compositing is done in sRGB (linearToSRGB in,
// blendScreen the sRGB cyan/hot colours, sRGBToLinear out) so the screen
// blend matches the CPU's canvas-space blend.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.

// Caps bound the uniform arrays AND the per-pixel shader loop. The CPU's
// practical point count is far higher than the task brief's "e.g. 48" estimate
// (324 bright points at threshold 0.85, 1058 at 0.3 on the reference frame), so
// these are sized generously — the GPU reports 1024 fragment uniform vectors,
// and 256/320 keeps the per-pixel loop affordable while giving a web dense
// enough to read as the CPU's organic mesh rather than a sparse constellation.
const POINT_CAP = 256
const SEG_CAP = 512
const SEED_SLOTS = SEG_CAP / 4 // 4 phase seeds packed per vec4

// Pixel source for the CPU point-find — the shared readback canvas size.
const SAMPLE_W = 960
const SAMPLE_H = 540
// GRID and MAX_DIST are in DISPLAY (container) px, matching the CPU verbatim.
const GRID = 20 // 20px grid cell (CPU)
const MAX_DIST = 200 // 200px max connection distance (CPU)

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float glowIntensity;
uniform float effectMix;
uniform float uTime;
uniform vec2 resolution;
uniform int uSegCount;
uniform int uPointCount;
uniform vec4 uSegs[${SEG_CAP}];       // xy = endpoint A (uv), zw = endpoint B (uv)
uniform vec4 uSegSeed[${SEED_SLOTS}]; // 4 per-segment phase seeds packed per vec4
uniform vec4 uPoints[${POINT_CAP}];   // xy = point (uv), z = brightness

float webSegDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 cyan = vec3(0.0, 212.0, 255.0) / 255.0;
  vec3 hot = vec3(200.0, 255.0, 255.0) / 255.0;
  vec2 px = uv * resolution;
  vec3 c = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  for (int i = 0; i < ${SEG_CAP}; i++) {
    if (i >= uSegCount) break;
    vec4 s = uSegs[i];
    vec2 a = s.xy * resolution;
    vec2 b = s.zw * resolution;
    float d = webSegDist(px, a, b);
    float halfW = (1.0 + glowIntensity) * 0.5;
    float cov = 1.0 - smoothstep(halfW, halfW + 1.25, d);
    if (cov <= 0.0) continue;

    float segLen2 = dot(b - a, b - a);
    float t = clamp(dot(px - a, b - a) / max(segLen2, 1e-5), 0.0, 1.0);

    int slot = i / 4;
    int comp = i - slot * 4;
    vec4 sv = uSegSeed[slot];
    float seed = comp == 0 ? sv.x : (comp == 1 ? sv.y : (comp == 2 ? sv.z : sv.w));
    float pulse = fract(uTime * 2.0 + seed);
    float travel = 1.0 - smoothstep(0.0, 0.1, abs(t - pulse));

    vec3 lineColor = mix(cyan, hot, travel);
    float baseA = glowIntensity * 0.3;
    float alpha = mix(baseA, glowIntensity * 0.8, travel) * cov;
    c = mix(c, blendScreen(c, lineColor), alpha);
  }

  for (int i = 0; i < ${POINT_CAP}; i++) {
    if (i >= uPointCount) break;
    vec4 pt = uPoints[i];
    vec2 pp = pt.xy * resolution;
    float pr = 3.0 + glowIntensity * 2.0;
    float pd = distance(px, pp);
    float pcov = 1.0 - smoothstep(pr - 1.0, pr + 1.0, pd);
    if (pcov <= 0.0) continue;
    float a = glowIntensity * pt.z * pcov;
    c = mix(c, blendScreen(c, cyan), a);
  }

  vec3 outc = sRGBToLinear(c);
  outputColor = mix(inputColor, vec4(outc, 1.0), effectMix);
}
`

export interface StrandWebGpuParams {
  threshold: number
  maxConnections: number
  glowIntensity: number
  mix: number
}

export const DEFAULT_STRAND_WEB_GPU_PARAMS: StrandWebGpuParams = {
  threshold: 0.6,
  maxConnections: 5,
  glowIntensity: 0.8,
  mix: 1,
}

interface BrightPoint {
  x: number // normalised uv x
  y: number // normalised uv y (GL-oriented, already Y-flipped)
  px: number // container px x (top-origin) — used for aspect-correct distances
  py: number // container px y (top-origin)
  brightness: number
}

export class StrandWebEffect extends Effect {
  // CPU-side params (drive the per-frame point-find; not GPU uniforms).
  private threshold = DEFAULT_STRAND_WEB_GPU_PARAMS.threshold
  private maxConnections = DEFAULT_STRAND_WEB_GPU_PARAMS.maxConnections

  // Pre-allocated flat uniform arrays (mutated in place each frame — no GC).
  private segs = new Float32Array(SEG_CAP * 4)
  private segSeed = new Float32Array(SEED_SLOTS * 4)
  private points = new Float32Array(POINT_CAP * 4)

  // Scratch canvas for the single per-frame pixel read (allocated lazily).
  private scratchCanvas: HTMLCanvasElement | null = null
  private scratchCtx: CanvasRenderingContext2D | null = null

  constructor(params: Partial<StrandWebGpuParams> = {}) {
    const p = { ...DEFAULT_STRAND_WEB_GPU_PARAMS, ...params }

    super('StrandWebEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['glowIntensity', new THREE.Uniform(p.glowIntensity)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['uTime', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['uSegCount', new THREE.Uniform(0)],
        ['uPointCount', new THREE.Uniform(0)],
        ['uSegs', new THREE.Uniform(new Float32Array(SEG_CAP * 4))],
        ['uSegSeed', new THREE.Uniform(new Float32Array(SEED_SLOTS * 4))],
        ['uPoints', new THREE.Uniform(new Float32Array(POINT_CAP * 4))],
      ]),
    })

    this.threshold = p.threshold
    this.maxConnections = p.maxConnections
    // Point the uniform arrays at our owned buffers so in-place mutation
    // re-uploads without reallocation.
    this.uniforms.get('uSegs')!.value = this.segs
    this.uniforms.get('uSegSeed')!.value = this.segSeed
    this.uniforms.get('uPoints')!.value = this.points
  }

  update(renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    // Bounded, wrapping time — keeps the traveling-particle fract() precise
    // over long sessions.
    this.uniforms.get('uTime')!.value = (performance.now() / 1000) % 100

    const source = renderer.domElement as HTMLCanvasElement
    this.computeWeb(source)
  }

  // Runs the CPU point-find + connectivity for this frame and fills the
  // uniform arrays. Skips (clears counts) if the shared frame is unavailable.
  private computeWeb(source: HTMLCanvasElement) {
    const shared = getSharedFrame(source)
    if (!shared) {
      this.uniforms.get('uSegCount')!.value = 0
      this.uniforms.get('uPointCount')!.value = 0
      return
    }

    // Copy the shared 960x540 frame once and read its pixels a single time
    // this frame.
    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas')
      this.scratchCanvas.width = SAMPLE_W
      this.scratchCanvas.height = SAMPLE_H
      this.scratchCtx = this.scratchCanvas.getContext('2d', { willReadFrequently: true })
    }
    const ctx = this.scratchCtx
    if (!ctx) {
      this.uniforms.get('uSegCount')!.value = 0
      this.uniforms.get('uPointCount')!.value = 0
      return
    }
    ctx.drawImage(shared, 0, 0, SAMPLE_W, SAMPLE_H)
    const img = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H)
    const src = img.data

    // The grid stride, cell scan and connection distances all run in the
    // DISPLAY (container) coordinate space — exactly as the CPU did (it drew the
    // 960x540 shared frame back up to the portrait container and sampled 20px
    // cells there). Working in the 960x540 landscape buffer directly would make
    // GRID/MAX_DIST anisotropic against a portrait display (the buffer squashes
    // the tall image), stretching the mesh vertically. Brightness is read from
    // the 960x540 buffer via a scaled lookup (nearest — the CPU used bilinear
    // upscale; negligible for a per-cell max).
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    const W = Math.max(2, Math.round(res.x))
    const H = Math.max(2, Math.round(res.y))
    const sx = SAMPLE_W / W
    const sy = SAMPLE_H / H

    // --- Point-find: brightest pixel > threshold per 20px display cell.
    const threshold = this.threshold
    const raw: BrightPoint[] = []
    for (let gy = 0; gy < H; gy += GRID) {
      const yEnd = Math.min(gy + GRID, H)
      for (let gx = 0; gx < W; gx += GRID) {
        const xEnd = Math.min(gx + GRID, W)
        let maxB = 0
        let mx = gx
        let my = gy
        for (let y = gy; y < yEnd; y++) {
          const by = Math.min(SAMPLE_H - 1, (y * sy) | 0)
          const rowBase = by * SAMPLE_W
          for (let x = gx; x < xEnd; x++) {
            const bx = Math.min(SAMPLE_W - 1, (x * sx) | 0)
            const i = (rowBase + bx) * 4
            const b = (src[i] + src[i + 1] + src[i + 2]) / (3 * 255)
            if (b > maxB) {
              maxB = b
              mx = x
              my = y
            }
          }
        }
        if (maxB > threshold) {
          // px/py = container px (top-origin); uv is GL-oriented (Y flipped).
          raw.push({ x: mx / W, y: 1 - my / H, px: mx, py: my, brightness: maxB })
        }
      }
    }

    // Cap points to POINT_CAP by SPATIALLY-UNIFORM downsample (evenly-spaced in
    // raster order), NOT by brightness — a brightness cap collapses the whole
    // web onto the few pure-white UI pixels and starves the mid-bright face,
    // which was the first rework's visible failure. Even striding preserves the
    // CPU's spatial spread across the frame.
    let pts: BrightPoint[]
    if (raw.length > POINT_CAP) {
      const stride = raw.length / POINT_CAP
      pts = []
      for (let k = 0; k < POINT_CAP; k++) pts.push(raw[Math.floor(k * stride)])
    } else {
      pts = raw
    }

    // --- Connectivity: each point → distance-sorted nearest maxConnections
    // within MAX_DIST (CPU parity). Distances in aspect-correct container px.
    const maxConn = this.maxConnections
    type Seg = { ax: number; ay: number; bx: number; by: number; seed: number; len: number }
    const segList: Seg[] = []
    const n = pts.length
    // Dedupe undirected connections: the CPU draws i→j and j→i as two separate
    // (overlapping) strokes; storing each undirected pair once lets the bounded
    // SEG_CAP budget cover twice as much of the mesh.
    const seen = new Set<number>()
    for (let i = 0; i < n; i++) {
      const p1 = pts[i]
      // Build (index, dist) for every other point, sort ascending.
      const near: { j: number; d: number }[] = []
      for (let j = 0; j < n; j++) {
        if (j === i) continue
        const p2 = pts[j]
        const dx = p2.px - p1.px
        const dy = p2.py - p1.py
        near.push({ j, d: Math.hypot(dx, dy) })
      }
      near.sort((a, b) => a.d - b.d)
      let connections = 0
      const seed = (i * 0.5) % 1
      for (const { j, d } of near) {
        if (connections >= maxConn) break
        if (d > MAX_DIST) break
        connections++ // counts against i's budget even if the pair is a dupe (CPU parity)
        const lo = i < j ? i : j
        const hi = i < j ? j : i
        const key = lo * POINT_CAP + hi
        if (seen.has(key)) continue
        seen.add(key)
        const p2 = pts[j]
        segList.push({ ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y, seed, len: d })
      }
    }

    // Cap segments to the shortest SEG_CAP (keeps the tight local mesh).
    if (segList.length > SEG_CAP) {
      segList.sort((a, b) => a.len - b.len)
      segList.length = SEG_CAP
    }

    // --- Fill uniform arrays.
    const segCount = segList.length
    this.segSeed.fill(0)
    for (let i = 0; i < segCount; i++) {
      const s = segList[i]
      const o = i * 4
      this.segs[o] = s.ax
      this.segs[o + 1] = s.ay
      this.segs[o + 2] = s.bx
      this.segs[o + 3] = s.by
      this.segSeed[i] = s.seed // 4 packed per vec4 → flat index i lands correctly
    }
    const pointCount = pts.length
    for (let i = 0; i < pointCount; i++) {
      const p = pts[i]
      const o = i * 4
      this.points[o] = p.x
      this.points[o + 1] = p.y
      this.points[o + 2] = p.brightness
      this.points[o + 3] = 0
    }

    this.uniforms.get('uSegCount')!.value = segCount
    this.uniforms.get('uPointCount')!.value = pointCount
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<StrandWebGpuParams>) {
    if (params.threshold !== undefined) {
      this.threshold = params.threshold
    }
    if (params.maxConnections !== undefined) {
      this.maxConnections = params.maxConnections
    }
    if (params.glowIntensity !== undefined) {
      this.uniforms.get('glowIntensity')!.value = params.glowIntensity
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
