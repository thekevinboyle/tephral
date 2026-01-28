/**
 * TextureOverlay.tsx
 * Full-screen texture overlay with WebGL blend modes
 * Composites textures (grain, dust, paper, etc.) over video using GPU shaders
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTextureOverlayStore, type BlendMode } from '../../stores/textureOverlayStore'

// ============================================================================
// Texture Library
// ============================================================================

export const TEXTURE_LIBRARY = {
  grain_fine: { name: 'Fine Grain', category: 'film', file: 'grain_fine.png' },
  grain_heavy: { name: 'Heavy Grain', category: 'film', file: 'grain_heavy.png' },
  dust: { name: 'Dust', category: 'film', file: 'dust.png' },
  scratches: { name: 'Scratches', category: 'film', file: 'scratches.png' },
  vignette: { name: 'Vignette', category: 'analog', file: 'vignette.png' },
  vhs_noise: { name: 'VHS Noise', category: 'analog', file: 'vhs_noise.png' },
  paper: { name: 'Paper', category: 'artistic', file: 'paper.png' },
  canvas: { name: 'Canvas', category: 'artistic', file: 'canvas.png' },
  concrete: { name: 'Concrete', category: 'artistic', file: 'concrete.png' },
} as const

export type TextureId = keyof typeof TEXTURE_LIBRARY

// ============================================================================
// Props
// ============================================================================

interface TextureOverlayProps {
  width: number
  height: number
  glCanvas: HTMLCanvasElement | null
}

// ============================================================================
// Shaders
// ============================================================================

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_texture;
  uniform float u_opacity;
  uniform float u_scale;
  uniform float u_time;
  uniform float u_animationSpeed;
  uniform int u_blendMode;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  // Blend mode implementations
  vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
  }

  vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
  }

  vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(
      base.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
      base.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
      base.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
    );
  }

  vec3 blendSoftLight(vec3 base, vec3 blend) {
    return vec3(
      blend.r < 0.5
        ? base.r - (1.0 - 2.0 * blend.r) * base.r * (1.0 - base.r)
        : base.r + (2.0 * blend.r - 1.0) * (sqrt(base.r) - base.r),
      blend.g < 0.5
        ? base.g - (1.0 - 2.0 * blend.g) * base.g * (1.0 - base.g)
        : base.g + (2.0 * blend.g - 1.0) * (sqrt(base.g) - base.g),
      blend.b < 0.5
        ? base.b - (1.0 - 2.0 * blend.b) * base.b * (1.0 - base.b)
        : base.b + (2.0 * blend.b - 1.0) * (sqrt(base.b) - base.b)
    );
  }

  void main() {
    // Sample source (video) at original coordinates
    vec4 sourceColor = texture2D(u_source, v_texCoord);

    // Apply scale and procedural UV animation for texture
    vec2 textureUV = v_texCoord;

    // Scale from center
    textureUV = (textureUV - 0.5) / u_scale + 0.5;

    // Procedural UV animation - shift coordinates over time
    float animOffset = u_time * u_animationSpeed * 0.05;
    textureUV.x += animOffset;
    textureUV.y += animOffset * 0.7; // Slight diagonal movement

    // Wrap UV coordinates for seamless tiling
    textureUV = fract(textureUV);

    // Sample texture
    vec4 textureColor = texture2D(u_texture, textureUV);

    // Apply blend mode
    vec3 blendedColor;

    if (u_blendMode == 0) {
      // Multiply
      blendedColor = blendMultiply(sourceColor.rgb, textureColor.rgb);
    } else if (u_blendMode == 1) {
      // Screen
      blendedColor = blendScreen(sourceColor.rgb, textureColor.rgb);
    } else if (u_blendMode == 2) {
      // Overlay
      blendedColor = blendOverlay(sourceColor.rgb, textureColor.rgb);
    } else {
      // SoftLight (default)
      blendedColor = blendSoftLight(sourceColor.rgb, textureColor.rgb);
    }

    // Mix based on opacity
    vec3 finalColor = mix(sourceColor.rgb, blendedColor, u_opacity * textureColor.a);

    gl_FragColor = vec4(finalColor, sourceColor.a);
  }
`

// ============================================================================
// Blend Mode Helper
// ============================================================================

function getBlendModeIndex(mode: BlendMode): number {
  switch (mode) {
    case 'multiply': return 0
    case 'screen': return 1
    case 'overlay': return 2
    case 'softLight': return 3
    default: return 2 // Default to overlay
  }
}

// ============================================================================
// Component
// ============================================================================

export function TextureOverlay({ width, height, glCanvas }: TextureOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const sourceTextureRef = useRef<WebGLTexture | null>(null)
  const overlayTextureRef = useRef<WebGLTexture | null>(null)
  const vertexBufferRef = useRef<WebGLBuffer | null>(null)
  const texCoordBufferRef = useRef<WebGLBuffer | null>(null)
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)
  const loadedTextureIdRef = useRef<string | null>(null)
  const textureImageRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)

  // Store state refs for animation loop
  const storeRef = useRef(useTextureOverlayStore.getState())
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs
  const store = useTextureOverlayStore()
  storeRef.current = store
  glCanvasRef.current = glCanvas
  sizeRef.current = { width, height }

  // Compile shader helper
  const compileShader = useCallback((
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('TextureOverlay shader compile failed:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }, [])

  // Initialize WebGL
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return false

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    })

    if (!gl) {
      console.warn('WebGL not available for TextureOverlay')
      return false
    }

    glRef.current = gl

    // Compile shaders
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders for TextureOverlay')
      return false
    }

    // Create program
    const program = gl.createProgram()
    if (!program) return false

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('TextureOverlay program link failed:', gl.getProgramInfoLog(program))
      return false
    }

    programRef.current = program

    // Create vertex buffer (fullscreen quad)
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    )
    vertexBufferRef.current = vertexBuffer

    // Create texture coordinate buffer
    const texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0, 1,  // Flip Y for correct orientation
        1, 1,
        0, 0,
        1, 0,
      ]),
      gl.STATIC_DRAW
    )
    texCoordBufferRef.current = texCoordBuffer

    // Create textures
    sourceTextureRef.current = gl.createTexture()
    overlayTextureRef.current = gl.createTexture()

    // Enable blending
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    return true
  }, [compileShader])

  // Load texture from file
  const loadTexture = useCallback((textureId: string) => {
    const textureInfo = TEXTURE_LIBRARY[textureId as TextureId]
    if (!textureInfo) {
      console.warn(`Unknown texture ID: ${textureId}`)
      return
    }

    const filePath = `/textures/${textureInfo.file}`
    const isVideo = textureInfo.file.endsWith('.webm')

    if (isVideo) {
      const video = document.createElement('video')
      video.src = filePath
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'

      video.onloadeddata = () => {
        textureImageRef.current = video
        loadedTextureIdRef.current = textureId
        video.play().catch(() => {
          // Autoplay might be blocked, that's okay
        })
      }

      video.onerror = () => {
        console.warn(`Failed to load video texture: ${filePath}`)
      }

      video.load()
    } else {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = filePath

      img.onload = () => {
        textureImageRef.current = img
        loadedTextureIdRef.current = textureId
      }

      img.onerror = () => {
        console.warn(`Failed to load texture: ${filePath}`)
      }
    }
  }, [])

  // Render frame
  const renderFrame = useCallback((time: number) => {
    if (!isRunningRef.current) return

    const gl = glRef.current
    const program = programRef.current
    const canvas = canvasRef.current
    const source = glCanvasRef.current
    const currentStore = storeRef.current
    const { width: currentWidth, height: currentHeight } = sizeRef.current

    if (!gl || !program || !canvas || !source || !currentStore.enabled) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // Load texture if changed
    if (currentStore.textureId !== loadedTextureIdRef.current) {
      loadTexture(currentStore.textureId)
    }

    // Skip if texture not loaded yet
    if (!textureImageRef.current) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // Resize canvas if needed
    if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
      canvas.width = currentWidth
      canvas.height = currentHeight
      gl.viewport(0, 0, currentWidth, currentHeight)
    }

    // Clear
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)

    // Upload source texture (video frame)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sourceTextureRef.current)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Upload overlay texture
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, overlayTextureRef.current)

    const textureSource = textureImageRef.current
    if (textureSource instanceof HTMLVideoElement && textureSource.readyState >= 2) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureSource)
    } else if (textureSource instanceof HTMLImageElement) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureSource)
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(program, 'u_source'), 0)
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 1)
    gl.uniform1f(gl.getUniformLocation(program, 'u_opacity'), currentStore.opacity)
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), currentStore.scale)
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), currentStore.animated ? time * 0.001 : 0)
    gl.uniform1f(gl.getUniformLocation(program, 'u_animationSpeed'), currentStore.animationSpeed)
    gl.uniform1i(gl.getUniformLocation(program, 'u_blendMode'), getBlendModeIndex(currentStore.blendMode))
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), currentWidth, currentHeight)

    // Set up vertex attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord')

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferRef.current)
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBufferRef.current)
    gl.enableVertexAttribArray(texCoordLocation)
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)

    // Draw quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    frameIdRef.current = requestAnimationFrame(renderFrame)
  }, [loadTexture])

  // Initialize WebGL on mount
  useEffect(() => {
    initWebGL()
  }, [initWebGL])

  // Animation loop control
  useEffect(() => {
    if (!store.enabled) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true
    frameIdRef.current = requestAnimationFrame(renderFrame)

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [store.enabled, renderFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }

      const gl = glRef.current
      if (gl) {
        if (programRef.current) {
          gl.deleteProgram(programRef.current)
          programRef.current = null
        }
        if (vertexBufferRef.current) {
          gl.deleteBuffer(vertexBufferRef.current)
          vertexBufferRef.current = null
        }
        if (texCoordBufferRef.current) {
          gl.deleteBuffer(texCoordBufferRef.current)
          texCoordBufferRef.current = null
        }
        if (sourceTextureRef.current) {
          gl.deleteTexture(sourceTextureRef.current)
          sourceTextureRef.current = null
        }
        if (overlayTextureRef.current) {
          gl.deleteTexture(overlayTextureRef.current)
          overlayTextureRef.current = null
        }
      }

      // Cleanup video element if it exists
      if (textureImageRef.current instanceof HTMLVideoElement) {
        textureImageRef.current.pause()
        textureImageRef.current.src = ''
      }
      textureImageRef.current = null

      glRef.current = null
    }
  }, [])

  // Don't render if not enabled
  if (!store.enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    />
  )
}
