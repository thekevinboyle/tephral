import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// ═══════════════════════════════════════════════════════════════════════════
// STRAND CHIRAL-PATH — GPU port of
// src/components/overlays/strand/chiralPathEffect.ts (CPU ground truth,
// effect id 'strand_path'). TEMPORAL: agent-state ping-pong (positions +
// velocities, PhysarumEffect's GPGPU pattern but far simpler — particles
// follow local frame-diff FLOW instead of trail-sensing) driving a decaying
// trail-accumulation buffer, plus a captured-previous-frame target
// (FlowSmearEffect's captureFrame pattern) supplying the motion reference.
//
// CPU keeps a JS array of up to `particleCount` particles, each with its own
// trail history array:
//  1. Spawn/count: array grows/shrinks to match `particleCount` by
//     push/pop'ing fresh `createParticle()`s (random pos, random vx/vy in
//     -1..1, trail=[], life=3+random()*5 seconds).
//  2. Motion (every frame, once a previous frame exists): at each particle's
//     rounded pixel position, sum a 5x5 neighborhood of
//     `dx * (currBright-prevBright) * 0.01` (and the dy analogue) where
//     bright = average RGB byte value — this exact weighted-neighbor-diff
//     formula is reproduced verbatim in the GPU update shader, just fed by
//     `videoTexture` (this pass's inputBuffer) vs `prevFrameTexture`
//     (last frame's captured output) instead of two ImageData buffers.
//     `vx = vx*0.9 + motionX*flowSpeed` (velocity has inertia); if the
//     resulting speed drops under 0.5px, a small drift-to-center term is
//     added instead. `x += vx*deltaTime*60` (frame-rate-normalized to a
//     60fps baseline, matching CPU exactly).
//  3. Trail: CPU unshifts the new position onto `particle.trail` and pops
//     past `trailLength` entries, then strokes it as a head-opaque/tail-
//     transparent cyan gradient line with `globalCompositeOperation =
//     'screen'`. The GPU has no per-particle trail-history array — instead
//     agents deposit a GL_POINT onto a decaying accumulation trail texture
//     every frame (PhysarumEffect's DEPOSIT pattern); `trailLength` maps to
//     a per-frame decay rate (`pow(0.02, 1/trailLength)`) tuned so a deposit
//     fades to ~2% intensity after approximately `trailLength` frames —
//     reproducing "longer array = longer visible trail" via continuous decay
//     instead of a discrete point-count array. This ALSO naturally
//     reproduces the CPU's head-bright/tail-fade gradient (the freshest
//     deposit is always the brightest, older ones have decayed longer) with
//     no extra shader work. Display screen-blends the trail intensity as
//     cyan (`rgb(0,212,255)`, CPU's stroke color) over the sRGB-decoded
//     input, matching CPU's DOM-layer 'screen' compositing (COLORSPACE RULE).
//  4. Reset: CPU resets a particle (fresh `createParticle()`) when it goes
//     out of [0,width)x[0,height) OR its life timer expires. The GPU agent
//     state (rgba = x,y,vx,vy) has no spare channel for a persistent life
//     timer, so life-expiry is reproduced STATELESSLY: each texel gets a
//     fixed hash-seeded cycle length (3-8s, matching CPU's random range) and
//     crosses it deterministically as the sim's continuous time accumulator
//     advances — an accepted "same look" deviation (periodic respawn cadence
//     matches; CPU's fresh-random-duration-every-respawn jitter does not).
//     Out-of-bounds resets are reproduced exactly (checked every frame after
//     the position update, same as CPU).
//
// Runs the agent sim + trail accumulation at a FIXED resolution (agent grid
// sized to the particleCount param's max; trail canvas 768x432) independent
// of display size — same rationale as every other Wave-B/Physarum sim.
// Requires WebGL2 + EXT_color_buffer_float (render-to-float), same
// feature-detection contract as PhysarumEffect; falls back to pass-through
// with a one-time console warning if unsupported.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Display (postprocessing) fragment shader — screen-blends the decayed
// trail intensity as cyan over the sRGB-decoded source, matching CPU's DOM
// 'screen' compositing (COLORSPACE RULE: sample -> linearToSRGB -> blend in
// sRGB -> sRGBToLinear -> output). ────────────────────────────────────────
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D trailTexture;
uniform float effectMix;
uniform bool hasSim;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasSim) {
    outputColor = inputColor;
    return;
  }

  float intensity = clamp(texture2D(trailTexture, uv).r, 0.0, 1.0);
  if (intensity <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 trailColorSRGB = vec3(0.0, 0.831, 1.0); // rgba(0,212,255) / 255, CPU's stroke color
  // Deliberately lighter than the CPU's per-segment head alpha (0.8): the
  // accumulation-buffer model (see file header, point 3/4) has no per-
  // particle "trail cleared on respawn" bookkeeping, so old trails keep
  // decaying in place instead of vanishing instantly like CPU's array
  // reset — left at 0.8 this reads visibly busier/denser than CPU at
  // higher particle-turnover settings. 0.55 brings the accumulated-glow
  // look back in line with CPU's sparser instantaneous trail count
  // (verified against T14 before/after parity shots).
  float alpha = intensity * 0.55;

  vec3 screened = blendScreen(colorSRGB, trailColorSRGB * alpha);
  vec3 result = sRGBToLinear(clamp(screened, 0.0, 1.0));

  outputColor = mix(inputColor, vec4(result, inputColor.a), effectMix);
}
`

// ─── Shared fullscreen-quad vertex shader (agent update / trail decay). ────
const QUAD_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// ─── Seed-copy shader: blits the initial-state DataTexture into a float
// render target (render targets can't be uploaded to directly). ────────────
const COPY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D src;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(src, vUv);
}
`

// ─── Agent UPDATE shader. One fragment per agent slot; reads its own state
// (rgba = x, y, vx, vy — xy in 0..1 UV, vx/vy in UV-per-60fps-tick, the UV
// equivalent of the CPU's pixel-per-tick velocity), the current chain frame,
// and last frame's captured output; writes the new state. NOTE: raw
// THREE.ShaderMaterial shaders cannot import COLOR_UTILS_GLSL — three's
// WebGLProgram injects its own builtin `luminance(vec3)` — so this defines
// uniquely-named locals (chiralLinearToSRGB/chiralLuminance), same trap/fix
// documented in StrandTarEffect.ts. ──────────────────────────────────────────
const UPDATE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D agentState;
uniform sampler2D videoTexture;       // this pass's inputBuffer (current frame)
uniform sampler2D prevFrameTexture;   // last frame's captured output
uniform vec2 resolution;              // display resolution, for px<->UV conversion
uniform float flowSpeed;
uniform float deltaTime;
uniform float time;
uniform bool hasCapturedFrame;
varying vec2 vUv;

float chiralHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
vec3 chiralLinearToSRGB(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
float chiralLuminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 texel = 1.0 / resolution;
  vec4 state = texture2D(agentState, vUv);
  vec2 pos = state.xy;
  vec2 vel = state.zw;

  // Stateless life-expiry cycle (see file header) — a fixed-length (3-8s)
  // per-texel cycle derived from a hash seed, crossed deterministically as
  // time advances.
  float agentSeed = chiralHash(vUv * 91.7);
  float cycleLen = 3.0 + agentSeed * 5.0;
  float cyclePhaseInput = time + agentSeed * 71.0;
  float cycleIndex = floor(cyclePhaseInput / cycleLen);
  float phase = mod(cyclePhaseInput, cycleLen);
  bool lifeExpired = phase < deltaTime;

  if (hasCapturedFrame && !lifeExpired) {
    // ─── 5x5 local frame-diff motion field — CPU's exact formula, fed by
    // this pass's inputBuffer vs the previously captured frame. ───────────
    float motionX = 0.0;
    float motionY = 0.0;
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        vec2 sampleUV = clamp(pos + vec2(float(dx), float(dy)) * texel, 0.001, 0.999);
        float currB = chiralLuminance(chiralLinearToSRGB(texture2D(videoTexture, sampleUV).rgb));
        float prevB = chiralLuminance(chiralLinearToSRGB(texture2D(prevFrameTexture, sampleUV).rgb));
        float diff = (currB - prevB) * 255.0; // restore CPU's 0-255 byte-diff scale
        motionX += float(dx) * diff * 0.01;
        motionY += float(dy) * diff * 0.01;
      }
    }

    // vx = vx*0.9 + motionX*flowSpeed (CPU, in px/tick) -> stored as UV/tick
    // via *texel.
    vel = vel * 0.9 + vec2(motionX, motionY) * flowSpeed * texel;

    vec2 velPx = vel * resolution;
    float mag = length(velPx);
    if (mag < 0.5) {
      // Drift-to-center: CPU's (width/2 - x)*0.001 in px cancels its own
      // width when converted to UV/tick, leaving just (0.5-pos)*0.001.
      vel += (vec2(0.5) - pos) * 0.001;
    }

    pos += vel * deltaTime * 60.0;
  }

  bool outOfBounds = pos.x < 0.0 || pos.x >= 1.0 || pos.y < 0.0 || pos.y >= 1.0;

  if (lifeExpired || outOfBounds) {
    vec2 seed = vUv * 133.7 + cycleIndex * 7.919 + fract(time) * 0.37;
    float rx = chiralHash(seed);
    float ry = chiralHash(seed + 17.23);
    float rvx = (chiralHash(seed + 91.7) - 0.5) * 2.0 * texel.x;
    float rvy = (chiralHash(seed + 53.1) - 0.5) * 2.0 * texel.y;
    gl_FragColor = vec4(rx, ry, rvx, rvy);
    return;
  }

  gl_FragColor = vec4(pos, vel);
}
`

// ─── Trail DECAY shader: newTrail = oldTrail * decay (no blur — CPU's
// stroked lines stay crisp, not a diffusing blob like Physarum's mold). ─────
const DECAY_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D trail;
uniform float decay;
varying vec2 vUv;
void main() {
  float v = min(texture2D(trail, vUv).r * decay, 4.0);
  gl_FragColor = vec4(v, v, v, 1.0);
}
`

// ─── Agent DEPOSIT: render each live agent as a small point. The vertex
// shader reads the agent's position from the state texture via its
// per-agent `reference` UV (PhysarumEffect's pattern); the fragment writes a
// constant deposit, additively blended onto the freshly-decayed trail. ──────
const DEPOSIT_VERTEX_SHADER = /* glsl */ `
precision highp float;
attribute vec2 reference;
uniform sampler2D agentState;
void main() {
  vec2 pos = texture2D(agentState, reference).xy;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`

const DEPOSIT_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
void main() {
  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`

export interface StrandChiralPathParams {
  particleCount: number
  trailLength: number
  flowSpeed: number
  mix: number
}

export const DEFAULT_STRAND_CHIRAL_PATH_PARAMS: StrandChiralPathParams = {
  particleCount: 100,
  trailLength: 20,
  flowSpeed: 1,
  mix: 1,
}

export class StrandChiralPathEffect extends Effect {
  // Agent grid capacity — fixed to the particleCount param's max (200), so
  // changing particleCount only adjusts the points draw range, never
  // reallocates GPU resources (unlike PhysarumEffect, which reallocates
  // because its agent range spans 10000-300000 and always uses every slot).
  private static readonly MAX_PARTICLES = 200
  private static readonly AGENT_SIDE = Math.ceil(Math.sqrt(StrandChiralPathEffect.MAX_PARTICLES))

  // Trail accumulation ping-pong, fixed resolution independent of display.
  private static readonly TRAIL_WIDTH = 768
  private static readonly TRAIL_HEIGHT = 432

  // Trail ping-pong (half-float, linear-filtered).
  private trailA: THREE.WebGLRenderTarget | null = null
  private trailB: THREE.WebGLRenderTarget | null = null
  private trailRead: THREE.WebGLRenderTarget | null = null
  private trailWrite: THREE.WebGLRenderTarget | null = null

  // Agent-state ping-pong (full-float, nearest-filtered).
  private agentA: THREE.WebGLRenderTarget | null = null
  private agentB: THREE.WebGLRenderTarget | null = null
  private agentRead: THREE.WebGLRenderTarget | null = null
  private agentWrite: THREE.WebGLRenderTarget | null = null

  // Fullscreen-quad scene (agent update / trail decay passes swap materials).
  private quad: THREE.Mesh | null = null
  private quadScene: THREE.Scene | null = null
  private quadCamera: THREE.OrthographicCamera | null = null

  // Points scene (deposit pass).
  private pointsGeometry: THREE.BufferGeometry | null = null
  private points: THREE.Points | null = null
  private pointsScene: THREE.Scene | null = null

  private updateMaterial: THREE.ShaderMaterial | null = null
  private decayMaterial: THREE.ShaderMaterial | null = null
  private depositMaterial: THREE.ShaderMaterial | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null

  // Previous-captured-frame target (FlowSmearEffect's captureFrame pattern)
  // — supplies the motion reference for the agent update shader's frame-diff.
  private prevFrameTarget: THREE.WebGLRenderTarget | null = null
  private frameCopyMaterial: THREE.ShaderMaterial | null = null
  private frameCopyGeometry: THREE.PlaneGeometry | null = null
  private frameCopyScene: THREE.Scene | null = null
  private frameCopyCamera: THREE.OrthographicCamera | null = null
  // True once captureFrame() has populated prevFrameTarget with real
  // content — gates the update shader's motion computation so it never
  // samples a freshly-(re)initialized target (matters most right after
  // releaseTargets() + re-enable). Mirrors CPU's `prevImageData` null-check.
  private hasCapturedFrame = false

  private supported = false
  private warned = false
  private canvasWidth = 1
  private canvasHeight = 1

  // Pending param values kept on the instance because updateParams() can run
  // before initialize() creates the materials/geometry (store hydration /
  // paramSync run order) — initialize() seeds from these.
  private particleCount: number
  private trailLength: number
  private flowSpeed: number

  constructor(params: Partial<StrandChiralPathParams> = {}) {
    const p = { ...DEFAULT_STRAND_CHIRAL_PATH_PARAMS, ...params }

    super('StrandChiralPathEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['trailTexture', new THREE.Uniform(null)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['hasSim', new THREE.Uniform(false)],
      ]),
    })

    this.particleCount = p.particleCount
    this.trailLength = p.trailLength
    this.flowSpeed = p.flowSpeed
  }

  private static decayFor(trailLength: number): number {
    // A deposit fades to ~2% intensity after ~trailLength frames — the
    // continuous-decay analogue of the CPU's discrete trail-array length.
    const n = Math.max(1, trailLength)
    return Math.min(0.999, Math.max(0, Math.pow(0.02, 1 / n)))
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.trailA) return

    const hasFloat =
      renderer.capabilities.isWebGL2 &&
      !!renderer.extensions.get('EXT_color_buffer_float')
    if (!hasFloat) {
      if (!this.warned) {
        console.warn(
          '[StrandChiralPathEffect] WebGL2 + EXT_color_buffer_float required; ' +
            'effect passing input through unchanged.'
        )
        this.warned = true
      }
      this.supported = false
      return
    }
    this.supported = true

    const size = renderer.getSize(new THREE.Vector2())
    this.canvasWidth = size.x || 1
    this.canvasHeight = size.y || 1

    const TW = StrandChiralPathEffect.TRAIL_WIDTH
    const TH = StrandChiralPathEffect.TRAIL_HEIGHT
    const SIDE = StrandChiralPathEffect.AGENT_SIDE

    const trailOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.trailA = new THREE.WebGLRenderTarget(TW, TH, trailOpts)
    this.trailB = new THREE.WebGLRenderTarget(TW, TH, trailOpts)

    const agentOpts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.agentA = new THREE.WebGLRenderTarget(SIDE, SIDE, agentOpts)
    this.agentB = new THREE.WebGLRenderTarget(SIDE, SIDE, agentOpts)

    const frameOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.prevFrameTarget = new THREE.WebGLRenderTarget(this.canvasWidth, this.canvasHeight, frameOpts)

    // ─── Fullscreen quad scene (agent update / trail decay) ───────────────
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.quadScene = new THREE.Scene()
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
    this.quadScene.add(this.quad)

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { src: { value: null } },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: COPY_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    })

    this.updateMaterial = new THREE.ShaderMaterial({
      uniforms: {
        agentState: { value: null },
        videoTexture: { value: null },
        prevFrameTexture: { value: null },
        resolution: { value: new THREE.Vector2(this.canvasWidth, this.canvasHeight) },
        flowSpeed: { value: this.flowSpeed },
        deltaTime: { value: 0.016 },
        time: { value: 0 },
        hasCapturedFrame: { value: false },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: UPDATE_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    })

    this.decayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        trail: { value: null },
        decay: { value: StrandChiralPathEffect.decayFor(this.trailLength) },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: DECAY_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    })

    this.depositMaterial = new THREE.ShaderMaterial({
      uniforms: { agentState: { value: null } },
      vertexShader: DEPOSIT_VERTEX_SHADER,
      fragmentShader: DEPOSIT_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    })

    // ─── Points geometry: MAX_PARTICLES slots, `reference` = each agent's
    // texel UV in the state texture; drawRange trims to the live count. ────
    this.pointsGeometry = new THREE.BufferGeometry()
    const MAX = StrandChiralPathEffect.MAX_PARTICLES
    const positions = new Float32Array(MAX * 3)
    const reference = new Float32Array(MAX * 2)
    for (let i = 0; i < MAX; i++) {
      const col = i % SIDE
      const row = Math.floor(i / SIDE)
      reference[i * 2] = (col + 0.5) / SIDE
      reference[i * 2 + 1] = (row + 0.5) / SIDE
    }
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.pointsGeometry.setAttribute('reference', new THREE.BufferAttribute(reference, 2))
    this.pointsGeometry.setDrawRange(0, Math.round(Math.max(1, Math.min(MAX, this.particleCount))))

    this.points = new THREE.Points(this.pointsGeometry, this.depositMaterial)
    this.points.frustumCulled = false
    this.pointsScene = new THREE.Scene()
    this.pointsScene.add(this.points)

    // ─── captureFrame blit scene (FlowSmearEffect's pattern) ──────────────
    this.frameCopyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })
    this.frameCopyScene = new THREE.Scene()
    this.frameCopyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.frameCopyGeometry = new THREE.PlaneGeometry(2, 2)
    this.frameCopyScene.add(new THREE.Mesh(this.frameCopyGeometry, this.frameCopyMaterial))

    // ─── Clear trail targets to zero + seed agents with random positions
    // (DataTexture blit, since render targets can't be uploaded to
    // directly) — a fresh WebGLRenderTarget's contents are otherwise
    // undefined GPU memory. ─────────────────────────────────────────────
    const prevTarget = renderer.getRenderTarget()
    const prevClear = new THREE.Color()
    renderer.getClearColor(prevClear)
    const prevAlpha = renderer.getClearAlpha()
    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(this.trailA)
    renderer.clear(true, false, false)
    renderer.setRenderTarget(this.trailB)
    renderer.clear(true, false, false)
    renderer.setClearColor(prevClear, prevAlpha)
    renderer.setRenderTarget(prevTarget)

    this.trailRead = this.trailA
    this.trailWrite = this.trailB

    const count = SIDE * SIDE
    const seedData = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      seedData[i * 4] = Math.random()
      seedData[i * 4 + 1] = Math.random()
      seedData[i * 4 + 2] = (Math.random() - 0.5) * 2 * (1 / this.canvasWidth)
      seedData[i * 4 + 3] = (Math.random() - 0.5) * 2 * (1 / this.canvasHeight)
    }
    const seedTex = new THREE.DataTexture(seedData, SIDE, SIDE, THREE.RGBAFormat, THREE.FloatType)
    seedTex.needsUpdate = true

    this.copyMaterial.uniforms.src.value = seedTex
    this.quad.material = this.copyMaterial
    renderer.setRenderTarget(this.agentA)
    renderer.render(this.quadScene, this.quadCamera)
    seedTex.dispose()

    this.agentRead = this.agentA
    this.agentWrite = this.agentB

    renderer.setRenderTarget(prevTarget)
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.supported) return
    if (!this.trailRead || !this.trailWrite || !this.agentRead || !this.agentWrite) return
    if (
      !this.quad || !this.quadScene || !this.quadCamera ||
      !this.updateMaterial || !this.decayMaterial || !this.depositMaterial ||
      !this.pointsScene
    )
      return

    const dt = deltaTime ?? 0.016
    const t = performance.now() / 1000

    const prevTarget = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear
    const prevClear = new THREE.Color()
    renderer.getClearColor(prevClear)
    const prevAlpha = renderer.getClearAlpha()
    const prevViewport = new THREE.Vector4()
    renderer.getViewport(prevViewport)
    const prevScissor = new THREE.Vector4()
    renderer.getScissor(prevScissor)
    const prevScissorTest = renderer.getScissorTest()
    renderer.setScissorTest(false)

    // ─── 1. UPDATE agents (read agentRead + video + prevFrame -> agentWrite)
    this.updateMaterial.uniforms.agentState.value = this.agentRead.texture
    this.updateMaterial.uniforms.videoTexture.value = inputBuffer.texture
    this.updateMaterial.uniforms.prevFrameTexture.value = this.prevFrameTarget?.texture ?? null
    this.updateMaterial.uniforms.resolution.value.set(this.canvasWidth, this.canvasHeight)
    this.updateMaterial.uniforms.deltaTime.value = dt
    this.updateMaterial.uniforms.time.value = t
    this.updateMaterial.uniforms.hasCapturedFrame.value = this.hasCapturedFrame
    this.quad.material = this.updateMaterial
    renderer.autoClear = true
    renderer.setRenderTarget(this.agentWrite)
    renderer.render(this.quadScene, this.quadCamera)
    {
      const tmp = this.agentRead
      this.agentRead = this.agentWrite
      this.agentWrite = tmp
    }

    // ─── 2. DECAY trail (read trailRead -> trailWrite) ─────────────────────
    this.decayMaterial.uniforms.trail.value = this.trailRead.texture
    this.quad.material = this.decayMaterial
    renderer.autoClear = true
    renderer.setRenderTarget(this.trailWrite)
    renderer.render(this.quadScene, this.quadCamera)

    // ─── 3. DEPOSIT agents additively onto trailWrite (no clear) ───────────
    this.depositMaterial.uniforms.agentState.value = this.agentRead.texture
    renderer.autoClear = false
    renderer.setRenderTarget(this.trailWrite)
    renderer.render(this.pointsScene, this.quadCamera)

    {
      const tmp = this.trailRead
      this.trailRead = this.trailWrite
      this.trailWrite = tmp
    }

    renderer.autoClear = prevAutoClear
    renderer.setRenderTarget(prevTarget)
    renderer.setViewport(prevViewport)
    renderer.setScissor(prevScissor)
    renderer.setScissorTest(prevScissorTest)
    renderer.setClearColor(prevClear, prevAlpha)

    this.uniforms.get('trailTexture')!.value = this.trailRead.texture
    this.uniforms.get('hasSim')!.value = true
  }

  // Call this after the main render pass. Copies the composited output into
  // prevFrameTarget, which next frame's update() reads as the motion
  // reference — same "this frame's output becomes next frame's comparison
  // baseline" pattern as FlowSmearEffect.
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.supported) return
    if (!this.prevFrameTarget || !this.frameCopyMaterial || !this.frameCopyScene || !this.frameCopyCamera) return

    this.frameCopyMaterial.uniforms.tDiffuse.value = outputBuffer.texture

    const prevTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.prevFrameTarget)
    renderer.render(this.frameCopyScene, this.frameCopyCamera)
    renderer.setRenderTarget(prevTarget)

    this.hasCapturedFrame = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.canvasWidth = width || 1
    this.canvasHeight = height || 1
    this.prevFrameTarget?.setSize(this.canvasWidth, this.canvasHeight)
    if (this.updateMaterial) {
      this.updateMaterial.uniforms.resolution.value.set(this.canvasWidth, this.canvasHeight)
    }
    // Trail/agent targets intentionally NOT resized: both run at fixed
    // resolutions independent of display size (see TRAIL_WIDTH/HEIGHT,
    // AGENT_SIDE), same rationale as every other Wave-B sim.
  }

  updateParams(params: Partial<StrandChiralPathParams>) {
    if (params.particleCount !== undefined) {
      this.particleCount = params.particleCount
      if (this.pointsGeometry) {
        const count = Math.round(
          Math.max(1, Math.min(StrandChiralPathEffect.MAX_PARTICLES, params.particleCount))
        )
        this.pointsGeometry.setDrawRange(0, count)
      }
    }
    if (params.trailLength !== undefined) {
      this.trailLength = params.trailLength
      if (this.decayMaterial) {
        this.decayMaterial.uniforms.decay.value = StrandChiralPathEffect.decayFor(params.trailLength)
      }
    }
    if (params.flowSpeed !== undefined) {
      this.flowSpeed = params.flowSpeed
      if (this.updateMaterial) this.updateMaterial.uniforms.flowSpeed.value = params.flowSpeed
    }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // True inverse of initialize(): dispose+null ALL targets/materials/
  // geometry/scene refs, reset flags, so a guarded re-initialize() rebuilds
  // cleanly on the next enable without leaking GPU resources.
  releaseTargets() {
    this.trailA?.dispose(); this.trailA = null
    this.trailB?.dispose(); this.trailB = null
    this.trailRead = null
    this.trailWrite = null
    this.agentA?.dispose(); this.agentA = null
    this.agentB?.dispose(); this.agentB = null
    this.agentRead = null
    this.agentWrite = null
    this.prevFrameTarget?.dispose(); this.prevFrameTarget = null

    this.updateMaterial?.dispose(); this.updateMaterial = null
    this.decayMaterial?.dispose(); this.decayMaterial = null
    this.depositMaterial?.dispose(); this.depositMaterial = null
    this.copyMaterial?.dispose(); this.copyMaterial = null
    ;(this.quad?.material as THREE.Material | undefined)?.dispose?.()
    this.quad?.geometry.dispose()
    this.quad = null
    this.quadScene = null
    this.quadCamera = null
    this.pointsGeometry?.dispose(); this.pointsGeometry = null
    this.points = null
    this.pointsScene = null

    this.frameCopyMaterial?.dispose(); this.frameCopyMaterial = null
    this.frameCopyGeometry?.dispose(); this.frameCopyGeometry = null
    this.frameCopyScene = null
    this.frameCopyCamera = null

    this.hasCapturedFrame = false
    this.supported = false
    this.uniforms.get('trailTexture')!.value = null
    this.uniforms.get('hasSim')!.value = false
  }

  dispose() {
    super.dispose()
    this.trailA?.dispose()
    this.trailB?.dispose()
    this.agentA?.dispose()
    this.agentB?.dispose()
    this.prevFrameTarget?.dispose()
    this.updateMaterial?.dispose()
    this.decayMaterial?.dispose()
    this.depositMaterial?.dispose()
    this.copyMaterial?.dispose()
    this.quad?.geometry.dispose()
    this.pointsGeometry?.dispose()
    this.frameCopyMaterial?.dispose()
    this.frameCopyGeometry?.dispose()
  }
}
