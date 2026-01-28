/**
 * cloudEffect.ts
 * 3D point cloud with depth displacement from brightness
 * Inspired by Ryoji Ikeda's data-driven visual style
 */

export interface CloudParams {
  density: number // 1000-50000 particles
  depthScale: number // 0-100 Z displacement from brightness
  perspective: number // 0.5-2.0 camera perspective
  rotate: boolean // auto-rotate animation
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  uniform sampler2D u_texture;
  uniform float u_depthScale;
  uniform float u_perspective;
  uniform float u_rotation;
  uniform vec2 u_resolution;

  varying float v_brightness;

  void main() {
    // Sample brightness from texture
    vec4 texColor = texture2D(u_texture, a_position);
    float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    v_brightness = brightness;

    // Convert to centered coordinates (-1 to 1)
    vec2 pos = a_position * 2.0 - 1.0;

    // Z displacement based on brightness
    float z = brightness * u_depthScale * 0.01;

    // Apply Y-axis rotation if enabled
    float cosR = cos(u_rotation);
    float sinR = sin(u_rotation);
    float x = pos.x * cosR - z * sinR;
    float newZ = pos.x * sinR + z * cosR;

    // Perspective projection
    float perspectiveFactor = u_perspective / (u_perspective + newZ * 0.5);
    vec2 projectedPos = vec2(x, pos.y) * perspectiveFactor;

    // Point size based on depth (closer = larger)
    gl_PointSize = max(1.0, 4.0 * perspectiveFactor);

    gl_Position = vec4(projectedPos, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;
  varying float v_brightness;

  void main() {
    // Circular point shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // White points with brightness-based alpha
    float alpha = v_brightness * (1.0 - dist * 2.0);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`

export class CloudEffect {
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private positionBuffer: WebGLBuffer | null = null
  private particles: Float32Array | null = null
  private texture: WebGLTexture | null = null
  private canvas: HTMLCanvasElement | null = null
  private lastDensity: number = 0

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    })

    if (!gl) {
      console.warn('WebGL not available for CloudEffect')
      return
    }

    this.gl = gl

    // Create shaders
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      FRAGMENT_SHADER
    )

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders for CloudEffect')
      return
    }

    // Create program
    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program))
      return
    }

    this.program = program

    // Create position buffer
    this.positionBuffer = gl.createBuffer()

    // Create texture
    this.texture = gl.createTexture()

    // Enable blending
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
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

  private generateParticles(density: number): void {
    // Generate random positions for particles
    this.particles = new Float32Array(density * 2)
    for (let i = 0; i < density * 2; i += 2) {
      this.particles[i] = Math.random() // x: 0-1
      this.particles[i + 1] = Math.random() // y: 0-1
    }
    this.lastDensity = density
  }

  render(
    sourceCanvas: HTMLCanvasElement,
    params: CloudParams,
    time: number
  ): void {
    const gl = this.gl
    const program = this.program
    const canvas = this.canvas

    if (!gl || !program || !canvas) {
      // Fallback to Canvas 2D
      this.renderFallback(sourceCanvas, params, time)
      return
    }

    // Regenerate particles if density changed
    if (params.density !== this.lastDensity) {
      this.generateParticles(params.density)
    }

    if (!this.particles) {
      this.generateParticles(params.density)
    }

    // Resize canvas if needed
    if (
      canvas.width !== sourceCanvas.width ||
      canvas.height !== sourceCanvas.height
    ) {
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    // Clear
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    // Upload source texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
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

    // Set uniforms
    const textureLocation = gl.getUniformLocation(program, 'u_texture')
    const depthScaleLocation = gl.getUniformLocation(program, 'u_depthScale')
    const perspectiveLocation = gl.getUniformLocation(program, 'u_perspective')
    const rotationLocation = gl.getUniformLocation(program, 'u_rotation')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

    gl.uniform1i(textureLocation, 0)
    gl.uniform1f(depthScaleLocation, params.depthScale)
    gl.uniform1f(perspectiveLocation, params.perspective)
    gl.uniform1f(rotationLocation, params.rotate ? time * 0.2 : 0)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height)

    // Upload particle positions
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.particles!, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    // Draw points
    gl.drawArrays(gl.POINTS, 0, params.density)
  }

  private renderFallback(
    sourceCanvas: HTMLCanvasElement,
    params: CloudParams,
    _time: number
  ): void {
    // Simple Canvas 2D fallback
    const ctx = this.canvas?.getContext('2d')
    if (!ctx || !this.canvas) return

    const width = sourceCanvas.width
    const height = sourceCanvas.height
    this.canvas.width = width
    this.canvas.height = height

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)

    // Get source pixels
    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) return

    const imageData = sourceCtx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    // Draw random particles
    ctx.fillStyle = 'white'
    const sampleCount = Math.min(params.density, 5000)

    for (let i = 0; i < sampleCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4
      const brightness =
        (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255

      ctx.globalAlpha = brightness
      ctx.beginPath()
      ctx.arc(x, y, 1 + brightness * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }

  dispose(): void {
    const gl = this.gl
    if (!gl) return

    if (this.program) {
      gl.deleteProgram(this.program)
      this.program = null
    }
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer)
      this.positionBuffer = null
    }
    if (this.texture) {
      gl.deleteTexture(this.texture)
      this.texture = null
    }

    this.particles = null
    this.gl = null
    this.canvas = null
  }
}
