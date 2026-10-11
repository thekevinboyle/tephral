import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { getSharedFrameData } from '../../components/overlays/sharedReadback'

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
//   1. Read the Phase-1 shared readback's pixels via getSharedFrameData(
//      renderer.domElement) — the already-paid-for 960x540 CPU copy of the
//      composited WebGL output, whose getImageData runs at most ONCE per frame
//      for every reader. update() itself is only invoked while the effect's
//      EffectPass is in the active chain — i.e. only while strand_web is
//      ENABLED. On disable the pass is removed from the composer, update()
//      stops being called, no CPU work runs, and no timers are left behind.
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
// GPU STEP: each segment and each bright point is an instanced quad around
// its glow, drawn into a half-float "transmittance" target. Its fragment
// computes the CPU's line width (1+glowIntensity), cyan→hot traveling
// particle and per-point dot radius/alpha. In sRGB, one screen blend
// c' = mix(c, screen(c, L), a) is (1 - c') = (1 - c)·(1 - a·L), so the target
// multiply-blends (1 - a·L) per draw and the effect pass applies the whole
// product once: c = 1 - (1 - c0)·T. That is the same result as looping every
// segment and point per pixel, but each draw only touches its own pixels.
// Compositing is done in sRGB (linearToSRGB in, sRGBToLinear out) so the
// screen blend matches the CPU's canvas-space blend.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.

// Caps bound the per-frame point and segment counts. The CPU's practical
// point count is far higher than the task brief's "e.g. 48" estimate (324
// bright points at threshold 0.85, 1058 at 0.3 on the reference frame), so
// these are sized generously, giving a web dense enough to read as the CPU's
// organic mesh rather than a sparse constellation.
const POINT_CAP = 256
const SEG_CAP = 512

// Pixel source for the CPU point-find — the shared readback canvas size.
const SAMPLE_W = 960
const SAMPLE_H = 540
// GRID and MAX_DIST are in DISPLAY (container) px, matching the CPU verbatim.
const GRID = 20 // 20px grid cell (CPU)
const MAX_DIST = 200 // 200px max connection distance (CPU)

// Instanced quads for the transmittance target. Corner attribute: x runs along
// the segment (0 = A, 1 = B), y across it (-1..1); a point uses both as -1..1.
// Every quad reaches 1px past the furthest pixel its fragment can cover.
const WEB_VERTEX_SHADER = /* glsl */ `
uniform vec2 resolution;
uniform float glowIntensity;
uniform float uKind; // 0 = segments, 1 = points
attribute vec4 aShape; // segment: A.xy, B.zw (uv); point: xy (uv), z = brightness
attribute float aSeed;
varying vec4 vShape;
varying float vSeed;
void main() {
  vShape = aShape;
  vSeed = aSeed;
  vec2 p;
  if (uKind < 0.5) {
    vec2 a = aShape.xy * resolution;
    vec2 b = aShape.zw * resolution;
    float len = length(b - a);
    vec2 dir = len > 1e-4 ? (b - a) / len : vec2(1.0, 0.0);
    float r = (1.0 + glowIntensity) * 0.5 + 1.25 + 1.0;
    p = a + dir * mix(-r, len + r, position.x) + vec2(-dir.y, dir.x) * position.y * r;
  } else {
    float r = 3.0 + glowIntensity * 2.0 + 2.0;
    p = aShape.xy * resolution + position.xy * r;
  }
  gl_Position = vec4(p / resolution * 2.0 - 1.0, 0.0, 1.0);
}
`

// Writes (1 - a·L) for one segment or point; the target multiplies them.
const WEB_FRAGMENT_SHADER = /* glsl */ `
uniform vec2 resolution;
uniform vec2 targetSize;
uniform float glowIntensity;
uniform float uTime;
uniform float uKind;
varying vec4 vShape;
varying float vSeed;

float webSegDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec3 cyan = vec3(0.0, 212.0, 255.0) / 255.0;
  vec3 hot = vec3(200.0, 255.0, 255.0) / 255.0;
  // Same pixel position the full-screen pass sees (uv at the pixel centre)
  vec2 px = gl_FragCoord.xy / targetSize * resolution;

  if (uKind < 0.5) {
    vec2 a = vShape.xy * resolution;
    vec2 b = vShape.zw * resolution;
    float d = webSegDist(px, a, b);
    float halfW = (1.0 + glowIntensity) * 0.5;
    float cov = 1.0 - smoothstep(halfW, halfW + 1.25, d);
    if (cov <= 0.0) discard;

    float segLen2 = dot(b - a, b - a);
    float t = clamp(dot(px - a, b - a) / max(segLen2, 1e-5), 0.0, 1.0);
    float pulse = fract(uTime * 2.0 + vSeed);
    float travel = 1.0 - smoothstep(0.0, 0.1, abs(t - pulse));

    vec3 lineColor = mix(cyan, hot, travel);
    float baseA = glowIntensity * 0.3;
    float alpha = mix(baseA, glowIntensity * 0.8, travel) * cov;
    gl_FragColor = vec4(1.0 - alpha * lineColor, 1.0);
  } else {
    vec2 pp = vShape.xy * resolution;
    float pr = 3.0 + glowIntensity * 2.0;
    float pd = distance(px, pp);
    float pcov = 1.0 - smoothstep(pr - 1.0, pr + 1.0, pd);
    if (pcov <= 0.0) discard;
    float a = glowIntensity * vShape.z * pcov;
    gl_FragColor = vec4(1.0 - a * cyan, 1.0);
  }
}
`

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float effectMix;
uniform sampler2D tWeb; // product of (1 - a·L) over every segment and point

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  c = 1.0 - (1.0 - c) * texture2D(tWeb, uv).rgb;
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

  private readonly segCap = SEG_CAP
  private readonly pointCap = POINT_CAP

  // Per-instance data (mutated in place each frame — no GC): segment
  // endpoints, segment phase seeds, and point position + brightness.
  private segs = new Float32Array(SEG_CAP * 4)
  private segSeed = new Float32Array(SEG_CAP)
  private points = new Float32Array(POINT_CAP * 4)
  private segCount = 0
  private pointCount = 0

  // Transmittance target and the instanced quads drawn into it (allocated
  // in initialize(), freed by releaseTargets()).
  private webTarget: THREE.WebGLRenderTarget | null = null
  private webScene: THREE.Scene | null = null
  private webCamera: THREE.OrthographicCamera | null = null
  private segGeometry: THREE.InstancedBufferGeometry | null = null
  private pointGeometry: THREE.InstancedBufferGeometry | null = null
  private segMaterial: THREE.ShaderMaterial | null = null
  private pointMaterial: THREE.ShaderMaterial | null = null
  private readonly clearColor = new THREE.Color()

  // Reused per-point neighbour scratch (indices within MAX_DIST and their distances)
  private nearIdx: number[] = []
  private nearDist = new Float64Array(0)

  constructor(params: Partial<StrandWebGpuParams> = {}) {
    const p = { ...DEFAULT_STRAND_WEB_GPU_PARAMS, ...params }

    super('StrandWebEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['glowIntensity', new THREE.Uniform(p.glowIntensity)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['uTime', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['targetSize', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['tWeb', new THREE.Uniform(null)],
      ]),
    })

    this.threshold = p.threshold
    this.maxConnections = p.maxConnections
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.webTarget) return

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.webTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
    })
    ;(this.uniforms.get('targetSize')!.value as THREE.Vector2).set(size.x, size.y)
    this.uniforms.get('tWeb')!.value = this.webTarget.texture

    // The effect's own Uniform objects, so param changes reach the quads too
    const shared = (kind: number) => ({
      resolution: this.uniforms.get('resolution')!,
      targetSize: this.uniforms.get('targetSize')!,
      glowIntensity: this.uniforms.get('glowIntensity')!,
      uTime: this.uniforms.get('uTime')!,
      uKind: { value: kind },
    })
    // dst = dst · src: each draw multiplies the transmittance by (1 - a·L)
    const material = (kind: number) => new THREE.ShaderMaterial({
      uniforms: shared(kind),
      vertexShader: WEB_VERTEX_SHADER,
      fragmentShader: WEB_FRAGMENT_SHADER,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
      depthTest: false,
      depthWrite: false,
    })
    this.segMaterial = material(0)
    this.pointMaterial = material(1)

    const quad = (corners: number[]) => {
      const g = new THREE.InstancedBufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3))
      g.setIndex([0, 1, 2, 0, 2, 3])
      g.instanceCount = 0
      return g
    }
    this.segGeometry = quad([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0])
    this.segGeometry.setAttribute('aShape', new THREE.InstancedBufferAttribute(this.segs, 4).setUsage(THREE.DynamicDrawUsage))
    this.segGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.segSeed, 1).setUsage(THREE.DynamicDrawUsage))
    this.pointGeometry = quad([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0])
    this.pointGeometry.setAttribute('aShape', new THREE.InstancedBufferAttribute(this.points, 4).setUsage(THREE.DynamicDrawUsage))
    this.pointGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(POINT_CAP), 1))

    this.webScene = new THREE.Scene()
    for (const mesh of [
      new THREE.Mesh(this.segGeometry, this.segMaterial),
      new THREE.Mesh(this.pointGeometry, this.pointMaterial),
    ]) {
      mesh.frustumCulled = false
      this.webScene.add(mesh)
    }
    this.webCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  }

  update(renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    // Bounded, wrapping time — keeps the traveling-particle fract() precise
    // over long sessions.
    this.uniforms.get('uTime')!.value = (performance.now() / 1000) % 100

    const source = renderer.domElement as HTMLCanvasElement
    this.computeWeb(source)
    this.renderWeb(renderer)
  }

  // Draw this frame's segments and points into the transmittance target.
  private renderWeb(renderer: THREE.WebGLRenderer) {
    if (!this.webTarget || !this.webScene || !this.webCamera || !this.segGeometry || !this.pointGeometry) return
    this.segGeometry.instanceCount = this.segCount
    this.pointGeometry.instanceCount = this.pointCount
    this.segGeometry.getAttribute('aShape').needsUpdate = true
    this.segGeometry.getAttribute('aSeed').needsUpdate = true
    this.pointGeometry.getAttribute('aShape').needsUpdate = true

    renderer.getClearColor(this.clearColor)
    const clearAlpha = renderer.getClearAlpha()
    renderer.setRenderTarget(this.webTarget)
    renderer.setClearColor(0xffffff, 1)
    renderer.clear(true, false, false)
    renderer.render(this.webScene, this.webCamera)
    renderer.setClearColor(this.clearColor, clearAlpha)
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.webTarget?.setSize(width, height)
    ;(this.uniforms.get('targetSize')!.value as THREE.Vector2).set(width, height)
  }

  // Free the GPU resources from initialize() when the effect is disabled.
  releaseTargets() {
    this.webTarget?.dispose(); this.webTarget = null
    this.uniforms.get('tWeb')!.value = null
    this.segGeometry?.dispose(); this.segGeometry = null
    this.pointGeometry?.dispose(); this.pointGeometry = null
    this.segMaterial?.dispose(); this.segMaterial = null
    this.pointMaterial?.dispose(); this.pointMaterial = null
    this.webScene = null
    this.webCamera = null
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }

  // Runs the CPU point-find + connectivity for this frame and fills the
  // instance arrays. Skips (clears counts) if the shared frame is unavailable.
  private computeWeb(source: HTMLCanvasElement) {
    const img = getSharedFrameData(source)
    if (!img) {
      this.segCount = 0
      this.pointCount = 0
      return
    }
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
        // Neighbouring display rows/columns that map to the same sample
        // row/column hold the same values, so only the first can be a new
        // (strict) maximum: skip the repeats. Same point as a full scan.
        let lastBy = -1
        for (let y = gy; y < yEnd; y++) {
          const by = Math.min(SAMPLE_H - 1, (y * sy) | 0)
          if (by === lastBy) continue
          lastBy = by
          const rowBase = by * SAMPLE_W
          let lastBx = -1
          for (let x = gx; x < xEnd; x++) {
            const bx = Math.min(SAMPLE_W - 1, (x * sx) | 0)
            if (bx === lastBx) continue
            lastBx = bx
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
    if (raw.length > this.pointCap) {
      const stride = raw.length / this.pointCap
      pts = []
      for (let k = 0; k < this.pointCap; k++) pts.push(raw[Math.floor(k * stride)])
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
    if (this.nearDist.length < n) this.nearDist = new Float64Array(n)
    const dist = this.nearDist
    const near = this.nearIdx
    for (let i = 0; i < n; i++) {
      const p1 = pts[i]
      // Every other point within MAX_DIST, nearest first (ties by index, as a
      // stable sort of all points would give). Points beyond MAX_DIST never
      // connect, so they are left out before sorting.
      near.length = 0
      for (let j = 0; j < n; j++) {
        if (j === i) continue
        const p2 = pts[j]
        const d = Math.hypot(p2.px - p1.px, p2.py - p1.py)
        if (d > MAX_DIST) continue
        dist[j] = d
        near.push(j)
      }
      near.sort((a, b) => dist[a] - dist[b] || a - b)
      let connections = 0
      const seed = (i * 0.5) % 1
      for (const j of near) {
        const d = dist[j]
        if (connections >= maxConn) break
        connections++ // counts against i's budget even if the pair is a dupe (CPU parity)
        const lo = i < j ? i : j
        const hi = i < j ? j : i
        const key = lo * this.pointCap + hi
        if (seen.has(key)) continue
        seen.add(key)
        const p2 = pts[j]
        segList.push({ ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y, seed, len: d })
      }
    }

    // Cap segments to the shortest segCap (keeps the tight local mesh).
    if (segList.length > this.segCap) {
      segList.sort((a, b) => a.len - b.len)
      segList.length = this.segCap
    }

    // --- Fill uniform arrays.
    const segCount = segList.length
    for (let i = 0; i < segCount; i++) {
      const s = segList[i]
      const o = i * 4
      this.segs[o] = s.ax
      this.segs[o + 1] = s.ay
      this.segs[o + 2] = s.bx
      this.segs[o + 3] = s.by
      this.segSeed[i] = s.seed
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

    this.segCount = segCount
    this.pointCount = pointCount
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
