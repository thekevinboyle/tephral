import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform float effectMix;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  float lum = luminance(color);

  // Smooth threshold with small transition zone
  float mask = smoothstep(threshold - 0.05, threshold + 0.05, lum);

  // Blend with trail if enabled
  if (trailEnabled) {
    float trail = texture2D(trailTexture, uv).r * trailDecay;
    mask = max(mask, trail);
  }

  // Output mask in red channel, with original color for visualization
  vec4 effectColor = vec4(mask, mask, mask, 1.0);

  // Mix between showing original and showing mask
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface BrightTraceParams extends TraceParams {
  // threshold inherited from TraceParams (0-1 for luminance)
}

export const DEFAULT_BRIGHT_TRACE_PARAMS: BrightTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.5,  // Default luminance threshold
}

/**
 * Bright Trace Effect
 *
 * Creates a mask based on luminance thresholding with optional trail persistence.
 * Bright areas above the threshold become white in the mask, dark areas become black.
 *
 * The mask can be used by other effects to selectively apply processing
 * only to bright regions of the frame.
 */
export class BrightTraceEffect extends TraceEffect {
  constructor(params: Partial<BrightTraceParams> = {}) {
    const p = { ...DEFAULT_BRIGHT_TRACE_PARAMS, ...params }
    super('BrightTraceEffect', fragmentShader, p)
  }

  updateParams(params: Partial<BrightTraceParams>) {
    super.updateParams(params)
  }
}
