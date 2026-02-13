import * as THREE from 'three'
import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

// MediaPipe hand landmark connections for skeleton rendering
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm
  [5, 9], [9, 13], [13, 17],
]

const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform sampler2D handMaskTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform float effectMix;
uniform bool hasHandData;
uniform float feather;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float mask = 0.0;

  if (hasHandData) {
    // Sample the hand mask texture (rendered by geometry pass)
    mask = texture2D(handMaskTexture, uv).r;

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

export interface HandsTraceParams extends TraceParams {
  feather: number           // 0-0.5: edge feathering amount
  fillMode: 'skeleton' | 'hull' | 'bbox'  // how to fill hand region
  lineWidth: number         // width for skeleton lines (in normalized coords)
}

export const DEFAULT_HANDS_TRACE_PARAMS: HandsTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.5,
  feather: 0.02,
  fillMode: 'hull',
  lineWidth: 0.02,
}

export interface HandLandmarkData {
  points: Array<{ x: number; y: number }>  // 21 points, normalized 0-1 coordinates
  handedness: 'Left' | 'Right'
}

/**
 * Hands Trace Effect
 *
 * Creates a mask based on MediaPipe hand landmark detections.
 * Hand regions become white in the mask, background becomes black.
 *
 * Supports multiple fill modes:
 * - skeleton: Draws the hand skeleton connections
 * - hull: Fills the convex hull of hand landmarks
 * - bbox: Simple bounding box
 *
 * Requires landmark data to be set externally via setHandLandmarks().
 */
export class HandsTraceEffect extends TraceEffect {
  // Hand mask rendering
  private handMaskTarget: THREE.WebGLRenderTarget | null = null
  private handScene: THREE.Scene | null = null
  private handCamera: THREE.OrthographicCamera | null = null
  private handMesh: THREE.Mesh | null = null
  private handLines: THREE.LineSegments | null = null
  private handGeometry: THREE.BufferGeometry | null = null
  private lineGeometry: THREE.BufferGeometry | null = null
  private handMaterial: THREE.MeshBasicMaterial | null = null
  private lineMaterial: THREE.LineBasicMaterial | null = null

  // Current landmarks
  private landmarks: HandLandmarkData[] = []
  private fillMode: 'skeleton' | 'hull' | 'bbox' = 'hull'
  private lineWidth: number = 0.02

  constructor(params: Partial<HandsTraceParams> = {}) {
    const p = { ...DEFAULT_HANDS_TRACE_PARAMS, ...params }
    super('HandsTraceEffect', fragmentShader, p)

    this.fillMode = p.fillMode
    this.lineWidth = p.lineWidth

    // Add hand-specific uniforms
    this.uniforms.set('handMaskTexture', new THREE.Uniform(null))
    this.uniforms.set('hasHandData', new THREE.Uniform(false))
    this.uniforms.set('feather', new THREE.Uniform(p.feather))
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    // Create hand mask render target
    this.handMaskTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Setup scene for hand mask rendering
    this.handScene = new THREE.Scene()
    this.handScene.background = new THREE.Color(0x000000)
    this.handCamera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1)

    // Create geometry for filled shapes
    this.handGeometry = new THREE.BufferGeometry()
    this.handMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    })
    this.handMesh = new THREE.Mesh(this.handGeometry, this.handMaterial)
    this.handScene.add(this.handMesh)

    // Create geometry for line rendering (skeleton mode)
    this.lineGeometry = new THREE.BufferGeometry()
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 1, // Note: linewidth > 1 doesn't work on most platforms
    })
    this.handLines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial)
    this.handScene.add(this.handLines)
  }

  /**
   * Set hand landmarks from MediaPipe detection.
   * Call this each frame with updated landmark data.
   */
  setHandLandmarks(hands: HandLandmarkData[]) {
    this.landmarks = hands
    this.uniforms.get('hasHandData')!.value = hands.length > 0
  }

  /**
   * Render hand mask geometry to texture.
   * Call this before the main render pass.
   */
  renderHandMask(renderer: THREE.WebGLRenderer) {
    if (!this.handMaskTarget || !this.handScene || !this.handCamera) {
      return
    }

    // Clear scene
    renderer.setRenderTarget(this.handMaskTarget)
    renderer.setClearColor(0x000000)
    renderer.clear()

    if (this.landmarks.length === 0) {
      renderer.setRenderTarget(null)
      return
    }

    // Render each hand
    for (const hand of this.landmarks) {
      this.updateGeometryForHand(hand)
      renderer.render(this.handScene, this.handCamera)
    }

    renderer.setRenderTarget(null)
  }

  private updateGeometryForHand(hand: HandLandmarkData) {
    if (!this.handGeometry || !this.lineGeometry || !this.handMesh || !this.handLines) return

    const points = hand.points
    if (points.length < 21) return

    if (this.fillMode === 'skeleton') {
      // Hide mesh, show lines
      this.handMesh.visible = false
      this.handLines.visible = true

      // Create line segments for hand connections
      const vertices: number[] = []
      for (const [start, end] of HAND_CONNECTIONS) {
        vertices.push(
          points[start].x, 1 - points[start].y, 0,
          points[end].x, 1 - points[end].y, 0
        )
      }

      this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))

      // Also render circles at each joint using the mesh (approximate with small quads)
      const jointVertices: number[] = []
      const jointIndices: number[] = []
      let vertexOffset = 0

      for (let i = 0; i < points.length; i++) {
        const p = points[i]
        const r = this.lineWidth * 0.5

        // Create small quad for each joint
        jointVertices.push(
          p.x - r, 1 - p.y - r, 0,
          p.x + r, 1 - p.y - r, 0,
          p.x + r, 1 - p.y + r, 0,
          p.x - r, 1 - p.y + r, 0
        )
        jointIndices.push(
          vertexOffset, vertexOffset + 1, vertexOffset + 2,
          vertexOffset, vertexOffset + 2, vertexOffset + 3
        )
        vertexOffset += 4
      }

      this.handGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(jointVertices), 3))
      this.handGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(jointIndices), 1))
      this.handMesh.visible = true

    } else if (this.fillMode === 'bbox') {
      // Hide lines, show mesh with bounding box
      this.handLines.visible = false
      this.handMesh.visible = true

      const xs = points.map(p => p.x)
      const ys = points.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      const vertices = new Float32Array([
        minX, 1 - minY, 0,
        maxX, 1 - minY, 0,
        maxX, 1 - maxY, 0,
        minX, 1 - maxY, 0,
      ])
      const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

      this.handGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      this.handGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

    } else {
      // Hull mode - convex hull of all points
      this.handLines.visible = false
      this.handMesh.visible = true

      // Simple fan triangulation from center
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

      this.handGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      this.handGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    }

    this.handGeometry.computeBoundingSphere()
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    super.update(renderer, inputBuffer, deltaTime)

    // Render hand mask geometry
    this.renderHandMask(renderer)

    // Set texture for shader
    this.uniforms.get('handMaskTexture')!.value = this.handMaskTarget?.texture
  }

  setSize(width: number, height: number) {
    super.setSize(width, height)
    this.handMaskTarget?.setSize(width, height)
  }

  updateParams(params: Partial<HandsTraceParams>) {
    super.updateParams(params)
    if (params.feather !== undefined) {
      this.uniforms.get('feather')!.value = params.feather
    }
    if (params.fillMode !== undefined) {
      this.fillMode = params.fillMode
    }
    if (params.lineWidth !== undefined) {
      this.lineWidth = params.lineWidth
    }
  }

  dispose() {
    super.dispose()
    this.handMaskTarget?.dispose()
    this.handGeometry?.dispose()
    this.lineGeometry?.dispose()
    this.handMaterial?.dispose()
    this.lineMaterial?.dispose()
  }
}
