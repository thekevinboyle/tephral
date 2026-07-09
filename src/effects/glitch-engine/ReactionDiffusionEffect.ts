import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// ═══════════════════════════════════════════════════════════════════════════
// REACTION DIFFUSION - Gray-Scott sim seeded by source-video luminance edges.
// Runs a fixed-resolution (512x288) ping-pong Gray-Scott simulation
// independent of display resolution; `speed` sim steps advance per frame.
// The classic feed=0.037/kill=0.06 defaults sit in Pearson's "coral growth"
// regime, so a lightly-seeded field spreads into organic worm/coral patterns
// that keep evolving frame over frame.
// ═══════════════════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */ `
uniform sampler2D reactionTexture;
uniform float colorize;
uniform float effectMix;
uniform bool hasSim;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasSim) {
    outputColor = inputColor;
    return;
  }

  vec3 current = inputColor.rgb;
  float B = texture2D(reactionTexture, uv).g;

  // Two-tone gradient: dark teal (quiescent) -> white (fully reacted)
  vec3 darkTeal = vec3(0.02, 0.14, 0.16);
  vec3 white = vec3(1.0);
  vec3 simColor = mix(darkTeal, white, smoothstep(0.05, 0.65, B));

  vec3 result = mix(current, simColor, colorize);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

// ─── Offscreen Gray-Scott sim shader (raw THREE.ShaderMaterial — this never
// touches the postprocessing composer's input/output chain; it only reads
// its own ping-pong state plus the current video frame passed in via
// update()'s inputBuffer). ──────────────────────────────────────────────────
const SIM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SIM_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D simTexture;
uniform sampler2D videoTexture;
uniform float feed;
uniform float kill;
uniform float seedAmt;
uniform vec2 texel;
varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = vUv;
  vec4 ctr = texture2D(simTexture, uv);
  float A = ctr.r;
  float B = ctr.g;

  // ─── 3x3 Laplacian (corner 0.05, adjacent 0.2, center -1) ───────────
  vec4 n  = texture2D(simTexture, uv + vec2(0.0, texel.y));
  vec4 s  = texture2D(simTexture, uv - vec2(0.0, texel.y));
  vec4 e  = texture2D(simTexture, uv + vec2(texel.x, 0.0));
  vec4 w  = texture2D(simTexture, uv - vec2(texel.x, 0.0));
  vec4 ne = texture2D(simTexture, uv + vec2(texel.x, texel.y));
  vec4 nw = texture2D(simTexture, uv + vec2(-texel.x, texel.y));
  vec4 se = texture2D(simTexture, uv + vec2(texel.x, -texel.y));
  vec4 sw = texture2D(simTexture, uv - vec2(texel.x, texel.y));

  float lapA = (n.r + s.r + e.r + w.r) * 0.2 + (ne.r + nw.r + se.r + sw.r) * 0.05 - A;
  float lapB = (n.g + s.g + e.g + w.g) * 0.2 + (ne.g + nw.g + se.g + sw.g) * 0.05 - B;

  // ─── Gray-Scott reaction (Da=1.0, Db=0.5, dt=1.0) ────────────────────
  float reaction = A * B * B;
  float newA = A + (1.0 * lapA - reaction + feed * (1.0 - A));
  float newB = B + (0.5 * lapB + reaction - (kill + feed) * B);

  // ─── Seed B from source-video luminance edges each step ─────────────
  float lE = luma(texture2D(videoTexture, uv + vec2(texel.x, 0.0)).rgb);
  float lW = luma(texture2D(videoTexture, uv - vec2(texel.x, 0.0)).rgb);
  float lN = luma(texture2D(videoTexture, uv + vec2(0.0, texel.y)).rgb);
  float lS = luma(texture2D(videoTexture, uv - vec2(0.0, texel.y)).rgb);
  float edge = length(vec2(lE - lW, lN - lS));
  newB += edge * seedAmt * 0.12;

  gl_FragColor = vec4(clamp(newA, 0.0, 1.0), clamp(newB, 0.0, 1.0), 0.0, 1.0);
}
`

export interface ReactionDiffusionParams {
  feed: number      // 0.01-0.1
  kill: number       // 0.04-0.07
  speed: number        // 1-8, sim steps per frame (CPU-side loop)
  seedAmt: number        // 0-1
  colorize: number         // 0-1, sim-over-source blend
  mix: number                // 0-1, dry/wet
}

export const DEFAULT_REACTION_DIFFUSION_PARAMS: ReactionDiffusionParams = {
  feed: 0.037,
  kill: 0.06,
  speed: 4,
  seedAmt: 0.4,
  colorize: 0.6,
  mix: 1,
}

export class ReactionDiffusionEffect extends Effect {
  // Sim runs at a FIXED resolution independent of the display/canvas size —
  // Gray-Scott pattern scale is defined by the sim's own texel spacing, not
  // the viewport, so decoupling it keeps pattern scale (and perf) constant
  // regardless of output resolution.
  private static readonly SIM_WIDTH = 512
  private static readonly SIM_HEIGHT = 288

  private simTargetA: THREE.WebGLRenderTarget | null = null
  private simTargetB: THREE.WebGLRenderTarget | null = null
  private readTarget: THREE.WebGLRenderTarget | null = null
  private writeTarget: THREE.WebGLRenderTarget | null = null
  private simMaterial: THREE.ShaderMaterial | null = null
  private simGeometry: THREE.PlaneGeometry | null = null
  private simScene: THREE.Scene | null = null
  private simCamera: THREE.OrthographicCamera | null = null

  // Pending sim params — kept on the instance (not just on simMaterial)
  // because updateParams() can be called before initialize() creates the
  // material (store hydration / paramSync run order), so initialize() reads
  // these to seed the material with the current values instead of defaults.
  private feed: number
  private kill: number
  private seedAmt: number
  private speedSteps: number

  constructor(params: Partial<ReactionDiffusionParams> = {}) {
    const p = { ...DEFAULT_REACTION_DIFFUSION_PARAMS, ...params }

    super('ReactionDiffusionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['reactionTexture', new THREE.Uniform(null)],
        ['colorize', new THREE.Uniform(p.colorize)],
        ['hasSim', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.feed = p.feed
    this.kill = p.kill
    this.seedAmt = p.seedAmt
    this.speedSteps = p.speed
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.simTargetA) return

    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    }

    this.simTargetA = new THREE.WebGLRenderTarget(
      ReactionDiffusionEffect.SIM_WIDTH, ReactionDiffusionEffect.SIM_HEIGHT, options
    )
    this.simTargetB = new THREE.WebGLRenderTarget(
      ReactionDiffusionEffect.SIM_WIDTH, ReactionDiffusionEffect.SIM_HEIGHT, options
    )

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        simTexture: { value: null },
        videoTexture: { value: null },
        feed: { value: this.feed },
        kill: { value: this.kill },
        seedAmt: { value: this.seedAmt },
        texel: { value: new THREE.Vector2(1 / ReactionDiffusionEffect.SIM_WIDTH, 1 / ReactionDiffusionEffect.SIM_HEIGHT) },
      },
      vertexShader: SIM_VERTEX_SHADER,
      fragmentShader: SIM_FRAGMENT_SHADER,
    })

    this.simScene = new THREE.Scene()
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.simGeometry = new THREE.PlaneGeometry(2, 2)
    this.simScene.add(new THREE.Mesh(this.simGeometry, this.simMaterial))

    // Clear both ping-pong targets to the quiescent Gray-Scott state
    // (A=1, B=0) — a fresh WebGLRenderTarget's contents are otherwise
    // undefined GPU memory, which would inject noise into the very first
    // sim step instead of a clean nucleation field.
    const prevTarget = renderer.getRenderTarget()
    const prevClearColor = new THREE.Color()
    renderer.getClearColor(prevClearColor)
    const prevClearAlpha = renderer.getClearAlpha()

    renderer.setClearColor(new THREE.Color(1, 0, 0), 1)
    renderer.setRenderTarget(this.simTargetA)
    renderer.clear(true, true, true)
    renderer.setRenderTarget(this.simTargetB)
    renderer.clear(true, true, true)

    renderer.setClearColor(prevClearColor, prevClearAlpha)
    renderer.setRenderTarget(prevTarget)

    this.readTarget = this.simTargetA
    this.writeTarget = this.simTargetB
  }

  // Advances the Gray-Scott sim `speed` steps this frame. Unlike the
  // captureFrame-based temporal effects, this effect has no output-capture
  // path — the sim doesn't depend on the composited frame, only on the raw
  // video input — so all its GPU work happens here, gated by the pipeline's
  // temporalEnabled bookkeeping but never wired into render()'s
  // captureFrame block.
  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.simMaterial || !this.simScene || !this.simCamera || !this.readTarget || !this.writeTarget) return

    this.simMaterial.uniforms.videoTexture.value = inputBuffer.texture

    const prevTarget = renderer.getRenderTarget()
    const steps = Math.max(1, Math.min(8, Math.round(this.speedSteps)))

    // Local ping-pong pair: TS can't retain the readTarget/writeTarget
    // non-null narrowing across the loop once they're reassigned as class
    // properties, so swap locals here and write the class fields back once.
    let read = this.readTarget
    let write = this.writeTarget

    for (let i = 0; i < steps; i++) {
      this.simMaterial.uniforms.simTexture.value = read.texture
      renderer.setRenderTarget(write)
      renderer.render(this.simScene, this.simCamera)
      const tmp = read
      read = write
      write = tmp
    }

    this.readTarget = read
    this.writeTarget = write

    renderer.setRenderTarget(prevTarget)

    this.uniforms.get('reactionTexture')!.value = read.texture
    this.uniforms.get('hasSim')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    // Intentionally otherwise a no-op: the sim runs at a fixed 512x288
    // resolution independent of display/canvas size (see SIM_WIDTH/HEIGHT).
  }

  updateParams(params: Partial<ReactionDiffusionParams>) {
    if (params.feed !== undefined) {
      this.feed = params.feed
      if (this.simMaterial) this.simMaterial.uniforms.feed.value = params.feed
    }
    if (params.kill !== undefined) {
      this.kill = params.kill
      if (this.simMaterial) this.simMaterial.uniforms.kill.value = params.kill
    }
    if (params.seedAmt !== undefined) {
      this.seedAmt = params.seedAmt
      if (this.simMaterial) this.simMaterial.uniforms.seedAmt.value = params.seedAmt
    }
    if (params.speed !== undefined) this.speedSteps = params.speed
    if (params.colorize !== undefined) this.uniforms.get('colorize')!.value = params.colorize
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, material, and geometry. three.js only frees
  // compiled programs/VBOs via .dispose(), never via GC, so leaving any of
  // these orphaned while a guarded initialize() re-runs (and unconditionally
  // recreates them) leaks GPU resources on every disable/enable cycle.
  releaseTargets() {
    this.simTargetA?.dispose(); this.simTargetA = null
    this.simTargetB?.dispose(); this.simTargetB = null
    this.readTarget = null
    this.writeTarget = null
    this.simMaterial?.dispose(); this.simMaterial = null
    this.simGeometry?.dispose(); this.simGeometry = null
    this.simScene = null
    this.simCamera = null
    this.uniforms.get('hasSim')!.value = false
  }

  dispose() {
    super.dispose()
    this.simTargetA?.dispose()
    this.simTargetB?.dispose()
    this.simMaterial?.dispose()
    this.simGeometry?.dispose()
  }
}
