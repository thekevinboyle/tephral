import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/glyphEffect.ts (CPU ground
// truth). The CPU version walks an AXIS-ALIGNED grid of cell centers
// starting at (gridSize/2, gridSize/2) and stepping by gridSize — the same
// cell-phase construction as AcidLedEffect/AsciiEffect — samples the source
// ONCE at each cell center, converts to brightness (0.299/0.587/0.114
// weights, matching the shared luminance() helper exactly), optionally
// inverts, skips the cell entirely if `brightness < 1 - density`
// (background shows through — whatever preserveVideo dictates), then maps
// the (possibly inverted) brightness to a character index
// `min(floor(brightness*charCount), charCount-1)` and fillText()s that
// glyph in solid white, centered in the cell.
//
// This shader reproduces that with a pre-baked glyph atlas (one row per
// character of the active charset, rendered with the CPU's exact font
// string minus the runtime gridSize — the atlas is baked at a fixed
// resolution once per charset, matching AsciiEffect's precedent, since the
// baked proportions (font-size === cell-size, monospace, center/middle
// align) are scale-invariant relative to the runtime gridSize uniform) and
// samples it at the in-cell UV, using the atlas's red channel as a
// glyph-coverage alpha mask (white glyph on black atlas background) exactly
// like AsciiEffect's DataTexture technique.
//
// COLORSPACE WARNING compliance: the source sample feeding the brightness
// calculation is converted sRGB-byte-equivalent via linearToSRGB before use
// (matching the CPU's byte-space ImageData math), and the composited result
// is converted back via sRGBToLinear right before outputColor.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D glyphAtlas;
uniform vec2 resolution;
uniform float gridSize;
uniform float charCount;
uniform float density;
uniform float invert;
uniform float preserveVideo;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  vec2 cell = floor(pixelCoord / gridSize);
  vec2 cellCenter = (cell + 0.5) * gridSize;
  vec2 uvCenter = clamp(cellCenter / resolution, vec2(0.0), vec2(0.9999));
  vec3 srcSRGB = linearToSRGB(clamp(texture2D(inputBuffer, uvCenter).rgb, 0.0, 1.0));
  float brightness = luminance(srcSRGB);
  if (invert > 0.5) brightness = 1.0 - brightness;

  vec3 bg = preserveVideo > 0.5 ? linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0)) : vec3(0.0);
  vec3 colorSRGB = bg;

  if (brightness >= 1.0 - density) {
    float charIndexF = min(floor(brightness * charCount), charCount - 1.0);
    vec2 posInCell = fract(pixelCoord / gridSize);
    float glyphWidth = 1.0 / charCount;
    vec2 glyphUV = vec2((charIndexF + posInCell.x) * glyphWidth, 1.0 - posInCell.y);
    float glyphAlpha = texture2D(glyphAtlas, glyphUV).r;
    colorSRGB = mix(colorSRGB, vec3(1.0), glyphAlpha);
  }

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export type AcidGlyphCharset = 'geometric' | 'arrows' | 'blocks' | 'math'

// Exact charsets from src/components/overlays/acid/glyphEffect.ts — do not
// reorder (index order feeds the brightness->index mapping).
const CHARSETS: Record<AcidGlyphCharset, string[]> = {
  geometric: ['⬢', '◯', '▲', '◼', '◆', '●', '■', '▶'],
  arrows: ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'],
  blocks: ['█', '▓', '▒', '░', '▄', '▀', '▌', '▐'],
  math: ['+', '×', '÷', '=', '≠', '≈', '∞', '∑'],
}

export interface AcidGlyphParams {
  gridSize: number
  charset: AcidGlyphCharset
  density: number
  invert: boolean
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_GLYPH_PARAMS: AcidGlyphParams = {
  gridSize: 12,
  charset: 'geometric',
  density: 0.7,
  invert: false,
  preserveVideo: false,
  mix: 1,
}

// Fixed atlas cell resolution — bake proportions match the CPU's
// `${gridSize}px monospace` font (font-size === cell size), so the baked
// atlas looks correct at any runtime gridSize once GPU-sampled.
const ATLAS_CELL = 128

export class AcidGlyphEffect extends Effect {
  private glyphAtlas: THREE.DataTexture | null = null
  private currentCharset: AcidGlyphCharset

  constructor(params: Partial<AcidGlyphParams> = {}) {
    const p = { ...DEFAULT_ACID_GLYPH_PARAMS, ...params }

    super('AcidGlyphEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['glyphAtlas', new THREE.Uniform(null)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['charCount', new THREE.Uniform(CHARSETS[p.charset].length)],
        ['density', new THREE.Uniform(p.density)],
        ['invert', new THREE.Uniform(p.invert ? 1 : 0)],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.currentCharset = p.charset
    this.generateAtlas(p.charset)
  }

  private generateAtlas(charset: AcidGlyphCharset) {
    const chars = CHARSETS[charset]
    this.currentCharset = charset

    const atlasWidth = chars.length * ATLAS_CELL
    const atlasHeight = ATLAS_CELL

    const canvas = document.createElement('canvas')
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    const ctx = canvas.getContext('2d')!

    // Black background so the red channel doubles as a glyph-coverage
    // alpha mask (matches AsciiEffect's technique).
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, atlasWidth, atlasHeight)

    // Matches CPU: `${gridSize}px monospace`, textAlign center, textBaseline
    // middle, white fill — baked at a fixed cell size so font-size ===
    // cell-size regardless of the runtime gridSize uniform.
    ctx.fillStyle = '#fff'
    ctx.font = `${ATLAS_CELL}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < chars.length; i++) {
      const x = i * ATLAS_CELL + ATLAS_CELL / 2
      const y = ATLAS_CELL / 2
      ctx.fillText(chars[i], x, y)
    }

    const imageData = ctx.getImageData(0, 0, atlasWidth, atlasHeight)
    const data = new Uint8Array(atlasWidth * atlasHeight)
    for (let i = 0; i < atlasWidth * atlasHeight; i++) {
      data[i] = imageData.data[i * 4]
    }

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

    this.uniforms.get('glyphAtlas')!.value = this.glyphAtlas
    this.uniforms.get('charCount')!.value = chars.length
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidGlyphParams>) {
    if (params.charset !== undefined && params.charset !== this.currentCharset) {
      this.generateAtlas(params.charset)
    }
    if (params.gridSize !== undefined) {
      this.uniforms.get('gridSize')!.value = params.gridSize
    }
    if (params.density !== undefined) {
      this.uniforms.get('density')!.value = params.density
    }
    if (params.invert !== undefined) {
      this.uniforms.get('invert')!.value = params.invert ? 1 : 0
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
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
