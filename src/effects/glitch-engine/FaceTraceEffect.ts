import * as THREE from 'three'
import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

// Face mesh triangulation indices for MediaPipe 468 landmarks
// These define the face mesh triangles for rasterization
const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
]

// Simplified fragment shader - mask is set from CPU/geometry, shader just samples it
const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform sampler2D faceMaskTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform float effectMix;
uniform bool hasFaceData;
uniform float feather;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float mask = 0.0;

  if (hasFaceData) {
    // Sample the face mask texture (rendered by geometry pass)
    mask = texture2D(faceMaskTexture, uv).r;

    // Apply feathering
    mask = smoothstep(threshold - feather, threshold + feather, mask);
  }

  // Blend with trail if enabled
  if (trailEnabled) {
    float trail = texture2D(trailTexture, uv).r * trailDecay;
    mask = max(mask, trail);
  }

  // Output mask
  vec4 effectColor = vec4(mask, mask, mask, 1.0);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface FaceTraceParams extends TraceParams {
  feather: number      // 0-0.5: edge feathering amount
  fillMode: 'mesh' | 'oval' | 'bbox'  // how to fill face region
}

export const DEFAULT_FACE_TRACE_PARAMS: FaceTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.5,
  feather: 0.02,
  fillMode: 'oval',
}

export interface FaceLandmarkData {
  points: Array<{ x: number; y: number }>  // normalized 0-1 coordinates
  boundingBox?: { x: number; y: number; width: number; height: number }
}

/**
 * Face Trace Effect
 *
 * Creates a mask based on MediaPipe face landmark detections.
 * The face region becomes white in the mask, background becomes black.
 *
 * Uses a separate geometry render pass to rasterize the face mesh,
 * then samples that texture in the postprocessing shader.
 *
 * Requires landmark data to be set externally via setFaceLandmarks().
 */
export class FaceTraceEffect extends TraceEffect {
  // Face mask rendering
  private faceMaskTarget: THREE.WebGLRenderTarget | null = null
  private faceScene: THREE.Scene | null = null
  private faceCamera: THREE.OrthographicCamera | null = null
  private faceMesh: THREE.Mesh | null = null
  private faceGeometry: THREE.BufferGeometry | null = null
  private faceMaterial: THREE.MeshBasicMaterial | null = null

  // Current landmarks
  private landmarks: FaceLandmarkData[] = []
  private fillMode: 'mesh' | 'oval' | 'bbox' = 'oval'

  constructor(params: Partial<FaceTraceParams> = {}) {
    const p = { ...DEFAULT_FACE_TRACE_PARAMS, ...params }
    super('FaceTraceEffect', fragmentShader, p)

    this.fillMode = p.fillMode

    // Add face-specific uniforms
    this.uniforms.set('faceMaskTexture', new THREE.Uniform(null))
    this.uniforms.set('hasFaceData', new THREE.Uniform(false))
    this.uniforms.set('feather', new THREE.Uniform(p.feather))
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    // Create face mask render target
    this.faceMaskTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Setup scene for face mask rendering
    this.faceScene = new THREE.Scene()
    this.faceScene.background = new THREE.Color(0x000000)
    this.faceCamera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1)

    // Create geometry that will be updated with landmarks
    this.faceGeometry = new THREE.BufferGeometry()
    this.faceMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    })
    this.faceMesh = new THREE.Mesh(this.faceGeometry, this.faceMaterial)
    this.faceScene.add(this.faceMesh)
  }

  /**
   * Set face landmarks from MediaPipe detection.
   * Call this each frame with updated landmark data.
   */
  setFaceLandmarks(faces: FaceLandmarkData[]) {
    this.landmarks = faces
    this.uniforms.get('hasFaceData')!.value = faces.length > 0
  }

  /**
   * Render face mask geometry to texture.
   * Call this before the main render pass.
   */
  renderFaceMask(renderer: THREE.WebGLRenderer) {
    if (!this.faceMaskTarget || !this.faceScene || !this.faceCamera || !this.faceGeometry) {
      return
    }

    // Clear and prepare scene
    renderer.setRenderTarget(this.faceMaskTarget)
    renderer.setClearColor(0x000000)
    renderer.clear()

    if (this.landmarks.length === 0) {
      renderer.setRenderTarget(null)
      return
    }

    // Render each face
    for (const face of this.landmarks) {
      this.updateGeometryForFace(face)
      renderer.render(this.faceScene, this.faceCamera)
    }

    renderer.setRenderTarget(null)
  }

  private updateGeometryForFace(face: FaceLandmarkData) {
    if (!this.faceGeometry) return

    const points = face.points

    if (this.fillMode === 'bbox' && face.boundingBox) {
      // Simple bounding box quad
      const bb = face.boundingBox
      const vertices = new Float32Array([
        bb.x, 1 - bb.y, 0,
        bb.x + bb.width, 1 - bb.y, 0,
        bb.x + bb.width, 1 - (bb.y + bb.height), 0,
        bb.x, 1 - (bb.y + bb.height), 0,
      ])
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

      this.faceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      this.faceGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    } else if (this.fillMode === 'oval' && points.length >= 36) {
      // Use face oval landmarks to create an oval shape
      const ovalPoints: number[] = []
      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

      // Get oval outline points
      for (const idx of FACE_OVAL_INDICES) {
        if (idx < points.length) {
          ovalPoints.push(points[idx].x, 1 - points[idx].y, 0)
        }
      }

      // Create fan triangulation from center
      const vertices: number[] = [centerX, 1 - centerY, 0]  // Center point
      vertices.push(...ovalPoints)

      const numPoints = ovalPoints.length / 3
      const indices: number[] = []
      for (let i = 0; i < numPoints; i++) {
        indices.push(0, i + 1, ((i + 1) % numPoints) + 1)
      }

      this.faceGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
      this.faceGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))
    } else {
      // Full mesh mode - use face mesh triangulation
      // For simplicity, use convex hull of all points with fan triangulation
      if (points.length < 3) return

      const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length
      const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length

      // Sort points by angle from center
      const sorted = points.map((p, i) => ({
        x: p.x,
        y: p.y,
        angle: Math.atan2(p.y - centerY, p.x - centerX),
        idx: i
      })).sort((a, b) => a.angle - b.angle)

      // Create vertices with center
      const vertices = new Float32Array(3 + sorted.length * 3)
      vertices[0] = centerX
      vertices[1] = 1 - centerY
      vertices[2] = 0

      for (let i = 0; i < sorted.length; i++) {
        vertices[3 + i * 3] = sorted[i].x
        vertices[3 + i * 3 + 1] = 1 - sorted[i].y
        vertices[3 + i * 3 + 2] = 0
      }

      // Fan triangulation
      const numPoints = sorted.length
      const indices = new Uint16Array(numPoints * 3)
      for (let i = 0; i < numPoints; i++) {
        indices[i * 3] = 0
        indices[i * 3 + 1] = i + 1
        indices[i * 3 + 2] = ((i + 1) % numPoints) + 1
      }

      this.faceGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      this.faceGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    }

    this.faceGeometry.computeBoundingSphere()
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    super.update(renderer, inputBuffer, deltaTime)

    // Render face mask geometry
    this.renderFaceMask(renderer)

    // Set texture for shader
    this.uniforms.get('faceMaskTexture')!.value = this.faceMaskTarget?.texture
  }

  setSize(width: number, height: number) {
    super.setSize(width, height)
    this.faceMaskTarget?.setSize(width, height)
  }

  updateParams(params: Partial<FaceTraceParams>) {
    super.updateParams(params)
    if (params.feather !== undefined) {
      this.uniforms.get('feather')!.value = params.feather
    }
    if (params.fillMode !== undefined) {
      this.fillMode = params.fillMode
    }
  }

  dispose() {
    super.dispose()
    this.faceMaskTarget?.dispose()
    this.faceGeometry?.dispose()
    this.faceMaterial?.dispose()
  }
}
