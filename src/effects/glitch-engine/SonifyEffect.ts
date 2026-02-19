import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// "Open in Audacity" effect — treats pixel rows as 1D audio waveforms.
// Byte offset misaligns RGBA channels, sample rate creates horizontal banding,
// bit crush quantizes harshly, drive adds waveshaping saturation.
const fragmentShader = `
uniform float sampleRate;
uniform float bitDepth;
uniform float drive;
uniform float filterCutoff;
uniform float byteOffset;
uniform int channelMode;    // 0 = all, 1 = red, 2 = green, 3 = blue
uniform float intensity;
uniform float effectMix;
uniform vec2 resolution;

// tanh approximation for GLSL ES 1.0
float tanhApprox(float x) {
  float ex = exp(2.0 * clamp(x, -10.0, 10.0));
  return (ex - 1.0) / (ex + 1.0);
}

vec3 tanhApprox3(vec3 v) {
  return vec3(tanhApprox(v.r), tanhApprox(v.g), tanhApprox(v.b));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (intensity <= 0.0 || effectMix <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec2 texel = 1.0 / resolution;
  vec3 original = inputColor.rgb;

  // ── 1. Linearize pixel position to 1D byte stream ──
  // Treat image as row-major RGBA byte array, like audio software would see it
  float pixelIndex = floor(uv.y * resolution.y) * resolution.x + floor(uv.x * resolution.x);
  float totalPixels = resolution.x * resolution.y;

  // ── 2. Byte offset: shift the read position to misalign RGBA channels ──
  // This is the key "audacity" look — channels get swapped/shifted
  float offsetPixels = byteOffset * resolution.x * 4.0; // offset in "bytes" (4 per pixel)
  float shiftedIndex = mod(pixelIndex + offsetPixels, totalPixels);

  // Convert back to 2D UV
  float shiftedY = floor(shiftedIndex / resolution.x) / resolution.y;
  float shiftedX = mod(shiftedIndex, resolution.x) / resolution.x;
  vec2 shiftedUV = vec2(shiftedX, shiftedY);

  // ── 3. Sample rate reduction: horizontal-only quantization ──
  // Audio sample rate reduction = horizontal staircase, preserving vertical detail
  // sampleRate 1.0 = full resolution, 0.01 = extreme horizontal blocking
  float horzStep = max((1.0 - sampleRate) * 0.05, texel.x); // up to ~50px wide blocks
  float quantX = floor(shiftedUV.x / horzStep) * horzStep + horzStep * 0.5;
  vec2 sampleUV = vec2(clamp(quantX, 0.0, 1.0), shiftedUV.y);

  vec3 color = texture2D(inputBuffer, sampleUV).rgb;

  // Also grab the un-shifted original for channel mixing
  float quantXOrig = floor(uv.x / horzStep) * horzStep + horzStep * 0.5;
  vec3 colorOrig = texture2D(inputBuffer, vec2(clamp(quantXOrig, 0.0, 1.0), uv.y)).rgb;

  // ── 4. Bit crush ──
  float levels = pow(2.0, bitDepth);
  color = floor(color * levels + 0.5) / levels;
  colorOrig = floor(colorOrig * levels + 0.5) / levels;

  // ── 5. Byte-level channel confusion ──
  // When byteOffset is non-zero, mix shifted and original samples
  // to simulate RGBA byte misalignment (R from one pixel, G from another, etc.)
  float confusion = clamp(byteOffset * 4.0, 0.0, 1.0);
  vec3 confused = vec3(
    mix(colorOrig.r, color.r, confusion),
    mix(colorOrig.g, color.g, confusion * 0.7),  // slightly different per channel
    mix(colorOrig.b, color.b, confusion * 1.3)
  );
  color = confused;

  // ── 6. Waveshape: saturating distortion ──
  if (drive > 0.001) {
    float gain = 1.0 + drive * 30.0;
    // Push signal hard, then normalize — creates harsh clipping character
    color = color * 2.0 - 1.0; // to signed range
    float tanhGain = tanhApprox(gain);
    color = tanhApprox3(color * gain) / tanhGain;
    color = color * 0.5 + 0.5; // back to 0-1
  }

  // ── 7. Low-pass filter: horizontal blur between neighbors ──
  float lpf = 1.0 - filterCutoff;
  if (lpf > 0.001) {
    // Sample horizontal neighbors at the quantized positions
    vec2 leftUV = vec2(clamp(sampleUV.x - texel.x * 2.0, 0.0, 1.0), sampleUV.y);
    vec2 rightUV = vec2(clamp(sampleUV.x + texel.x * 2.0, 0.0, 1.0), sampleUV.y);
    vec3 leftSample = texture2D(inputBuffer, leftUV).rgb;
    vec3 rightSample = texture2D(inputBuffer, rightUV).rgb;

    // Crush neighbors too
    leftSample = floor(leftSample * levels + 0.5) / levels;
    rightSample = floor(rightSample * levels + 0.5) / levels;

    // Weighted average — stronger lpf = more blur
    color = mix(color, (leftSample * 0.25 + color * 0.5 + rightSample * 0.25), lpf);
  }

  // ── 8. Channel select ──
  vec3 result = color;
  if (channelMode == 1) {
    result = vec3(color.r, original.g, original.b);
  } else if (channelMode == 2) {
    result = vec3(original.r, color.g, original.b);
  } else if (channelMode == 3) {
    result = vec3(original.r, original.g, color.b);
  }

  // ── 9. Final mix ──
  outputColor = mix(inputColor, vec4(result, inputColor.a), effectMix * intensity);
}
`

export type SonifyChannelMode = 'all' | 'red' | 'green' | 'blue'

export interface SonifyParams {
  sampleRate: number      // 0.01-1.0: horizontal resolution (lower = blockier)
  bitDepth: number        // 1-16: bit-crushing depth
  drive: number           // 0-1: waveshaping distortion
  filterCutoff: number    // 0-1: low-pass filter cutoff
  byteOffset: number      // 0-1: RGBA byte misalignment
  channelMode: SonifyChannelMode
  intensity: number       // 0-1: overall effect amount
  mix: number             // 0-1: dry/wet
}

export const DEFAULT_SONIFY_PARAMS: SonifyParams = {
  sampleRate: 0.5,
  bitDepth: 4,
  drive: 0.15,
  filterCutoff: 0.7,
  byteOffset: 0.05,
  channelMode: 'all',
  intensity: 0.8,
  mix: 1,
}

const channelModeToInt = (mode: SonifyChannelMode): number => {
  switch (mode) {
    case 'all': return 0
    case 'red': return 1
    case 'green': return 2
    case 'blue': return 3
    default: return 0
  }
}

export class SonifyEffect extends Effect {
  constructor(params: Partial<SonifyParams> = {}) {
    const p = { ...DEFAULT_SONIFY_PARAMS, ...params }

    super('SonifyEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['sampleRate', new THREE.Uniform(p.sampleRate)],
        ['bitDepth', new THREE.Uniform(p.bitDepth)],
        ['drive', new THREE.Uniform(p.drive)],
        ['filterCutoff', new THREE.Uniform(p.filterCutoff)],
        ['byteOffset', new THREE.Uniform(p.byteOffset)],
        ['channelMode', new THREE.Uniform(channelModeToInt(p.channelMode))],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
      ]),
    })
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<SonifyParams>) {
    if (params.sampleRate !== undefined) this.uniforms.get('sampleRate')!.value = params.sampleRate
    if (params.bitDepth !== undefined) this.uniforms.get('bitDepth')!.value = params.bitDepth
    if (params.drive !== undefined) this.uniforms.get('drive')!.value = params.drive
    if (params.filterCutoff !== undefined) this.uniforms.get('filterCutoff')!.value = params.filterCutoff
    if (params.byteOffset !== undefined) this.uniforms.get('byteOffset')!.value = params.byteOffset
    if (params.channelMode !== undefined) this.uniforms.get('channelMode')!.value = channelModeToInt(params.channelMode)
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
