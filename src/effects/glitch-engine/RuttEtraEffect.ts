import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// ═══════════════════════════════════════════════════════════════════════════
// RUTT-ETRA - luminance-displaced scanline mesh, the classic 1970s Scan
// Processor look. `lines` horizontal line strips run across the frame; each
// vertex samples the source video's luminance at its own UV and pushes the
// vertex forward in Z (toward camera) with a small screen-Y lift, both scaled
// by `depth`. An internal perspective camera, tilted `tilt` degrees off the
// straight-on view, renders the resulting wireframe relief onto a black
// background to an offscreen target; the composite fragment shader mixes
// that target over the source frame by `mix` (effectMix).
// ═══════════════════════════════════════════════════════════════════════════

export interface RuttEtraParams {
  lines: number  // 16-128, number of horizontal line strips
  depth: number  // 0-100, luminance-driven Z push + Y lift amount
  tilt: number   // 0-60, camera elevation angle (degrees) off straight-on
  glow: number   // 0-1, additive line brightness boost
  mix: number    // 0-1, dry/wet
}

export const DEFAULT_RUTT_ETRA_PARAMS: RuttEtraParams = {
  lines: 64,
  depth: 40,
  tilt: 30,
  glow: 0.4,
  mix: 1,
}

// Geometry is pre-allocated for the full param range (lines: 16-128) so
// updateParams() only ever rewrites/redraws-range within one fixed buffer —
// never reallocates. Each line strip is built as SEGMENTS_PER_LINE
// consecutive (v0,v1) pairs consumed by gl.LINES, so line strips never
// connect to each other despite sharing one draw call / one geometry.
const MAX_LINES = 128
const SEGMENTS_PER_LINE = 160
const VERTS_PER_LINE = SEGMENTS_PER_LINE * 2

// Internal scene camera constants. CAMERA_DIST is sized so the mesh's
// worst-case bounding sphere (plane extent ± max Z push/Y lift) stays inside
// the frustum at every tilt angle (camera orbits at constant radius CAMERA_DIST
// regardless of tilt, so this only needs checking once).
const FOV = 50
const CAMERA_DIST = 6.5
const MAX_Z_PUSH = 1.6
const MAX_Y_LIFT = 0.5

// Vertex shader for the internal THREE.LineSegments scene.
// position.xy holds UV coordinates (0-1); Z push / Y lift come from sampled
// source-video luminance × depth.
const linesVertexShader = `
uniform sampler2D videoTexture;
uniform float depth;
uniform float glow;

varying vec3 vColor;

void main() {
  vec2 uv = position.xy;
  vec4 texColor = texture2D(videoTexture, uv);
  float lum = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

  float depthNorm = depth / 100.0;
  float push = lum * depthNorm;

  vec3 pos = vec3(
    (uv.x - 0.5) * 2.0,
    (uv.y - 0.5) * 2.0 + push * ${MAX_Y_LIFT.toFixed(2)},
    push * ${MAX_Z_PUSH.toFixed(2)}
  );

  vColor = texColor.rgb * (1.0 + glow * 2.0);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

const linesFragmentShader = `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}
`

// Postprocessing fragment shader — mixes the rendered scanline mesh over the
// source frame by effectMix. Black background: at mix=1 the source is fully
// replaced by the scanline mesh on black, the classic Scan Processor output.
const compositeFragmentShader = `
uniform sampler2D ruttTexture;
uniform float effectMix;
uniform bool hasRutt;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasRutt || effectMix <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec4 ruttColor = texture2D(ruttTexture, uv);
  vec3 blended = mix(inputColor.rgb, ruttColor.rgb, effectMix);
  outputColor = vec4(blended, inputColor.a);
}
`

export class RuttEtraEffect extends Effect {
  // Internal scene rendered to an offscreen target then composited
  private lineScene: THREE.Scene
  private lineCamera: THREE.PerspectiveCamera
  private lineGeometry: THREE.BufferGeometry
  private lineMaterial: THREE.ShaderMaterial
  private lineSegments: THREE.LineSegments
  private renderTarget: THREE.WebGLRenderTarget | null = null

  private currentLines = 0
  private _tilt: number
  private _viewportWidth = 1920
  private _viewportHeight = 1080

  constructor(params: Partial<RuttEtraParams> = {}) {
    const p = { ...DEFAULT_RUTT_ETRA_PARAMS, ...params }

    super('RuttEtraEffect', compositeFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['ruttTexture', new THREE.Uniform(null)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['hasRutt', new THREE.Uniform(false)],
      ]),
    })

    this._tilt = p.tilt

    this.lineScene = new THREE.Scene()
    this.lineCamera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100)

    this.lineGeometry = new THREE.BufferGeometry()
    this.allocateBuffer()

    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        videoTexture: { value: null },
        depth: { value: p.depth },
        glow: { value: p.glow },
      },
      vertexShader: linesVertexShader,
      fragmentShader: linesFragmentShader,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    // LineSegments (not Line/LineStrip) so each (v0,v1) vertex pair draws as
    // an independent segment — required to keep the `lines` horizontal
    // strips from connecting to each other within one draw call.
    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial)
    this.lineScene.add(this.lineSegments)

    this.setLines(p.lines)
  }

  private allocateBuffer() {
    const count = MAX_LINES * VERTS_PER_LINE
    const positions = new Float32Array(count * 3)
    const attr = new THREE.BufferAttribute(positions, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    this.lineGeometry.setAttribute('position', attr)
  }

  private setLines(lines: number) {
    lines = Math.max(16, Math.min(MAX_LINES, Math.round(lines)))
    if (lines === this.currentLines) return

    const posAttr = this.lineGeometry.getAttribute('position') as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array

    for (let row = 0; row < lines; row++) {
      const v = lines > 1 ? row / (lines - 1) : 0.5
      for (let seg = 0; seg < SEGMENTS_PER_LINE; seg++) {
        const u0 = seg / SEGMENTS_PER_LINE
        const u1 = (seg + 1) / SEGMENTS_PER_LINE
        const base = (row * VERTS_PER_LINE + seg * 2) * 3
        arr[base] = u0
        arr[base + 1] = v
        arr[base + 2] = 0
        arr[base + 3] = u1
        arr[base + 4] = v
        arr[base + 5] = 0
      }
    }

    posAttr.needsUpdate = true
    this.lineGeometry.setDrawRange(0, lines * VERTS_PER_LINE)
    this.currentLines = lines
  }

  // Render targets are the only thing created here (geometry/material live
  // in the constructor), so this is the sole allocation releaseTargets()
  // must invert.
  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.renderTarget) return

    const drawingBufferSize = renderer.getDrawingBufferSize(new THREE.Vector2())
    this.renderTarget = new THREE.WebGLRenderTarget(drawingBufferSize.x, drawingBufferSize.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })
    this._viewportWidth = drawingBufferSize.x
    this._viewportHeight = drawingBufferSize.y
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.renderTarget) return

    this.lineMaterial.uniforms.videoTexture.value = inputBuffer.texture

    // Position the camera on an orbit of constant radius CAMERA_DIST, tilted
    // `tilt` degrees off the straight-on (elevation 0) view.
    const tiltRad = (this._tilt * Math.PI) / 180
    this.lineCamera.position.set(0, CAMERA_DIST * Math.sin(tiltRad), CAMERA_DIST * Math.cos(tiltRad))
    this.lineCamera.lookAt(0, 0, 0)
    this.lineCamera.aspect = this._viewportWidth / this._viewportHeight
    this.lineCamera.updateProjectionMatrix()

    const prevTarget = renderer.getRenderTarget()
    const prevClearColor = new THREE.Color()
    renderer.getClearColor(prevClearColor)
    const prevClearAlpha = renderer.getClearAlpha()
    const prevViewport = new THREE.Vector4()
    renderer.getViewport(prevViewport)
    const prevScissor = new THREE.Vector4()
    renderer.getScissor(prevScissor)
    const prevScissorTest = renderer.getScissorTest()

    renderer.setRenderTarget(this.renderTarget)
    renderer.setViewport(0, 0, this._viewportWidth, this._viewportHeight)
    renderer.setScissorTest(false)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, false)
    renderer.render(this.lineScene, this.lineCamera)

    renderer.setRenderTarget(prevTarget)
    renderer.setViewport(prevViewport)
    renderer.setScissor(prevScissor)
    renderer.setScissorTest(prevScissorTest)
    renderer.setClearColor(prevClearColor, prevClearAlpha)

    this.uniforms.get('ruttTexture')!.value = this.renderTarget.texture
    this.uniforms.get('hasRutt')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.renderTarget?.setSize(width, height)
    this._viewportWidth = width
    this._viewportHeight = height
  }

  updateParams(params: Partial<RuttEtraParams>) {
    if (params.lines !== undefined) this.setLines(params.lines)
    if (params.depth !== undefined) this.lineMaterial.uniforms.depth.value = params.depth
    if (params.glow !== undefined) this.lineMaterial.uniforms.glow.value = params.glow
    if (params.tilt !== undefined) this._tilt = params.tilt
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // True inverse of initialize(): only the render target is allocated there,
  // so only it needs releasing on disable. Geometry/material are
  // constructor-owned and only freed in dispose().
  releaseTargets() {
    this.renderTarget?.dispose(); this.renderTarget = null
    this.uniforms.get('hasRutt')!.value = false
  }

  dispose() {
    super.dispose()
    this.lineGeometry.dispose()
    this.lineMaterial.dispose()
    this.renderTarget?.dispose()
  }
}
