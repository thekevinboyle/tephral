/**
 * slitEffect.ts
 * Slit-scan / time-slice accumulation effect
 * Creates temporal trails by capturing and scrolling single lines from the source
 */

export interface SlitParams {
  slitPosition: number // 0-1 position of capture line
  direction: 'horizontal' | 'vertical'
  speed: number // 1-10 scroll rate
  blend: number // 0-1 fade trails
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

const SHIFT_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_history;
  uniform sampler2D u_source;
  uniform float u_slitPosition;
  uniform float u_speed;
  uniform float u_blend;
  uniform vec2 u_resolution;
  uniform int u_direction; // 0 = horizontal, 1 = vertical
  varying vec2 v_texCoord;

  void main() {
    vec2 uv = v_texCoord;
    vec2 pixelSize = 1.0 / u_resolution;

    if (u_direction == 0) {
      // Horizontal: scroll left/right, capture vertical line
      float shiftAmount = u_speed * pixelSize.x;
      vec2 shiftedUV = vec2(uv.x - shiftAmount, uv.y);

      // Check if we're at the capture edge
      if (uv.x > 1.0 - shiftAmount * 2.0) {
        // Sample from source at slit position
        vec4 sourceColor = texture2D(u_source, vec2(u_slitPosition, uv.y));
        gl_FragColor = sourceColor;
      } else if (shiftedUV.x >= 0.0) {
        // Sample from shifted history with blend
        vec4 historyColor = texture2D(u_history, shiftedUV);
        gl_FragColor = historyColor * u_blend;
      } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    } else {
      // Vertical: scroll up/down, capture horizontal line
      float shiftAmount = u_speed * pixelSize.y;
      vec2 shiftedUV = vec2(uv.x, uv.y - shiftAmount);

      // Check if we're at the capture edge
      if (uv.y > 1.0 - shiftAmount * 2.0) {
        // Sample from source at slit position
        vec4 sourceColor = texture2D(u_source, vec2(uv.x, u_slitPosition));
        gl_FragColor = sourceColor;
      } else if (shiftedUV.y >= 0.0) {
        // Sample from shifted history with blend
        vec4 historyColor = texture2D(u_history, shiftedUV);
        gl_FragColor = historyColor * u_blend;
      } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    }
  }
`

const DISPLAY_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`

export class SlitEffect {
  private gl: WebGLRenderingContext | null = null
  private shiftProgram: WebGLProgram | null = null
  private displayProgram: WebGLProgram | null = null
  private historyTextures: WebGLTexture[] = []
  private framebuffers: WebGLFramebuffer[] = []
  private sourceTexture: WebGLTexture | null = null
  private vertexBuffer: WebGLBuffer | null = null
  private texCoordBuffer: WebGLBuffer | null = null
  private currentBuffer: number = 0
  private canvas: HTMLCanvasElement | null = null
  private width: number = 0
  private height: number = 0
  private initialized: boolean = false

  init(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.canvas = canvas
    this.width = width
    this.height = height
    canvas.width = width
    canvas.height = height

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })

    if (!gl) {
      console.warn('WebGL not available for SlitEffect')
      return
    }

    this.gl = gl

    // Create shaders and programs
    const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const shiftFragShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      SHIFT_FRAGMENT_SHADER
    )
    const displayFragShader = this.compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      DISPLAY_FRAGMENT_SHADER
    )

    if (!vertexShader || !shiftFragShader || !displayFragShader) {
      console.error('Failed to compile shaders for SlitEffect')
      return
    }

    this.shiftProgram = this.createProgram(gl, vertexShader, shiftFragShader)
    this.displayProgram = this.createProgram(gl, vertexShader, displayFragShader)

    if (!this.shiftProgram || !this.displayProgram) {
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

    // Create ping-pong textures and framebuffers for history
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
        gl.UNSIGNED_BYTE,
        null
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      this.historyTextures.push(texture!)

      const fb = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      )
      this.framebuffers.push(fb!)
    }

    // Create source texture
    this.sourceTexture = gl.createTexture()

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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

  render(sourceCanvas: HTMLCanvasElement, params: SlitParams): void {
    const gl = this.gl
    const canvas = this.canvas

    if (!gl || !canvas || !this.initialized) {
      this.renderFallback(sourceCanvas, params)
      return
    }

    // Resize if needed
    if (
      sourceCanvas.width !== this.width ||
      sourceCanvas.height !== this.height
    ) {
      this.resizeBuffers(sourceCanvas.width, sourceCanvas.height)
    }

    // Upload source texture
    gl.activeTexture(gl.TEXTURE1)
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

    // Render shift pass to the other framebuffer
    const readBuffer = this.currentBuffer
    const writeBuffer = 1 - this.currentBuffer

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[writeBuffer])
    gl.viewport(0, 0, this.width, this.height)

    gl.useProgram(this.shiftProgram)

    // Bind history texture to unit 0
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.historyTextures[readBuffer])

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(this.shiftProgram!, 'u_history'), 0)
    gl.uniform1i(gl.getUniformLocation(this.shiftProgram!, 'u_source'), 1)
    gl.uniform1f(
      gl.getUniformLocation(this.shiftProgram!, 'u_slitPosition'),
      params.slitPosition
    )
    gl.uniform1f(
      gl.getUniformLocation(this.shiftProgram!, 'u_speed'),
      params.speed
    )
    gl.uniform1f(
      gl.getUniformLocation(this.shiftProgram!, 'u_blend'),
      0.95 + params.blend * 0.05
    )
    gl.uniform2f(
      gl.getUniformLocation(this.shiftProgram!, 'u_resolution'),
      this.width,
      this.height
    )
    gl.uniform1i(
      gl.getUniformLocation(this.shiftProgram!, 'u_direction'),
      params.direction === 'horizontal' ? 0 : 1
    )

    // Draw quad
    this.drawQuad(gl, this.shiftProgram!)

    // Swap buffers
    this.currentBuffer = writeBuffer

    // Render to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)

    gl.useProgram(this.displayProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.historyTextures[writeBuffer])
    gl.uniform1i(gl.getUniformLocation(this.displayProgram!, 'u_texture'), 0)

    this.drawQuad(gl, this.displayProgram!)
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

    // Resize history textures
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.historyTextures[i])
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      )
    }
  }

  private renderFallback(
    sourceCanvas: HTMLCanvasElement,
    params: SlitParams
  ): void {
    if (!this.canvas) return

    const width = sourceCanvas.width
    const height = sourceCanvas.height

    // If we have a GL context (but init failed), use it to draw source directly
    if (this.gl) {
      const gl = this.gl
      this.canvas.width = width
      this.canvas.height = height
      gl.viewport(0, 0, width, height)

      // Upload source texture
      if (!this.sourceTexture) {
        this.sourceTexture = gl.createTexture()
      }
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

      // Just clear and draw nothing - shows the effect isn't working
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return
    }

    // No GL context - can safely use 2D
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    this.canvas.width = width
    this.canvas.height = height

    // Just copy the source - full effect requires WebGL
    ctx.drawImage(sourceCanvas, 0, 0)

    // Draw slit line indicator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2

    if (params.direction === 'horizontal') {
      const x = params.slitPosition * width
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    } else {
      const y = params.slitPosition * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  dispose(): void {
    const gl = this.gl
    if (!gl) return

    if (this.shiftProgram) {
      gl.deleteProgram(this.shiftProgram)
      this.shiftProgram = null
    }
    if (this.displayProgram) {
      gl.deleteProgram(this.displayProgram)
      this.displayProgram = null
    }
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer)
      this.vertexBuffer = null
    }
    if (this.texCoordBuffer) {
      gl.deleteBuffer(this.texCoordBuffer)
      this.texCoordBuffer = null
    }
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture)
      this.sourceTexture = null
    }

    for (const texture of this.historyTextures) {
      gl.deleteTexture(texture)
    }
    this.historyTextures = []

    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb)
    }
    this.framebuffers = []

    this.gl = null
    this.canvas = null
    this.initialized = false
  }
}
