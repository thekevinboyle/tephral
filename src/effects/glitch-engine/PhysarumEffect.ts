import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// ═══════════════════════════════════════════════════════════════════════════
// PHYSARUM - slime-mold agent simulation (Jones 2010), WebGL2 GPGPU.
//
// A population of `agents` (positions + heading, stored in a float ping-pong
// texture pair) runs the classic three-sensor Physarum model on the GPU:
//   1. UPDATE  — each agent samples the TRAIL map at 3 sensors (ahead and
//      ±sensorAngle at sensorDist texels), turns toward the strongest, adds a
//      small random jitter, and steps forward a fixed speed. Wraps at edges.
//   2. DIFFUSE — the trail map decays (×decay) and 3×3 box-blurs each frame,
//      and gains source-video luminance × lumaBias so the mold "eats" (is
//      attracted to) the bright regions of the incoming video.
//   3. DEPOSIT — every agent is rendered as a 1-px GL_POINT (its position read
//      from the state texture in the vertex shader via a per-agent `reference`
//      UV) additively onto the freshly-diffused trail.
// The display pass tone-maps the trail (deep-violet → yellow-white veins on a
// near-black ground) over the source frame by `mix`.
//
// Runs at a FIXED simulation resolution (768×432) independent of the display
// size — pattern scale is defined by the trail's own texel spacing, keeping
// the look and cost constant across output resolutions.
//
// Requires WebGL2 + EXT_color_buffer_float (render-to-float). Without it the
// effect passes its input through unchanged (hasSim stays false) and warns
// once.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Display (postprocessing) fragment shader — tone-maps the trail over the
// source frame by effectMix. ─────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
uniform sampler2D trailTexture;
uniform float effectMix;
uniform bool hasSim;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasSim || effectMix <= 0.0) {
    outputColor = inputColor;
    return;
  }

  float t = texture2D(trailTexture, uv).r;
  // Soft-knee tone map so dense veins saturate gracefully instead of clipping.
  float tone = 1.0 - exp(-t * 2.2);

  vec3 bg     = vec3(0.02, 0.005, 0.05);  // near-black violet ground
  vec3 violet = vec3(0.42, 0.08, 0.62);   // deep violet (faint trails)
  vec3 hot    = vec3(1.0, 0.96, 0.70);    // yellow-white (dense veins)

  vec3 vein = mix(violet, hot, smoothstep(0.35, 0.95, tone));
  vec3 slime = mix(bg, vein, smoothstep(0.015, 0.5, tone));

  vec3 result = mix(inputColor.rgb, slime, effectMix);
  outputColor = vec4(result, inputColor.a);
}
`

// ─── Shared fullscreen-quad vertex shader (update / diffuse / seed-copy). The
// PlaneGeometry(2,2) position is already in NDC, so no camera transform. ──────
const QUAD_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// ─── Seed-copy shader: blits the initial-state DataTexture into a float render
// target (render targets can't be uploaded to directly). ─────────────────────
const COPY_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D src;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(src, vUv);
}
`

// ─── Agent UPDATE shader (Jones' three-sensor model). One fragment per agent;
// reads its own state + the trail, writes new state. ─────────────────────────
const UPDATE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D agentState;   // rgba = (x, y, heading, spare), xy in 0..1
uniform sampler2D trail;        // .r = trail intensity
uniform vec2 texel;             // 1 / trail resolution
uniform float sensorAngleRad;   // sensor + turn angle (radians)
uniform float sensorDist;       // sensor distance (texels)
uniform float speed;            // step distance (texels)
uniform float frame;            // frame counter, for the RNG
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float sense(vec2 pos, float angle) {
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 sp = fract(pos + dir * sensorDist * texel);
  return texture2D(trail, sp).r;
}

void main() {
  vec4 s = texture2D(agentState, vUv);
  vec2 pos = s.xy;
  float heading = s.z;

  float f  = sense(pos, heading);
  float fl = sense(pos, heading + sensorAngleRad);
  float fr = sense(pos, heading - sensorAngleRad);

  float rnd = hash(vUv * 51.7 + frame * 0.013);

  if (f > fl && f > fr) {
    // straight ahead
  } else if (f < fl && f < fr) {
    // ambiguous — steer randomly left or right
    heading += (rnd < 0.5 ? -sensorAngleRad : sensorAngleRad);
  } else if (fl < fr) {
    heading -= sensorAngleRad; // turn right
  } else if (fr < fl) {
    heading += sensorAngleRad; // turn left
  }

  // small random jitter keeps the network organic / avoids lock-step
  heading += (rnd - 0.5) * 0.25;

  vec2 vel = vec2(cos(heading), sin(heading)) * speed * texel;
  pos = fract(pos + vel);

  gl_FragColor = vec4(pos, heading, 1.0);
}
`

// ─── Trail DIFFUSE/DECAY shader: newTrail = decay × 3×3 blur + video luma bias.
const DIFFUSE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform sampler2D trail;
uniform sampler2D video;
uniform vec2 texel;
uniform float decay;
uniform float lumaBias;
varying vec2 vUv;

void main() {
  float sum = 0.0;
  sum += texture2D(trail, vUv + texel * vec2(-1.0, -1.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 0.0, -1.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 1.0, -1.0)).r;
  sum += texture2D(trail, vUv + texel * vec2(-1.0,  0.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 0.0,  0.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 1.0,  0.0)).r;
  sum += texture2D(trail, vUv + texel * vec2(-1.0,  1.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 0.0,  1.0)).r;
  sum += texture2D(trail, vUv + texel * vec2( 1.0,  1.0)).r;
  float blur = sum / 9.0;

  float lum = dot(texture2D(video, vUv).rgb, vec3(0.299, 0.587, 0.114));

  float v = blur * decay + lum * lumaBias * 0.14;
  gl_FragColor = vec4(v, v, v, 1.0);
}
`

// ─── Agent DEPOSIT: render each agent as a 1-px point. The vertex shader reads
// the agent's position from the state texture via its per-agent `reference` UV
// and emits it directly in NDC; the fragment writes `deposit`, added onto the
// trail with custom pure-additive blending. ──────────────────────────────────
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
uniform float deposit;
void main() {
  gl_FragColor = vec4(deposit, deposit, deposit, 1.0);
}
`

export interface PhysarumParams {
  agents: number       // 10000-300000, particle count (snaps to a square)
  sensorAngle: number  // 10-60, sensor + turn angle (degrees)
  sensorDist: number   // 4-32, sensor distance (texels)
  decay: number        // 0.8-0.99, trail decay per frame
  deposit: number      // 0-1, trail added per agent per frame
  lumaBias: number     // 0-1, source-luminance attraction
  mix: number          // 0-1, dry/wet
}

export const DEFAULT_PHYSARUM_PARAMS: PhysarumParams = {
  agents: 100000,
  sensorAngle: 30,
  sensorDist: 12,
  decay: 0.95,
  deposit: 0.6,
  lumaBias: 0.5,
  mix: 1,
}

export class PhysarumEffect extends Effect {
  private static readonly TRAIL_WIDTH = 768
  private static readonly TRAIL_HEIGHT = 432
  private static readonly STEP_SPEED = 1.5 // texels per frame

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
  private side = 0 // agent texture side length; agent count = side²

  // Fullscreen-quad scene (update / diffuse / seed-copy passes swap materials).
  private quad: THREE.Mesh | null = null
  private quadScene: THREE.Scene | null = null
  private quadCamera: THREE.OrthographicCamera | null = null

  // Points scene (deposit pass).
  private pointsGeometry: THREE.BufferGeometry | null = null
  private points: THREE.Points | null = null
  private pointsScene: THREE.Scene | null = null

  private updateMaterial: THREE.ShaderMaterial | null = null
  private diffuseMaterial: THREE.ShaderMaterial | null = null
  private depositMaterial: THREE.ShaderMaterial | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null

  private supported = false
  private warned = false
  private frame = 0
  private pendingSide: number | null = null

  // Pending param values kept on the instance because updateParams() can run
  // before initialize() creates the materials (store hydration / paramSync run
  // order) — initialize() seeds the materials from these.
  private agentsParam: number
  private sensorAngle: number
  private sensorDist: number
  private decay: number
  private deposit: number
  private lumaBias: number

  constructor(params: Partial<PhysarumParams> = {}) {
    const p = { ...DEFAULT_PHYSARUM_PARAMS, ...params }

    super('PhysarumEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['trailTexture', new THREE.Uniform(null)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['hasSim', new THREE.Uniform(false)],
      ]),
    })

    this.agentsParam = p.agents
    this.sensorAngle = p.sensorAngle
    this.sensorDist = p.sensorDist
    this.decay = p.decay
    this.deposit = p.deposit
    this.lumaBias = p.lumaBias
  }

  private static sideFor(agents: number): number {
    const a = Math.max(10000, Math.min(300000, Math.round(agents)))
    return Math.ceil(Math.sqrt(a))
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.trailA) return

    // Feature-detect: needs WebGL2 render-to-float.
    const hasFloat =
      renderer.capabilities.isWebGL2 &&
      !!renderer.extensions.get('EXT_color_buffer_float')
    if (!hasFloat) {
      if (!this.warned) {
        console.warn(
          '[PhysarumEffect] WebGL2 + EXT_color_buffer_float required; ' +
            'effect passing input through unchanged.'
        )
        this.warned = true
      }
      this.supported = false
      return
    }
    this.supported = true

    const W = PhysarumEffect.TRAIL_WIDTH
    const H = PhysarumEffect.TRAIL_HEIGHT

    const trailOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.trailA = new THREE.WebGLRenderTarget(W, H, trailOpts)
    this.trailB = new THREE.WebGLRenderTarget(W, H, trailOpts)

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
        trail: { value: null },
        texel: { value: new THREE.Vector2(1 / W, 1 / H) },
        sensorAngleRad: { value: (this.sensorAngle * Math.PI) / 180 },
        sensorDist: { value: this.sensorDist },
        speed: { value: PhysarumEffect.STEP_SPEED },
        frame: { value: 0 },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: UPDATE_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    })

    this.diffuseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        trail: { value: null },
        video: { value: null },
        texel: { value: new THREE.Vector2(1 / W, 1 / H) },
        decay: { value: this.decay },
        lumaBias: { value: this.lumaBias },
      },
      vertexShader: QUAD_VERTEX_SHADER,
      fragmentShader: DIFFUSE_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    })

    this.depositMaterial = new THREE.ShaderMaterial({
      uniforms: {
        agentState: { value: null },
        deposit: { value: this.deposit },
      },
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

    this.pointsGeometry = new THREE.BufferGeometry()
    this.points = new THREE.Points(this.pointsGeometry, this.depositMaterial)
    this.points.frustumCulled = false
    this.pointsScene = new THREE.Scene()
    this.pointsScene.add(this.points)

    // Clear both trail targets to zero (fresh RT contents are undefined GPU
    // memory, which would seed the sim with noise).
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

    // Seed agents on the first update() (needs the renderer, which is here but
    // reallocation shares one code path gated by pendingSide).
    this.pendingSide = PhysarumEffect.sideFor(this.agentsParam)
  }

  // (Re)allocate the agent-state ping-pong + points geometry for `side²`
  // agents and seed random positions/headings. Called from update() (guarded
  // by pendingSide) so a renderer is always available. Renderer state is
  // saved/restored by the update() caller.
  private reallocateAgents(renderer: THREE.WebGLRenderer, side: number) {
    if (
      !this.copyMaterial ||
      !this.quad ||
      !this.quadScene ||
      !this.quadCamera ||
      !this.pointsGeometry
    )
      return

    this.agentA?.dispose()
    this.agentB?.dispose()

    const opts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    }
    this.agentA = new THREE.WebGLRenderTarget(side, side, opts)
    this.agentB = new THREE.WebGLRenderTarget(side, side, opts)

    const count = side * side

    // Seed positions/headings via a DataTexture, then blit into agentA.
    const data = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      data[i * 4] = Math.random()
      data[i * 4 + 1] = Math.random()
      data[i * 4 + 2] = Math.random() * Math.PI * 2
      data[i * 4 + 3] = 1
    }
    const seedTex = new THREE.DataTexture(
      data, side, side, THREE.RGBAFormat, THREE.FloatType
    )
    seedTex.needsUpdate = true

    this.copyMaterial.uniforms.src.value = seedTex
    this.quad.material = this.copyMaterial
    renderer.setRenderTarget(this.agentA)
    renderer.render(this.quadScene, this.quadCamera)
    seedTex.dispose()

    // Rebuild the points geometry: one vertex per agent, `reference` = its
    // texel UV in the state texture. `position` is a required dummy attribute.
    const positions = new Float32Array(count * 3)
    const reference = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const col = i % side
      const row = Math.floor(i / side)
      reference[i * 2] = (col + 0.5) / side
      reference[i * 2 + 1] = (row + 0.5) / side
    }
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.pointsGeometry.setAttribute('reference', new THREE.BufferAttribute(reference, 2))
    this.pointsGeometry.setDrawRange(0, count)

    this.agentRead = this.agentA
    this.agentWrite = this.agentB
    this.side = side
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.supported) return
    if (!this.trailRead || !this.trailWrite || !this.quad || !this.quadScene) return
    if (
      !this.updateMaterial ||
      !this.diffuseMaterial ||
      !this.depositMaterial ||
      !this.pointsScene ||
      !this.quadCamera
    )
      return

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

    if (this.pendingSide !== null) {
      this.reallocateAgents(renderer, this.pendingSide)
      this.pendingSide = null
    }

    if (!this.agentRead || !this.agentWrite) {
      renderer.setRenderTarget(prevTarget)
      return
    }

    this.frame++

    // ─── 1. UPDATE agents (read agentRead + trailRead → agentWrite) ─────────
    this.updateMaterial.uniforms.agentState.value = this.agentRead.texture
    this.updateMaterial.uniforms.trail.value = this.trailRead.texture
    this.updateMaterial.uniforms.frame.value = this.frame
    this.quad.material = this.updateMaterial
    renderer.autoClear = true
    renderer.setRenderTarget(this.agentWrite)
    renderer.render(this.quadScene, this.quadCamera)
    // swap agents — agentRead now holds the new positions
    {
      const t = this.agentRead
      this.agentRead = this.agentWrite
      this.agentWrite = t
    }

    // ─── 2. DIFFUSE trail (read trailRead + video → trailWrite) ─────────────
    this.diffuseMaterial.uniforms.trail.value = this.trailRead.texture
    this.diffuseMaterial.uniforms.video.value = inputBuffer.texture
    this.quad.material = this.diffuseMaterial
    renderer.autoClear = true
    renderer.setRenderTarget(this.trailWrite)
    renderer.render(this.quadScene, this.quadCamera)

    // ─── 3. DEPOSIT agents additively onto trailWrite (no clear) ────────────
    this.depositMaterial.uniforms.agentState.value = this.agentRead.texture
    renderer.autoClear = false
    renderer.setRenderTarget(this.trailWrite)
    renderer.render(this.pointsScene, this.quadCamera)

    // swap trail — trailRead now holds the latest trail
    {
      const t = this.trailRead
      this.trailRead = this.trailWrite
      this.trailWrite = t
    }

    // ─── restore renderer state ─────────────────────────────────────────────
    renderer.autoClear = prevAutoClear
    renderer.setRenderTarget(prevTarget)
    renderer.setViewport(prevViewport)
    renderer.setScissor(prevScissor)
    renderer.setScissorTest(prevScissorTest)
    renderer.setClearColor(prevClear, prevAlpha)

    this.uniforms.get('trailTexture')!.value = this.trailRead.texture
    this.uniforms.get('hasSim')!.value = true
  }

  setSize(_width: number, _height: number) {
    super.setSize?.(_width, _height)
    // No-op: the sim runs at a fixed 768×432 resolution (see TRAIL_WIDTH/HEIGHT).
  }

  updateParams(params: Partial<PhysarumParams>) {
    if (params.agents !== undefined) {
      this.agentsParam = params.agents
      const desired = PhysarumEffect.sideFor(params.agents)
      // Reallocate only when the agent count crosses the current texture
      // capacity (guard like RUTT's geometry rebuild); deferred to update()
      // where a renderer is available.
      if (this.supported && desired !== this.side) this.pendingSide = desired
    }
    if (params.sensorAngle !== undefined) {
      this.sensorAngle = params.sensorAngle
      if (this.updateMaterial)
        this.updateMaterial.uniforms.sensorAngleRad.value = (params.sensorAngle * Math.PI) / 180
    }
    if (params.sensorDist !== undefined) {
      this.sensorDist = params.sensorDist
      if (this.updateMaterial) this.updateMaterial.uniforms.sensorDist.value = params.sensorDist
    }
    if (params.decay !== undefined) {
      this.decay = params.decay
      if (this.diffuseMaterial) this.diffuseMaterial.uniforms.decay.value = params.decay
    }
    if (params.deposit !== undefined) {
      this.deposit = params.deposit
      if (this.depositMaterial) this.depositMaterial.uniforms.deposit.value = params.deposit
    }
    if (params.lumaBias !== undefined) {
      this.lumaBias = params.lumaBias
      if (this.diffuseMaterial) this.diffuseMaterial.uniforms.lumaBias.value = params.lumaBias
    }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // True inverse of initialize(): dispose+null ALL targets/materials/geometry
  // and scene refs, reset flags, so a guarded re-initialize() rebuilds cleanly
  // on the next enable without leaking GPU resources.
  releaseTargets() {
    this.trailA?.dispose(); this.trailA = null
    this.trailB?.dispose(); this.trailB = null
    this.trailRead = null
    this.trailWrite = null
    this.agentA?.dispose(); this.agentA = null
    this.agentB?.dispose(); this.agentB = null
    this.agentRead = null
    this.agentWrite = null
    this.side = 0

    this.updateMaterial?.dispose(); this.updateMaterial = null
    this.diffuseMaterial?.dispose(); this.diffuseMaterial = null
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

    this.frame = 0
    this.pendingSide = null
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
    this.updateMaterial?.dispose()
    this.diffuseMaterial?.dispose()
    this.depositMaterial?.dispose()
    this.copyMaterial?.dispose()
    this.quad?.geometry.dispose()
    this.pointsGeometry?.dispose()
  }
}
