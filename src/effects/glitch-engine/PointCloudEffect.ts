import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

export type PointCloudDepthChannel = 'luminance' | 'red' | 'green' | 'blue'

export interface PointCloudParams {
  density: number              // 64-512, grid resolution (density x density points)
  pointSize: number            // 1-20
  depthMultiplier: number      // 0-2
  depthChannel: PointCloudDepthChannel
  depthInvert: boolean
  noiseDisplace: number        // 0-1
  noiseScale: number           // 0.1-10
  noiseSpeed: number           // 0-2
  opacity: number              // 0-1
  rotateX: number              // -PI to PI (camera orbit)
  rotateY: number              // -PI/2 to PI/2 (camera elevation)
  zoom: number                 // 0.5-5 (camera distance)
  scaleX: number               // 0.3-2.0 horizontal scale
  scaleY: number               // 0.3-2.0 vertical scale
  mix: number                  // 0-1 dry/wet blend
}

export const DEFAULT_POINT_CLOUD_PARAMS: PointCloudParams = {
  density: 128,
  pointSize: 3,
  depthMultiplier: 0.3,
  depthChannel: 'luminance',
  depthInvert: false,
  noiseDisplace: 0,
  noiseScale: 2,
  noiseSpeed: 0.5,
  opacity: 1,
  rotateX: 0.2,
  rotateY: 0.15,
  zoom: 1.5,
  scaleX: 1.0,
  scaleY: 1.0,
  mix: 1,
}

const MAX_DENSITY = 512
const FOV = 60
const HALF_FOV_RAD = (FOV / 2) * Math.PI / 180
const TAN_HALF_FOV = Math.tan(HALF_FOV_RAD)

// Vertex shader for the internal THREE.Points scene
// position.xy = UV coordinates (0-1), mapped to XY scaled by scaleX/scaleY
// Z = depth from video luminance/channel * depthMultiplier
const pointsVertexShader = `
uniform sampler2D videoTexture;
uniform float depthMultiplier;
uniform int depthChannel; // 0=luminance, 1=red, 2=green, 3=blue
uniform bool depthInvert;
uniform float noiseDisplace;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float pointSize;
uniform float uOpacity;
uniform float time;
uniform float scaleX;
uniform float scaleY;

varying vec3 vColor;
varying float vOpacity;

//
// Ashima 3D Simplex Noise (MIT License)
// github.com/ashima/webgl-noise
//
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // position.xy holds UV coordinates (0-1)
  vec2 uv = position.xy;

  // Sample video texture at this UV
  vec4 texColor = texture2D(videoTexture, uv);
  vColor = texColor.rgb;

  // Extract depth from selected channel
  float depth = 0.0;
  if (depthChannel == 0) {
    depth = dot(texColor.rgb, vec3(0.299, 0.587, 0.114)); // luminance
  } else if (depthChannel == 1) {
    depth = texColor.r;
  } else if (depthChannel == 2) {
    depth = texColor.g;
  } else {
    depth = texColor.b;
  }

  if (depthInvert) {
    depth = 1.0 - depth;
  }

  // depth is 0-1, depthMultiplier caps the max Z extrusion
  depth *= depthMultiplier;

  // Map UV to XY with user-controllable scale
  // scaleX/scaleY let you dial in the correct proportions for any video source
  vec3 pos = vec3((uv.x - 0.5) * scaleX, (uv.y - 0.5) * scaleY, depth);

  // Add noise displacement for organic movement
  if (noiseDisplace > 0.001) {
    float n = snoise(vec3(pos.xy * noiseScale, time * noiseSpeed));
    pos.z += n * noiseDisplace * 0.3;
    pos.x += snoise(vec3(pos.xy * noiseScale + 100.0, time * noiseSpeed)) * noiseDisplace * 0.1;
    pos.y += snoise(vec3(pos.xy * noiseScale + 200.0, time * noiseSpeed)) * noiseDisplace * 0.1;
  }

  vOpacity = uOpacity;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Point size is computed on CPU each frame based on density, viewport, and camera distance
  gl_PointSize = pointSize;
}
`

// Fragment shader for the internal THREE.Points scene
const pointsFragmentShader = `
varying vec3 vColor;
varying float vOpacity;

void main() {
  // Discard outside circle for round points
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  if (dot(coord, coord) > 1.0) discard;

  gl_FragColor = vec4(vColor, vOpacity);
}
`

// Postprocessing fragment shader — blends point cloud render target with input
const compositeFragmentShader = `
uniform sampler2D pointCloudTexture;
uniform float effectMix;
uniform bool hasPointCloud;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasPointCloud || effectMix <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec4 pcColor = texture2D(pointCloudTexture, uv);
  // Point cloud replaces the input entirely: points on black background.
  // Mix controls dry/wet: 0 = original video, 1 = point cloud only.
  vec3 pointCloudFrame = pcColor.rgb; // points are colored, gaps are black (cleared to 0,0,0,0)
  vec3 blended = mix(inputColor.rgb, pointCloudFrame, effectMix);
  outputColor = vec4(blended, inputColor.a);
}
`

const depthChannelToInt = (channel: PointCloudDepthChannel): number => {
  switch (channel) {
    case 'luminance': return 0
    case 'red': return 1
    case 'green': return 2
    case 'blue': return 3
    default: return 0
  }
}

export class PointCloudEffect extends Effect {
  // Internal scene for point cloud rendering
  private pcScene: THREE.Scene
  private pcCamera: THREE.PerspectiveCamera
  private pcGeometry: THREE.BufferGeometry
  private pcMaterial: THREE.ShaderMaterial
  private pcPoints: THREE.Points
  private renderTarget: THREE.WebGLRenderTarget | null = null

  private currentDensity = 0
  private maxAllocatedDensity = 0
  private elapsedTime = 0

  // Stored param values — update() uses these to position camera and compute point size
  private _rotateX: number
  private _rotateY: number
  private _zoom: number
  private _pointSize: number
  private _scaleX: number
  private _scaleY: number
  private _viewportWidth = 1920
  private _viewportHeight = 1080

  constructor(params: Partial<PointCloudParams> = {}) {
    const p = { ...DEFAULT_POINT_CLOUD_PARAMS, ...params }

    super('PointCloudEffect', compositeFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['pointCloudTexture', new THREE.Uniform(null)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['hasPointCloud', new THREE.Uniform(false)],
      ]),
    })

    // Store orbit + sizing state
    this._rotateX = p.rotateX
    this._rotateY = p.rotateY
    this._zoom = p.zoom
    this._pointSize = p.pointSize
    this._scaleX = p.scaleX
    this._scaleY = p.scaleY

    // Set up internal scene
    this.pcScene = new THREE.Scene()
    this.pcCamera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100)

    // Create geometry with pre-allocated max buffer
    this.pcGeometry = new THREE.BufferGeometry()
    this.allocateBuffer(MAX_DENSITY)

    // Create shader material for points
    this.pcMaterial = new THREE.ShaderMaterial({
      uniforms: {
        videoTexture: { value: null },
        depthMultiplier: { value: p.depthMultiplier },
        depthChannel: { value: depthChannelToInt(p.depthChannel) },
        depthInvert: { value: p.depthInvert },
        noiseDisplace: { value: p.noiseDisplace },
        noiseScale: { value: p.noiseScale },
        noiseSpeed: { value: p.noiseSpeed },
        pointSize: { value: p.pointSize },
        uOpacity: { value: p.opacity },
        time: { value: 0 },
        scaleX: { value: p.scaleX },
        scaleY: { value: p.scaleY },
      },
      vertexShader: pointsVertexShader,
      fragmentShader: pointsFragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    })

    // THREE.Points ensures gl.drawArrays uses gl.POINTS mode
    this.pcPoints = new THREE.Points(this.pcGeometry, this.pcMaterial)
    this.pcScene.add(this.pcPoints)

    // Set initial density draw range
    this.setDensity(p.density)
  }

  private allocateBuffer(density: number) {
    const count = density * density
    const positions = new Float32Array(count * 3)

    // Fill UV grid: each point gets (u, v, 0)
    // u and v range from 0 to 1 — the vertex shader maps these to world XY
    for (let y = 0; y < density; y++) {
      for (let x = 0; x < density; x++) {
        const i = (y * density + x) * 3
        positions[i] = x / (density - 1)       // u: 0 to 1
        positions[i + 1] = y / (density - 1)   // v: 0 to 1
        positions[i + 2] = 0                     // z placeholder (overridden in shader)
      }
    }

    const attr = new THREE.BufferAttribute(positions, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    this.pcGeometry.setAttribute('position', attr)
    this.maxAllocatedDensity = density
  }

  private setDensity(density: number) {
    density = Math.max(64, Math.min(MAX_DENSITY, Math.round(density)))

    if (density > this.maxAllocatedDensity) {
      this.allocateBuffer(density)
    }

    // Rebuild UV grid for current density within existing buffer
    if (density !== this.currentDensity) {
      const posAttr = this.pcGeometry.getAttribute('position') as THREE.BufferAttribute
      const arr = posAttr.array as Float32Array

      for (let y = 0; y < density; y++) {
        for (let x = 0; x < density; x++) {
          const i = (y * density + x) * 3
          arr[i] = x / (density - 1)
          arr[i + 1] = y / (density - 1)
          arr[i + 2] = 0
        }
      }

      posAttr.needsUpdate = true
      this.pcGeometry.setDrawRange(0, density * density)
      this.currentDensity = density
    }
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())
    this.renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
    this._viewportWidth = size.x
    this._viewportHeight = size.y
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.renderTarget) return

    this.elapsedTime += deltaTime || 0

    // Bind video texture from the effect pipeline's input buffer
    this.pcMaterial.uniforms.videoTexture.value = inputBuffer.texture
    this.pcMaterial.uniforms.time.value = this.elapsedTime
    // Sync scale uniforms every frame
    this.pcMaterial.uniforms.scaleX.value = this._scaleX
    this.pcMaterial.uniforms.scaleY.value = this._scaleY

    // Compute fit distance based on user-controlled scale
    const cameraAspect = this._viewportWidth / this._viewportHeight
    const cloudHeight = this._scaleY           // Y extent: -0.5*scaleY to 0.5*scaleY
    const cloudWidth = this._scaleX            // X extent: -0.5*scaleX to 0.5*scaleX
    const fitDistY = (cloudHeight / 2) / TAN_HALF_FOV
    const fitDistX = (cloudWidth / 2) / (TAN_HALF_FOV * cameraAspect)
    const fitDist = Math.max(fitDistY, fitDistX)

    // Camera distance: normalize zoom so default (1.5) = cloud fits ~95% of viewport
    const r = fitDist * (this._zoom / 1.5) * 1.05

    // Position camera using spherical coordinates
    const phi = this._rotateY
    const theta = this._rotateX
    this.pcCamera.position.set(
      r * Math.cos(phi) * Math.sin(theta),
      r * Math.sin(phi),
      r * Math.cos(phi) * Math.cos(theta)
    )
    this.pcCamera.lookAt(0, 0, 0)
    this.pcCamera.aspect = cameraAspect
    this.pcCamera.updateProjectionMatrix()

    // Auto-calculate point size so adjacent points just touch
    const visibleWorldHeight = 2 * r * TAN_HALF_FOV
    const maxWorldSpacing = Math.max(this._scaleX, this._scaleY) / Math.max(this.currentDensity - 1, 1)
    const pixelsPerWorldUnit = this._viewportHeight / visibleWorldHeight
    const autoSize = maxWorldSpacing * pixelsPerWorldUnit * 1.1
    // pointSize param (default 3) acts as multiplier: at 3 = 1x, at 1 = 0.33x, at 20 = 6.67x
    const finalSize = Math.max(1.0, autoSize * (this._pointSize / 3.0))
    this.pcMaterial.uniforms.pointSize.value = finalSize

    // Save GL state that we'll modify
    const prevTarget = renderer.getRenderTarget()
    const prevClearColor = new THREE.Color()
    const prevClearAlpha = renderer.getClearAlpha()
    renderer.getClearColor(prevClearColor)

    // Render point cloud scene to our internal render target
    renderer.setRenderTarget(this.renderTarget)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, false)
    renderer.render(this.pcScene, this.pcCamera)

    // Restore GL state
    renderer.setRenderTarget(prevTarget)
    renderer.setClearColor(prevClearColor, prevClearAlpha)

    // Pass the rendered point cloud texture to the composite fragment shader
    this.uniforms.get('pointCloudTexture')!.value = this.renderTarget.texture
    this.uniforms.get('hasPointCloud')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.renderTarget?.setSize(width, height)
    this._viewportWidth = width
    this._viewportHeight = height
  }

  updateParams(params: Partial<PointCloudParams>) {
    if (params.density !== undefined) this.setDensity(params.density)
    if (params.pointSize !== undefined) this._pointSize = params.pointSize
    if (params.depthMultiplier !== undefined) this.pcMaterial.uniforms.depthMultiplier.value = params.depthMultiplier
    if (params.depthChannel !== undefined) this.pcMaterial.uniforms.depthChannel.value = depthChannelToInt(params.depthChannel)
    if (params.depthInvert !== undefined) this.pcMaterial.uniforms.depthInvert.value = params.depthInvert
    if (params.noiseDisplace !== undefined) this.pcMaterial.uniforms.noiseDisplace.value = params.noiseDisplace
    if (params.noiseScale !== undefined) this.pcMaterial.uniforms.noiseScale.value = params.noiseScale
    if (params.noiseSpeed !== undefined) this.pcMaterial.uniforms.noiseSpeed.value = params.noiseSpeed
    if (params.opacity !== undefined) this.pcMaterial.uniforms.uOpacity.value = params.opacity
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix

    // Store values — camera positioning and scale happen in update()
    if (params.rotateX !== undefined) this._rotateX = params.rotateX
    if (params.rotateY !== undefined) this._rotateY = params.rotateY
    if (params.zoom !== undefined) this._zoom = params.zoom
    if (params.scaleX !== undefined) this._scaleX = params.scaleX
    if (params.scaleY !== undefined) this._scaleY = params.scaleY
  }

  dispose() {
    super.dispose()
    this.pcGeometry.dispose()
    this.pcMaterial.dispose()
    this.renderTarget?.dispose()
  }
}
