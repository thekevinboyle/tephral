// Fragment shaders for the video warp. All draw a full-screen quad (PlaneGeometry(2, 2)) and
// output raw texel values: no colour-space or tone-mapping chunks, so a frame copied into the
// ring and read back is bit-identical to the source (RGBA8 in, RGBA8 out).
//
// Every profile ends with the same dry/wet: mix(live, warped, uMix). Mix is shared with audio.

export const WARP_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Downscale copy into a ring slot (and the thumbnail target). */
export const WARP_COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
}
`

/**
 * clean: one frame. After a jump, tB is the previous read (still advancing) and uFade its weight,
 * ramping 1 -> 0 over smooth*4 captured frames.
 */
export const WARP_CLEAN_FRAG = /* glsl */ `
uniform sampler2D tLive;
uniform sampler2D tA;
uniform sampler2D tB;
uniform float uFade;
uniform float uMix;
varying vec2 vUv;
void main() {
  vec4 w = mix(texture2D(tA, vUv), texture2D(tB, vUv), uFade);
  gl_FragColor = mix(texture2D(tLive, vUv), w, uMix);
}
`

/**
 * smear: weighted blend of up to 6 frames around the read point. The weights (normalised on the
 * CPU) come from a Gaussian whose width is set by Blend; Grain sets how many frames take part.
 * Unused slots carry weight 0.
 */
export const WARP_SMEAR_FRAG = /* glsl */ `
uniform sampler2D tLive;
uniform sampler2D tF0;
uniform sampler2D tF1;
uniform sampler2D tF2;
uniform sampler2D tF3;
uniform sampler2D tF4;
uniform sampler2D tF5;
uniform float uW[6];
uniform float uMix;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tF0, vUv) * uW[0] + texture2D(tF1, vUv) * uW[1] + texture2D(tF2, vUv) * uW[2]
         + texture2D(tF3, vUv) * uW[3] + texture2D(tF4, vUv) * uW[4] + texture2D(tF5, vUv) * uW[5];
  gl_FragColor = mix(texture2D(tLive, vUv), c, uMix);
}
`

/**
 * degrade: the frame (already held at the reduced rate on the CPU) is pixelated to uPixel
 * frame-pixels and posterized to uLevels levels per channel. Crunch 0 gives 1 px and 256 levels,
 * which is the frame unchanged.
 */
export const WARP_DEGRADE_FRAG = /* glsl */ `
uniform sampler2D tLive;
uniform sampler2D tA;
uniform vec2 uFrameSize;
uniform float uPixel;
uniform float uLevels;
uniform float uMix;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  if (uPixel > 1.0) {
    vec2 cell = uPixel / uFrameSize;
    uv = (floor(vUv / cell) + 0.5) * cell;
  }
  vec4 c = texture2D(tA, uv);
  float n = uLevels - 1.0;
  c.rgb = floor(c.rgb * n + 0.5) / n;
  gl_FragColor = mix(texture2D(tLive, vUv), c, uMix);
}
`
