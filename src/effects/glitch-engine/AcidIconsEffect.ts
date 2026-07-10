import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/iconsEffect.ts (CPU ground
// truth). Same axis-aligned grid-cell construction as AcidGlyphEffect
// (center-sample once per cell), but: no invert, no density skip (CPU uses
// a fixed `brightness < 0.1` cutoff instead), an icon set of real (colored)
// emoji or plain Unicode symbols depending on `iconSet`, a per-cell
// rotation driven by `angle = brightness * rotation * 2π` (note: `rotation`
// is used as a raw turn-count multiplier in the CPU source, not converted
// from degrees — reproduced verbatim, bug-for-bug), and a `colorMode` that
// sets `ctx.fillStyle` before `fillText()`.
//
// CPU colorMode quirk (verified against Canvas2D behavior, not a
// simplification): color-emoji glyphs (COLR/CBDT fonts) are rendered by
// every browser in their native palette colors regardless of
// `ctx.fillStyle` — fillStyle only has a visible effect on plain
// (non-color) Unicode glyphs, i.e. only the `abstract` icon set
// (◉ ◎ ⊕ ⊗ ⊙ ⊚ ⊛ ⊜) in this CPU source. So colorMode is only ever visible
// for iconSet==='abstract'; for tech/nature/faces the baked-in emoji colors
// always show through unchanged. The atlas is baked ONCE per iconSet with
// fillStyle #fff (the CPU's mono baseline) — for emoji sets this already
// captures the correct native colors (browser ignores fillStyle); for the
// abstract set it captures white glyph shapes with real alpha coverage.
// At runtime: non-abstract sets always sample the atlas's baked RGB
// directly (matches CPU exactly, colorMode has no effect); the abstract set
// recolors using the atlas alpha as a coverage mask against a
// runtime-computed tint (mono=white / tint=CPU's `rgb+100` formula /
// original=raw source rgb), matching the CPU's per-colorMode fillStyle.
//
// Rotation is reproduced by inverse-rotating the in-cell UV around the cell
// center before the atlas lookup (equivalent to the CPU rotating the canvas
// forward by `angle` before drawing); samples that rotate outside the unit
// cell return no glyph contribution (background shows through), matching
// the fact that the CPU's glyph never fills its full cell box.
//
// COLORSPACE WARNING compliance: the source sample feeding brightness/tint
// is converted sRGB-byte-equivalent via linearToSRGB before use, and the
// composited result is converted back via sRGBToLinear right before
// outputColor.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D iconAtlas;
uniform vec2 resolution;
uniform float gridSize;
uniform float iconCount;
uniform float rotationTurns;
uniform float colorModeF; // 0 = mono, 1 = tint, 2 = original
uniform float isAbstract;
uniform float preserveVideo;
uniform float isFirstAcidPass;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  vec2 cell = floor(pixelCoord / gridSize);
  vec2 cellCenter = (cell + 0.5) * gridSize;
  vec2 uvCenter = clamp(cellCenter / resolution, vec2(0.0), vec2(0.9999));
  vec3 srcSRGB = linearToSRGB(clamp(texture2D(inputBuffer, uvCenter).rgb, 0.0, 1.0));
  float brightness = luminance(srcSRGB);

  vec3 bg = (isFirstAcidPass > 0.5 && preserveVideo <= 0.5) ? vec3(0.0) : linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 colorSRGB = bg;

  if (brightness >= 0.1) {
    float iconIndexF = min(floor(brightness * iconCount), iconCount - 1.0);
    float angle = brightness * rotationTurns * 6.28318530718;

    vec2 posInCell = fract(pixelCoord / gridSize);
    vec2 centered = posInCell - vec2(0.5);
    float ca = cos(-angle);
    float sa = sin(-angle);
    vec2 rotated = vec2(centered.x * ca - centered.y * sa, centered.x * sa + centered.y * ca);
    vec2 rotUV = rotated + vec2(0.5);

    if (rotUV.x >= 0.0 && rotUV.x <= 1.0 && rotUV.y >= 0.0 && rotUV.y <= 1.0) {
      float iconWidth = 1.0 / iconCount;
      vec2 glyphUV = vec2((iconIndexF + rotUV.x) * iconWidth, 1.0 - rotUV.y);
      vec4 atlasSample = texture2D(iconAtlas, glyphUV);

      if (atlasSample.a > 0.0) {
        if (isAbstract > 0.5) {
          vec3 tintColor;
          if (colorModeF < 0.5) tintColor = vec3(1.0);
          else if (colorModeF < 1.5) tintColor = clamp(srcSRGB + vec3(100.0 / 255.0), 0.0, 1.0);
          else tintColor = srcSRGB;
          colorSRGB = mix(colorSRGB, tintColor, atlasSample.a);
        } else {
          colorSRGB = mix(colorSRGB, atlasSample.rgb, atlasSample.a);
        }
      }
    }
  }

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export type AcidIconSet = 'tech' | 'nature' | 'abstract' | 'faces'
export type AcidIconsColorMode = 'mono' | 'tint' | 'original'

// Exact icon sets from src/components/overlays/acid/iconsEffect.ts — do not
// reorder (index order feeds the brightness->index mapping).
const ICON_SETS: Record<AcidIconSet, string[]> = {
  tech: ['⚙️', '💻', '📱', '🔧', '⚡', '🔌', '💾', '🖥️'],
  nature: ['🌿', '🌸', '🌊', '🔥', '⭐', '🌙', '☀️', '🌈'],
  abstract: ['◉', '◎', '⊕', '⊗', '⊙', '⊚', '⊛', '⊜'],
  faces: ['😀', '😎', '🤖', '👾', '💀', '👽', '🎭', '🤡'],
}

export interface AcidIconsParams {
  gridSize: number
  iconSet: AcidIconSet
  rotation: number
  colorMode: AcidIconsColorMode
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_ICONS_PARAMS: AcidIconsParams = {
  gridSize: 32,
  iconSet: 'tech',
  rotation: 0,
  colorMode: 'mono',
  preserveVideo: false,
  mix: 1,
}

// Fixed atlas cell resolution, baked at the CPU's ratio (font-size =
// cell-size * 0.8, sans-serif) so proportions hold at any runtime gridSize.
const ATLAS_CELL = 128

function colorModeToFloat(mode: AcidIconsColorMode): number {
  if (mode === 'tint') return 1
  if (mode === 'original') return 2
  return 0
}

export class AcidIconsEffect extends Effect {
  private iconAtlas: THREE.CanvasTexture | null = null
  private currentIconSet: AcidIconSet

  constructor(params: Partial<AcidIconsParams> = {}) {
    const p = { ...DEFAULT_ACID_ICONS_PARAMS, ...params }

    super('AcidIconsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['iconAtlas', new THREE.Uniform(null)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['iconCount', new THREE.Uniform(ICON_SETS[p.iconSet].length)],
        ['rotationTurns', new THREE.Uniform(p.rotation)],
        ['colorModeF', new THREE.Uniform(colorModeToFloat(p.colorMode))],
        ['isAbstract', new THREE.Uniform(p.iconSet === 'abstract' ? 1 : 0)],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['isFirstAcidPass', new THREE.Uniform(1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.currentIconSet = p.iconSet
    this.generateAtlas(p.iconSet)
  }

  private generateAtlas(iconSet: AcidIconSet) {
    const icons = ICON_SETS[iconSet]
    this.currentIconSet = iconSet

    const atlasWidth = icons.length * ATLAS_CELL
    const atlasHeight = ATLAS_CELL

    const canvas = document.createElement('canvas')
    canvas.width = atlasWidth
    canvas.height = atlasHeight
    const ctx = canvas.getContext('2d')!

    // Transparent background — RGBA atlas, alpha channel is glyph coverage.
    ctx.clearRect(0, 0, atlasWidth, atlasHeight)

    // Matches CPU: fillStyle white (mono baseline — real color emoji ignore
    // this and render their native palette regardless), font
    // `${gridSize*0.8}px sans-serif`, textAlign center, textBaseline middle.
    ctx.fillStyle = '#fff'
    ctx.font = `${ATLAS_CELL * 0.8}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < icons.length; i++) {
      const x = i * ATLAS_CELL + ATLAS_CELL / 2
      const y = ATLAS_CELL / 2
      ctx.fillText(icons[i], x, y)
    }

    if (this.iconAtlas) {
      this.iconAtlas.dispose()
    }

    this.iconAtlas = new THREE.CanvasTexture(canvas)
    this.iconAtlas.minFilter = THREE.LinearFilter
    this.iconAtlas.magFilter = THREE.LinearFilter
    this.iconAtlas.needsUpdate = true

    this.uniforms.get('iconAtlas')!.value = this.iconAtlas
    this.uniforms.get('iconCount')!.value = icons.length
    this.uniforms.get('isAbstract')!.value = iconSet === 'abstract' ? 1 : 0
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  // Set by EffectPipeline.updateEffects: true when this is the
  // chain-order-first ACID pass whose background depends on preserveVideo.
  // Stacked ACID passes with preserveVideo=false must NOT each wipe to
  // black — only the first should; later passes composite over the
  // previous pass's output (which already carries the shared black bg).
  setIsFirstAcidPass(isFirst: boolean) {
    this.uniforms.get('isFirstAcidPass')!.value = isFirst ? 1 : 0
  }

  updateParams(params: Partial<AcidIconsParams>) {
    if (params.iconSet !== undefined && params.iconSet !== this.currentIconSet) {
      this.generateAtlas(params.iconSet)
    }
    if (params.gridSize !== undefined) {
      this.uniforms.get('gridSize')!.value = params.gridSize
    }
    if (params.rotation !== undefined) {
      this.uniforms.get('rotationTurns')!.value = params.rotation
    }
    if (params.colorMode !== undefined) {
      this.uniforms.get('colorModeF')!.value = colorModeToFloat(params.colorMode)
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
    if (this.iconAtlas) {
      this.iconAtlas.dispose()
      this.iconAtlas = null
    }
  }
}
