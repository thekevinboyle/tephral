import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// Character ramps for different modes (dark to light)
const ASCII_CHAR_SETS: Record<string, string> = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  braille: ' ⠁⠃⠇⠏⠟⠿⣿',
}

const fragmentShader = `
uniform sampler2D glyphAtlas;
uniform vec2 resolution;
uniform float cellSize;
uniform float charCount;
uniform vec2 atlasSize;
uniform float contrast;
uniform bool invert;
uniform vec3 monoColor;
uniform int colorMode;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 cellIndex = floor(pixelCoord / cellSize);
  vec2 cellCenter = (cellIndex + 0.5) * cellSize;
  vec2 cellCenterUV = cellCenter / resolution;

  // Sample the source at cell center
  vec4 cellColor = texture2D(inputBuffer, cellCenterUV);

  // Calculate brightness with contrast adjustment
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));
  brightness = clamp((brightness - 0.5) * contrast + 0.5, 0.0, 1.0);

  if (invert) {
    brightness = 1.0 - brightness;
  }

  // Map brightness to character index
  float charIndex = floor(brightness * (charCount - 0.001));

  // Position within cell (0-1)
  vec2 posInCell = fract(pixelCoord / cellSize);

  // Calculate glyph UV in atlas
  // Atlas is laid out horizontally: char 0 at left, char N at right
  float glyphWidth = 1.0 / charCount;
  vec2 glyphUV = vec2(
    (charIndex + posInCell.x) * glyphWidth,
    1.0 - posInCell.y  // Flip Y for correct orientation
  );

  // Sample the glyph atlas
  float glyphAlpha = texture2D(glyphAtlas, glyphUV).r;

  // Determine output color based on color mode
  vec3 finalColor;
  if (colorMode == 0) {
    // Mono mode - use monoColor
    finalColor = monoColor;
  } else {
    // Original mode - use source color
    finalColor = cellColor.rgb;
  }

  // Black background with colored character
  vec4 effectColor = vec4(finalColor * glyphAlpha, 1.0);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export type AsciiEffectMode = 'standard' | 'blocks' | 'braille'
export type AsciiColorMode = 'mono' | 'original'

export interface AsciiEffectParams {
  mode: AsciiEffectMode
  cellSize: number
  contrast: number
  invert: boolean
  colorMode: AsciiColorMode
  monoColor: string
  mix: number
}

export const DEFAULT_ASCII_EFFECT_PARAMS: AsciiEffectParams = {
  mode: 'standard',
  cellSize: 8,
  contrast: 1.0,
  invert: false,
  colorMode: 'mono',
  monoColor: '#00ff00',
  mix: 1,
}

export class AsciiEffect extends Effect {
  private glyphAtlas: THREE.DataTexture | null = null
  private currentMode: AsciiEffectMode = 'standard'

  constructor(params: Partial<AsciiEffectParams> = {}) {
    const p = { ...DEFAULT_ASCII_EFFECT_PARAMS, ...params }
    const color = hexToRgb(p.monoColor)

    super('AsciiEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['glyphAtlas', new THREE.Uniform(null)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['cellSize', new THREE.Uniform(p.cellSize)],
        ['charCount', new THREE.Uniform(10)],
        ['atlasSize', new THREE.Uniform(new THREE.Vector2(256, 32))],
        ['contrast', new THREE.Uniform(p.contrast)],
        ['invert', new THREE.Uniform(p.invert)],
        ['monoColor', new THREE.Uniform(new THREE.Vector3(color.r, color.g, color.b))],
        ['colorMode', new THREE.Uniform(p.colorMode === 'mono' ? 0 : 1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.generateAtlas(p.mode)
  }

  private generateAtlas(mode: AsciiEffectMode) {
    const chars = ASCII_CHAR_SETS[mode] || ASCII_CHAR_SETS.standard
    this.currentMode = mode

    const cellWidth = 32
    const cellHeight = 32
    const atlasWidth = chars.length * cellWidth
    const atlasHeight = cellHeight

    // Create canvas for rendering glyphs
    const canvas = document.createElement('canvas')
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    const ctx = canvas.getContext('2d')!

    // Clear to black
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, atlasWidth, atlasHeight)

    // Render characters
    ctx.fillStyle = '#fff'
    ctx.font = `${cellHeight * 0.8}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < chars.length; i++) {
      const x = i * cellWidth + cellWidth / 2
      const y = cellHeight / 2
      ctx.fillText(chars[i], x, y)
    }

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight)
    const data = new Uint8Array(atlasWidth * atlasHeight)

    // Extract just the red channel (or luminance)
    for (let i = 0; i < atlasWidth * atlasHeight; i++) {
      data[i] = imageData.data[i * 4]
    }

    // Create texture
    if (this.glyphAtlas) {
      this.glyphAtlas.dispose()
    }

    this.glyphAtlas = new THREE.DataTexture(
      data,
      atlasWidth,
      atlasHeight,
      THREE.RedFormat,
      THREE.UnsignedByteType
    )
    this.glyphAtlas.minFilter = THREE.LinearFilter
    this.glyphAtlas.magFilter = THREE.LinearFilter
    this.glyphAtlas.needsUpdate = true

    // Update uniforms
    this.uniforms.get('glyphAtlas')!.value = this.glyphAtlas
    this.uniforms.get('charCount')!.value = chars.length
    this.uniforms.get('atlasSize')!.value = new THREE.Vector2(atlasWidth, atlasHeight)
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AsciiEffectParams>) {
    if (params.mode !== undefined && params.mode !== this.currentMode) {
      this.generateAtlas(params.mode)
    }
    if (params.cellSize !== undefined) {
      this.uniforms.get('cellSize')!.value = params.cellSize
    }
    if (params.contrast !== undefined) {
      this.uniforms.get('contrast')!.value = params.contrast
    }
    if (params.invert !== undefined) {
      this.uniforms.get('invert')!.value = params.invert
    }
    if (params.colorMode !== undefined) {
      this.uniforms.get('colorMode')!.value = params.colorMode === 'mono' ? 0 : 1
    }
    if (params.monoColor !== undefined) {
      const color = hexToRgb(params.monoColor)
      ;(this.uniforms.get('monoColor')!.value as THREE.Vector3).set(color.r, color.g, color.b)
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }

  dispose() {
    super.dispose()
    if (this.glyphAtlas) {
      this.glyphAtlas.dispose()
      this.glyphAtlas = null
    }
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    }
  }
  return { r: 0, g: 1, b: 0 } // Default green
}
