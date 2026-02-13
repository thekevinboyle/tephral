import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// ═══════════════════════════════════════════════════════════════════════════
// PIXEL SORT EFFECT - Glitch art classic
// Sorts pixels along rows/columns based on brightness, saturation, or hue
// ═══════════════════════════════════════════════════════════════════════════
//
// True pixel sorting requires sorting algorithms which aren't possible in
// fragment shaders. This approximates the effect by:
// 1. Finding pixels that pass the threshold test
// 2. Displacing them along the sort direction based on their sort value
// 3. Creating streak-like artifacts that mimic sorted pixel runs
//
const fragmentShader = `
uniform float threshold;
uniform float streakLength;
uniform float intensity;
uniform float randomness;
uniform int direction;      // 0 = horizontal, 1 = vertical
uniform int sortMode;       // 0 = brightness, 1 = saturation, 2 = hue
uniform bool reverse;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SPACE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float getLuminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

float getSortValue(vec3 color) {
  if (sortMode == 0) {
    // Brightness
    return getLuminance(color);
  } else if (sortMode == 1) {
    // Saturation
    vec3 hsv = rgb2hsv(color);
    return hsv.y;
  } else {
    // Hue
    vec3 hsv = rgb2hsv(color);
    return hsv.x;
  }
}

// Check if pixel passes threshold for sorting
bool passesThreshold(vec3 color) {
  float val = getSortValue(color);
  return val > threshold;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIXEL SORT
// ═══════════════════════════════════════════════════════════════════════════

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (intensity <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec2 texel = 1.0 / resolution;
  vec3 current = inputColor.rgb;
  float currentSortVal = getSortValue(current);

  // Direction vector for sorting
  vec2 sortDir = direction == 0 ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

  // Add randomness to the sort direction
  float randOffset = (noise(uv * 50.0 + time * 0.5) - 0.5) * randomness * 0.1;
  if (direction == 0) {
    sortDir.y = randOffset;
  } else {
    sortDir.x = randOffset;
  }
  sortDir = normalize(sortDir);

  // Maximum search distance in pixels
  float maxDist = streakLength * texel.x;

  // Only sort pixels that pass threshold
  if (!passesThreshold(current)) {
    // Below threshold - might get displaced by sorted pixels
    // Look backwards to see if there's a sorting run that would push into us

    vec3 result = current;
    float displacement = 0.0;

    for (float i = 1.0; i <= 64.0; i++) {
      if (i > streakLength * 0.5) break;

      vec2 sampleUV = uv - sortDir * i * texel.x;
      if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) break;

      vec3 sampleColor = texture2D(inputBuffer, sampleUV).rgb;

      if (passesThreshold(sampleColor)) {
        float sampleSortVal = getSortValue(sampleColor);
        float sortStrength = reverse ? (1.0 - sampleSortVal) : sampleSortVal;

        // This pixel might displace into our position
        float pushDist = sortStrength * streakLength * texel.x * intensity;

        if (pushDist >= i * texel.x) {
          result = sampleColor;
          break;
        }
      }
    }

    outputColor = mix(inputColor, vec4(result, inputColor.a), effectMix);
    return;
  }

  // Above threshold - this pixel participates in sorting
  // Calculate how far this pixel should be displaced based on its sort value

  float sortStrength = reverse ? (1.0 - currentSortVal) : currentSortVal;

  // Add noise to displacement for organic look
  float noiseVal = noise(uv * 100.0 + time);
  float randFactor = 1.0 + (noiseVal - 0.5) * randomness;

  // Displacement distance based on sort value
  float displacement = sortStrength * streakLength * texel.x * intensity * randFactor;

  // Find what pixel should be at this location after sorting
  // We look backwards along the sort direction

  vec3 result = current;
  float bestMatch = -1.0;

  // Sample along the streak to find sorted position
  for (float i = 0.0; i <= 128.0; i++) {
    if (i > streakLength) break;

    float t = i / streakLength;
    vec2 sampleUV = uv - sortDir * i * texel.x;

    if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) break;

    vec3 sampleColor = texture2D(inputBuffer, sampleUV).rgb;

    if (!passesThreshold(sampleColor)) continue;

    float sampleSortVal = getSortValue(sampleColor);
    float sampleStrength = reverse ? (1.0 - sampleSortVal) : sampleSortVal;

    // Check if this sample should end up at our position
    float sampleDisplacement = sampleStrength * streakLength * texel.x * intensity;
    sampleDisplacement *= 1.0 + (noise(sampleUV * 100.0 + time) - 0.5) * randomness;

    if (sampleDisplacement >= i * texel.x * 0.9 && sampleDisplacement <= i * texel.x * 1.1 + texel.x) {
      if (sampleStrength > bestMatch) {
        result = sampleColor;
        bestMatch = sampleStrength;
      }
    }
  }

  // If no good match found, use displacement-based lookup
  if (bestMatch < 0.0) {
    vec2 lookupUV = uv - sortDir * displacement;
    lookupUV = clamp(lookupUV, vec2(0.0), vec2(1.0));
    result = texture2D(inputBuffer, lookupUV).rgb;
  }

  // Streak effect - blend with neighbors for smoother result
  vec3 streak = result;
  float streakSamples = min(8.0, streakLength * 0.1);

  for (float i = 1.0; i <= 8.0; i++) {
    if (i > streakSamples) break;

    vec2 streakUV = uv - sortDir * displacement * (1.0 - i / streakSamples) * 0.5;
    streakUV = clamp(streakUV, vec2(0.0), vec2(1.0));

    vec3 streakSample = texture2D(inputBuffer, streakUV).rgb;
    float weight = 1.0 - i / (streakSamples + 1.0);
    streak = mix(streak, streakSample, weight * 0.3);
  }

  result = mix(result, streak, 0.3 * intensity);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface PixelSortParams {
  direction: 'horizontal' | 'vertical'
  sortMode: 'brightness' | 'saturation' | 'hue'
  threshold: number       // 0-1: pixels below this don't sort
  streakLength: number    // 1-500: max pixels to sort/displace
  intensity: number       // 0-1: effect strength
  randomness: number      // 0-1: variation in sorting
  reverse: boolean        // sort direction
  mix: number            // 0-1: wet/dry
}

export const DEFAULT_PIXEL_SORT_PARAMS: PixelSortParams = {
  direction: 'vertical',
  sortMode: 'brightness',
  threshold: 0.3,
  streakLength: 120,
  intensity: 0.8,
  randomness: 0.2,
  reverse: false,
  mix: 1,
}

export class PixelSortEffect extends Effect {
  private time: number = 0

  constructor(params: Partial<PixelSortParams> = {}) {
    const p = { ...DEFAULT_PIXEL_SORT_PARAMS, ...params }

    const directionInt = p.direction === 'horizontal' ? 0 : 1
    const sortModeInt = p.sortMode === 'brightness' ? 0 : p.sortMode === 'saturation' ? 1 : 2

    super('PixelSortEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['streakLength', new THREE.Uniform(p.streakLength)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['randomness', new THREE.Uniform(p.randomness)],
        ['direction', new THREE.Uniform(directionInt)],
        ['sortMode', new THREE.Uniform(sortModeInt)],
        ['reverse', new THREE.Uniform(p.reverse)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    this.time += deltaTime || 0.016
    this.uniforms.get('time')!.value = this.time
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<PixelSortParams>) {
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.streakLength !== undefined) this.uniforms.get('streakLength')!.value = params.streakLength
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.randomness !== undefined) this.uniforms.get('randomness')!.value = params.randomness
    if (params.direction !== undefined) {
      this.uniforms.get('direction')!.value = params.direction === 'horizontal' ? 0 : 1
    }
    if (params.sortMode !== undefined) {
      this.uniforms.get('sortMode')!.value = params.sortMode === 'brightness' ? 0 : params.sortMode === 'saturation' ? 1 : 2
    }
    if (params.reverse !== undefined) this.uniforms.get('reverse')!.value = params.reverse
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
