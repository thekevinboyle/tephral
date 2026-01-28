/**
 * voronoiEffect.ts
 * Voronoi cell decomposition mosaic effect
 * Uses jump flooding algorithm for GPU-accelerated voronoi computation
 */

export interface VoronoiParams {
  cellCount: number // 16-256 number of cells
  seedMode: 'random' | 'brightness' | 'edges'
  showEdges: boolean
  fillMode: 'average' | 'centroid' | 'original'
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

// Jump Flooding Algorithm initialization - encode seed positions
const JFA_INIT_FRAGMENT = `
  precision highp float;
  uniform sampler2D u_seeds;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec4 seedData = texture2D(u_seeds, v_texCoord);
    if (seedData.a > 0.5) {
      // This pixel is a seed - encode its position
      gl_FragColor = vec4(v_texCoord.x, v_texCoord.y, seedData.z, 1.0);
    } else {
      // Not a seed - mark as unassigned (large distance)
      gl_FragColor = vec4(-1.0, -1.0, 0.0, 0.0);
    }
  }
`

// Jump Flooding step
const JFA_STEP_FRAGMENT = `
  precision highp float;
  uniform sampler2D u_input;
  uniform vec2 u_resolution;
  uniform float u_stepSize;
  varying vec2 v_texCoord;

  void main() {
    vec2 pixelSize = 1.0 / u_resolution;
    vec4 bestSeed = texture2D(u_input, v_texCoord);
    float bestDist = 9999.0;

    if (bestSeed.w > 0.5) {
      vec2 diff = bestSeed.xy - v_texCoord;
      bestDist = dot(diff, diff);
    }

    // Check 8 neighbors at current step size
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) continue;

        vec2 neighborUV = v_texCoord + vec2(float(dx), float(dy)) * u_stepSize * pixelSize;
        if (neighborUV.x < 0.0 || neighborUV.x > 1.0 || neighborUV.y < 0.0 || neighborUV.y > 1.0) continue;

        vec4 neighborSeed = texture2D(u_input, neighborUV);
        if (neighborSeed.w < 0.5) continue;

        vec2 diff = neighborSeed.xy - v_texCoord;
        float dist = dot(diff, diff);

        if (dist < bestDist) {
          bestDist = dist;
          bestSeed = neighborSeed;
        }
      }
    }

    gl_FragColor = bestSeed;
  }
`

// Final render - color cells based on fill mode
const RENDER_FRAGMENT = `
  precision highp float;
  uniform sampler2D u_voronoi;
  uniform sampler2D u_source;
  uniform sampler2D u_cellColors;
  uniform vec2 u_resolution;
  uniform int u_fillMode; // 0=average, 1=centroid, 2=original
  uniform int u_showEdges;
  varying vec2 v_texCoord;

  void main() {
    vec4 voronoiData = texture2D(u_voronoi, v_texCoord);
    vec2 seedPos = voronoiData.xy;
    float cellId = voronoiData.z;

    vec4 color;

    if (u_fillMode == 0) {
      // Average color - stored in cellColors texture
      color = texture2D(u_cellColors, vec2(cellId, 0.5));
    } else if (u_fillMode == 1) {
      // Centroid color - sample source at seed position
      color = texture2D(u_source, seedPos);
    } else {
      // Original - pass through source
      color = texture2D(u_source, v_texCoord);
    }

    // Edge detection
    if (u_showEdges == 1) {
      vec2 pixelSize = 1.0 / u_resolution;
      float edgeThreshold = 0.001;

      // Check neighbors for different cell ID
      vec4 neighbor1 = texture2D(u_voronoi, v_texCoord + vec2(pixelSize.x, 0.0));
      vec4 neighbor2 = texture2D(u_voronoi, v_texCoord + vec2(0.0, pixelSize.y));
      vec4 neighbor3 = texture2D(u_voronoi, v_texCoord + vec2(-pixelSize.x, 0.0));
      vec4 neighbor4 = texture2D(u_voronoi, v_texCoord + vec2(0.0, -pixelSize.y));

      bool isEdge =
        abs(neighbor1.z - cellId) > edgeThreshold ||
        abs(neighbor2.z - cellId) > edgeThreshold ||
        abs(neighbor3.z - cellId) > edgeThreshold ||
        abs(neighbor4.z - cellId) > edgeThreshold;

      if (isEdge) {
        color = vec4(1.0, 1.0, 1.0, 1.0);
      }
    }

    gl_FragColor = color;
  }
`

export class VoronoiEffect {
  private gl: WebGLRenderingContext | null = null
  private initProgram: WebGLProgram | null = null
  private stepProgram: WebGLProgram | null = null
  private renderProgram: WebGLProgram | null = null
  private seedTexture: WebGLTexture | null = null
  private sourceTexture: WebGLTexture | null = null
  private cellColorTexture: WebGLTexture | null = null
  private jfaTextures: WebGLTexture[] = []
  private jfaFramebuffers: WebGLFramebuffer[] = []
  private vertexBuffer: WebGLBuffer | null = null
  private texCoordBuffer: WebGLBuffer | null = null
  private seeds: Float32Array | null = null
  private canvas: HTMLCanvasElement | null = null
  private width: number = 0
  private height: number = 0
  private initialized: boolean = false
  private lastCellCount: number = 0
  private cellColors: Float32Array | null = null

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    })

    if (!gl) {
      console.warn('WebGL not available for VoronoiEffect')
      return
    }

    // Check for required extension
    const floatTextureExt = gl.getExtension('OES_texture_float')
    if (!floatTextureExt) {
      console.warn('OES_texture_float not available, using fallback')
      return
    }

    this.gl = gl

    // Compile shaders
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const initFragShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      JFA_INIT_FRAGMENT
    )
    const stepFragShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      JFA_STEP_FRAGMENT
    )
    const renderFragShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      RENDER_FRAGMENT
    )

    if (
      !vertexShader ||
      !initFragShader ||
      !stepFragShader ||
      !renderFragShader
    ) {
      console.error('Failed to compile shaders for VoronoiEffect')
      return
    }

    this.initProgram = this.createProgram(gl, vertexShader, initFragShader)
    this.stepProgram = this.createProgram(gl, vertexShader, stepFragShader)
    this.renderProgram = this.createProgram(gl, vertexShader, renderFragShader)

    if (!this.initProgram || !this.stepProgram || !this.renderProgram) {
      return
    }

    // Create geometry buffers
    this.vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    this.texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    // Create textures
    this.seedTexture = gl.createTexture()
    this.sourceTexture = gl.createTexture()
    this.cellColorTexture = gl.createTexture()

    this.initialized = true
  }

  private compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  private createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null {
    const program = gl.createProgram()
    if (!program) return null

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program))
      return null
    }

    return program
  }

  updateSeeds(sourceCanvas: HTMLCanvasElement, params: VoronoiParams): void {
    const gl = this.gl
    if (!gl) return

    const width = sourceCanvas.width
    const height = sourceCanvas.height
    const cellCount = params.cellCount

    // Generate seed positions based on mode
    this.seeds = new Float32Array(cellCount * 4) // x, y, id, active

    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) return

    const imageData = sourceCtx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    switch (params.seedMode) {
      case 'random':
        for (let i = 0; i < cellCount; i++) {
          this.seeds[i * 4] = Math.random()
          this.seeds[i * 4 + 1] = Math.random()
          this.seeds[i * 4 + 2] = i / cellCount
          this.seeds[i * 4 + 3] = 1
        }
        break

      case 'brightness':
        // Weighted random based on brightness
        const brightnessMap: Array<{ x: number; y: number; brightness: number }> = []
        let totalBrightness = 0

        // Sample every 4th pixel for performance
        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            const idx = (y * width + x) * 4
            const brightness =
              pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114
            brightnessMap.push({ x: x / width, y: y / height, brightness })
            totalBrightness += brightness
          }
        }

        // Weighted random selection
        for (let i = 0; i < cellCount; i++) {
          let r = Math.random() * totalBrightness
          let selected = brightnessMap[0]

          for (const point of brightnessMap) {
            r -= point.brightness
            if (r <= 0) {
              selected = point
              break
            }
          }

          this.seeds[i * 4] = selected.x + (Math.random() - 0.5) * 0.02
          this.seeds[i * 4 + 1] = selected.y + (Math.random() - 0.5) * 0.02
          this.seeds[i * 4 + 2] = i / cellCount
          this.seeds[i * 4 + 3] = 1
        }
        break

      case 'edges':
        // Simple edge detection using sobel-like approach
        const edges: Array<{ x: number; y: number; strength: number }> = []
        let totalStrength = 0

        for (let y = 1; y < height - 1; y += 2) {
          for (let x = 1; x < width - 1; x += 2) {
            const idx = (y * width + x) * 4
            const idxL = (y * width + x - 1) * 4
            const idxR = (y * width + x + 1) * 4
            const idxT = ((y - 1) * width + x) * 4
            const idxB = ((y + 1) * width + x) * 4

            const gx =
              Math.abs(pixels[idxR] - pixels[idxL]) +
              Math.abs(pixels[idxR + 1] - pixels[idxL + 1]) +
              Math.abs(pixels[idxR + 2] - pixels[idxL + 2])

            const gy =
              Math.abs(pixels[idxB] - pixels[idxT]) +
              Math.abs(pixels[idxB + 1] - pixels[idxT + 1]) +
              Math.abs(pixels[idxB + 2] - pixels[idxT + 2])

            const strength = Math.sqrt(gx * gx + gy * gy) + 1
            edges.push({ x: x / width, y: y / height, strength })
            totalStrength += strength
          }
        }

        // Weighted random selection favoring edges
        for (let i = 0; i < cellCount; i++) {
          let r = Math.random() * totalStrength
          let selected = edges[0]

          for (const point of edges) {
            r -= point.strength
            if (r <= 0) {
              selected = point
              break
            }
          }

          this.seeds[i * 4] = selected.x
          this.seeds[i * 4 + 1] = selected.y
          this.seeds[i * 4 + 2] = i / cellCount
          this.seeds[i * 4 + 3] = 1
        }
        break
    }

    this.lastCellCount = cellCount

    // Compute average colors for each cell (simplified - use seed point color)
    this.cellColors = new Float32Array(256 * 4)
    for (let i = 0; i < cellCount; i++) {
      const sx = Math.floor(this.seeds[i * 4] * width)
      const sy = Math.floor(this.seeds[i * 4 + 1] * height)
      const idx = (sy * width + sx) * 4

      this.cellColors[i * 4] = pixels[idx] / 255
      this.cellColors[i * 4 + 1] = pixels[idx + 1] / 255
      this.cellColors[i * 4 + 2] = pixels[idx + 2] / 255
      this.cellColors[i * 4 + 3] = 1
    }
  }

  render(sourceCanvas: HTMLCanvasElement, params: VoronoiParams): void {
    const gl = this.gl
    const canvas = this.canvas

    if (!gl || !canvas || !this.initialized) {
      this.renderFallback(sourceCanvas, params)
      return
    }

    const width = sourceCanvas.width
    const height = sourceCanvas.height

    // Resize if needed
    if (width !== this.width || height !== this.height) {
      this.resizeBuffers(width, height)
    }

    // Update seeds if cell count changed
    if (params.cellCount !== this.lastCellCount) {
      this.updateSeeds(sourceCanvas, params)
    }

    if (!this.seeds) {
      this.updateSeeds(sourceCanvas, params)
    }

    // Upload source texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sourceCanvas
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Create seed texture (sparse texture with seed points)
    const seedTextureData = new Float32Array(width * height * 4)
    for (let i = 0; i < params.cellCount; i++) {
      const sx = Math.floor(this.seeds![i * 4] * width)
      const sy = Math.floor(this.seeds![i * 4 + 1] * height)
      const idx = (sy * width + sx) * 4
      seedTextureData[idx] = this.seeds![i * 4]
      seedTextureData[idx + 1] = this.seeds![i * 4 + 1]
      seedTextureData[idx + 2] = this.seeds![i * 4 + 2]
      seedTextureData[idx + 3] = 1
    }

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.seedTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.FLOAT,
      seedTextureData
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // JFA Init pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.jfaFramebuffers[0])
    gl.viewport(0, 0, width, height)
    gl.useProgram(this.initProgram)

    gl.uniform1i(gl.getUniformLocation(this.initProgram!, 'u_seeds'), 1)
    gl.uniform2f(
      gl.getUniformLocation(this.initProgram!, 'u_resolution'),
      width,
      height
    )

    this.drawQuad(gl, this.initProgram!)

    // JFA steps
    const maxDim = Math.max(width, height)
    let stepSize = Math.pow(2, Math.ceil(Math.log2(maxDim)) - 1)
    let readBuffer = 0

    while (stepSize >= 1) {
      const writeBuffer = 1 - readBuffer

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.jfaFramebuffers[writeBuffer])
      gl.useProgram(this.stepProgram)

      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, this.jfaTextures[readBuffer])

      gl.uniform1i(gl.getUniformLocation(this.stepProgram!, 'u_input'), 2)
      gl.uniform2f(
        gl.getUniformLocation(this.stepProgram!, 'u_resolution'),
        width,
        height
      )
      gl.uniform1f(
        gl.getUniformLocation(this.stepProgram!, 'u_stepSize'),
        stepSize
      )

      this.drawQuad(gl, this.stepProgram!)

      readBuffer = writeBuffer
      stepSize = Math.floor(stepSize / 2)
    }

    // Upload cell colors texture
    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, this.cellColorTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      256,
      1,
      0,
      gl.RGBA,
      gl.FLOAT,
      this.cellColors
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Final render pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.renderProgram)

    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.jfaTextures[readBuffer])

    gl.uniform1i(gl.getUniformLocation(this.renderProgram!, 'u_voronoi'), 2)
    gl.uniform1i(gl.getUniformLocation(this.renderProgram!, 'u_source'), 0)
    gl.uniform1i(gl.getUniformLocation(this.renderProgram!, 'u_cellColors'), 3)
    gl.uniform2f(
      gl.getUniformLocation(this.renderProgram!, 'u_resolution'),
      width,
      height
    )
    gl.uniform1i(
      gl.getUniformLocation(this.renderProgram!, 'u_fillMode'),
      params.fillMode === 'average' ? 0 : params.fillMode === 'centroid' ? 1 : 2
    )
    gl.uniform1i(
      gl.getUniformLocation(this.renderProgram!, 'u_showEdges'),
      params.showEdges ? 1 : 0
    )

    this.drawQuad(gl, this.renderProgram!)
  }

  private drawQuad(gl: WebGLRenderingContext, program: WebGLProgram): void {
    const posLoc = gl.getAttribLocation(program, 'a_position')
    const texLoc = gl.getAttribLocation(program, 'a_texCoord')

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.enableVertexAttribArray(texLoc)
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private resizeBuffers(width: number, height: number): void {
    const gl = this.gl
    if (!gl) return

    this.width = width
    this.height = height

    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }

    // Clean up old JFA resources
    for (const tex of this.jfaTextures) {
      gl.deleteTexture(tex)
    }
    for (const fb of this.jfaFramebuffers) {
      gl.deleteFramebuffer(fb)
    }
    this.jfaTextures = []
    this.jfaFramebuffers = []

    // Create JFA ping-pong textures
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.FLOAT,
        null
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      this.jfaTextures.push(texture!)

      const fb = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      )
      this.jfaFramebuffers.push(fb!)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private renderFallback(
    sourceCanvas: HTMLCanvasElement,
    params: VoronoiParams
  ): void {
    // Canvas 2D fallback using simple nearest-seed approach
    const ctx = this.canvas?.getContext('2d')
    if (!ctx || !this.canvas) return

    const width = sourceCanvas.width
    const height = sourceCanvas.height
    this.canvas.width = width
    this.canvas.height = height

    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) return

    // Generate seeds if needed
    if (!this.seeds || params.cellCount !== this.lastCellCount) {
      this.seeds = new Float32Array(params.cellCount * 4)
      for (let i = 0; i < params.cellCount; i++) {
        this.seeds[i * 4] = Math.random()
        this.seeds[i * 4 + 1] = Math.random()
        this.seeds[i * 4 + 2] = i / params.cellCount
        this.seeds[i * 4 + 3] = 1
      }
      this.lastCellCount = params.cellCount
    }

    // Get source image data
    const imageData = sourceCtx.getImageData(0, 0, width, height)
    const pixels = imageData.data
    const destData = ctx.createImageData(width, height)
    const destPixels = destData.data

    // For each pixel, find nearest seed
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = x / width
        const py = y / height

        let minDist = Infinity
        let nearestSeed = 0

        for (let i = 0; i < params.cellCount; i++) {
          const sx = this.seeds[i * 4]
          const sy = this.seeds[i * 4 + 1]
          const dx = px - sx
          const dy = py - sy
          const dist = dx * dx + dy * dy

          if (dist < minDist) {
            minDist = dist
            nearestSeed = i
          }
        }

        const idx = (y * width + x) * 4

        if (params.fillMode === 'original') {
          destPixels[idx] = pixels[idx]
          destPixels[idx + 1] = pixels[idx + 1]
          destPixels[idx + 2] = pixels[idx + 2]
          destPixels[idx + 3] = 255
        } else {
          // Use seed point color
          const sx = Math.floor(this.seeds[nearestSeed * 4] * width)
          const sy = Math.floor(this.seeds[nearestSeed * 4 + 1] * height)
          const seedIdx = (sy * width + sx) * 4

          destPixels[idx] = pixels[seedIdx]
          destPixels[idx + 1] = pixels[seedIdx + 1]
          destPixels[idx + 2] = pixels[seedIdx + 2]
          destPixels[idx + 3] = 255
        }
      }
    }

    ctx.putImageData(destData, 0, 0)

    // Draw edges if enabled
    if (params.showEdges) {
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1

      // Draw seed points
      for (let i = 0; i < params.cellCount; i++) {
        const sx = this.seeds[i * 4] * width
        const sy = this.seeds[i * 4 + 1] * height
        ctx.beginPath()
        ctx.arc(sx, sy, 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  dispose(): void {
    const gl = this.gl
    if (!gl) return

    if (this.initProgram) {
      gl.deleteProgram(this.initProgram)
      this.initProgram = null
    }
    if (this.stepProgram) {
      gl.deleteProgram(this.stepProgram)
      this.stepProgram = null
    }
    if (this.renderProgram) {
      gl.deleteProgram(this.renderProgram)
      this.renderProgram = null
    }
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer)
      this.vertexBuffer = null
    }
    if (this.texCoordBuffer) {
      gl.deleteBuffer(this.texCoordBuffer)
      this.texCoordBuffer = null
    }
    if (this.seedTexture) {
      gl.deleteTexture(this.seedTexture)
      this.seedTexture = null
    }
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture)
      this.sourceTexture = null
    }
    if (this.cellColorTexture) {
      gl.deleteTexture(this.cellColorTexture)
      this.cellColorTexture = null
    }

    for (const tex of this.jfaTextures) {
      gl.deleteTexture(tex)
    }
    this.jfaTextures = []

    for (const fb of this.jfaFramebuffers) {
      gl.deleteFramebuffer(fb)
    }
    this.jfaFramebuffers = []

    this.seeds = null
    this.cellColors = null
    this.gl = null
    this.canvas = null
    this.initialized = false
  }
}
