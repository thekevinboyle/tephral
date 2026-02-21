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
  mix: number                  // 0-1 dry/wet blend
}

export const DEFAULT_POINT_CLOUD_PARAMS: PointCloudParams = {
  density: 128,
  pointSize: 3,
  depthMultiplier: 0.5,
  depthChannel: 'luminance',
  depthInvert: false,
  noiseDisplace: 0,
  noiseScale: 2,
  noiseSpeed: 0.5,
  opacity: 1,
  rotateX: 0.3,
  rotateY: 0.3,
  zoom: 1.5,
  mix: 1,
}

const MAX_DENSITY = 512

// Vertex shader for the internal THREE.Points scene
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

  // Sample video texture
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

  depth *= depthMultiplier;

  // Map UV to XY position: centered at origin, spanning -0.5 to 0.5
  vec3 pos = vec3(uv.x - 0.5, (1.0 - uv.y) - 0.5, depth);

  // Add noise displacement
  if (noiseDisplace > 0.001) {
    float n = snoise(vec3(pos.xy * noiseScale, time * noiseSpeed));
    pos.z += n * noiseDisplace;
    pos.x += snoise(vec3(pos.xy * noiseScale + 100.0, time * noiseSpeed)) * noiseDisplace * 0.3;
    pos.y += snoise(vec3(pos.xy * noiseScale + 200.0, time * noiseSpeed)) * noiseDisplace * 0.3;
  }

  vOpacity = uOpacity;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = pointSize * (300.0 / -mvPosition.z);
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
  // Alpha-blend the point cloud over the input
  vec3 blended = mix(inputColor.rgb, pcColor.rgb, pcColor.a * effectMix);
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

    // Set up internal scene
    this.pcScene = new THREE.Scene()
    this.pcCamera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)

    // Create geometry with pre-allocated max buffer
    this.pcGeometry = new THREE.BufferGeometry()
    this.allocateBuffer(MAX_DENSITY)

    // Create shader material
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
      },
      vertexShader: pointsVertexShader,
      fragmentShader: pointsFragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    })

    this.pcPoints = new THREE.Points(this.pcGeometry, this.pcMaterial)
    this.pcScene.add(this.pcPoints)

    // Set initial density draw range
    this.setDensity(p.density)

    // Set initial camera position
    this.updateCamera(p.rotateX, p.rotateY, p.zoom)
  }

  private allocateBuffer(density: number) {
    const count = density * density
    const positions = new Float32Array(count * 3)

    // Fill UV grid positions
    for (let y = 0; y < density; y++) {
      for (let x = 0; x < density; x++) {
        const i = (y * density + x) * 3
        positions[i] = x / (density - 1)       // u
        positions[i + 1] = y / (density - 1)   // v
        positions[i + 2] = 0                     // z (unused, set in shader)
      }
    }

    this.pcGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
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

  private updateCamera(rotateX: number, rotateY: number, zoom: number) {
    // Spherical coordinates: rotateX = azimuth, rotateY = elevation
    const phi = rotateY  // elevation (-PI/2 to PI/2)
    const theta = rotateX // azimuth
    const r = zoom

    this.pcCamera.position.set(
      r * Math.cos(phi) * Math.sin(theta),
      r * Math.sin(phi),
      r * Math.cos(phi) * Math.cos(theta)
    )
    this.pcCamera.lookAt(0, 0, 0)
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())
    this.renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.renderTarget) return

    this.elapsedTime += deltaTime || 0

    // Set video texture from input buffer
    this.pcMaterial.uniforms.videoTexture.value = inputBuffer.texture
    this.pcMaterial.uniforms.time.value = this.elapsedTime

    // Update camera aspect ratio
    this.pcCamera.aspect = this.renderTarget.width / this.renderTarget.height
    this.pcCamera.updateProjectionMatrix()

    // Render point cloud to internal render target
    const currentTarget = renderer.getRenderTarget()
    renderer.setRenderTarget(this.renderTarget)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(this.pcScene, this.pcCamera)
    renderer.setRenderTarget(currentTarget)

    // Bind render target texture to composite shader
    this.uniforms.get('pointCloudTexture')!.value = this.renderTarget.texture
    this.uniforms.get('hasPointCloud')!.value = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.renderTarget?.setSize(width, height)
  }

  updateParams(params: Partial<PointCloudParams>) {
    if (params.density !== undefined) this.setDensity(params.density)
    if (params.pointSize !== undefined) this.pcMaterial.uniforms.pointSize.value = params.pointSize
    if (params.depthMultiplier !== undefined) this.pcMaterial.uniforms.depthMultiplier.value = params.depthMultiplier
    if (params.depthChannel !== undefined) this.pcMaterial.uniforms.depthChannel.value = depthChannelToInt(params.depthChannel)
    if (params.depthInvert !== undefined) this.pcMaterial.uniforms.depthInvert.value = params.depthInvert
    if (params.noiseDisplace !== undefined) this.pcMaterial.uniforms.noiseDisplace.value = params.noiseDisplace
    if (params.noiseScale !== undefined) this.pcMaterial.uniforms.noiseScale.value = params.noiseScale
    if (params.noiseSpeed !== undefined) this.pcMaterial.uniforms.noiseSpeed.value = params.noiseSpeed
    if (params.opacity !== undefined) this.pcMaterial.uniforms.uOpacity.value = params.opacity
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix

    // Update camera if orbit params changed
    if (params.rotateX !== undefined || params.rotateY !== undefined || params.zoom !== undefined) {
      const rx = params.rotateX ?? Math.atan2(this.pcCamera.position.x, this.pcCamera.position.z)
      const ry = params.rotateY ?? Math.asin(this.pcCamera.position.y / this.pcCamera.position.length())
      const z = params.zoom ?? this.pcCamera.position.length()
      this.updateCamera(rx, ry, z)
    }
  }

  dispose() {
    super.dispose()
    this.pcGeometry.dispose()
    this.pcMaterial.dispose()
    this.renderTarget?.dispose()
  }
}
