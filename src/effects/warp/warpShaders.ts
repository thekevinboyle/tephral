// Fragment shaders for the video warp. All draw a full-screen quad (PlaneGeometry(2, 2)) and
// output raw texel values: no colour-space or tone-mapping chunks, so a frame copied into the
// ring and read back is bit-identical to the source (RGBA8 in, RGBA8 out).
//
// One shader per profile (spec §3, "Picture"). Every one reads the frame at `now - delay` (tA) and
// ends with the same Output stage (spec §4) and dry/wet: finish(wet). At a profile's neutral knobs
// each shader returns tA unchanged, and with Output open and Mix 1 finish() returns it as is.

/** Output Band: Hz on a log scale onto luminance, 20 Hz -> 0 and 20 kHz -> 1 (clamped). */
export function bandLuma(hz: number): number {
  if (!(hz > 20)) return 0
  if (hz >= 20000) return 1
  return Math.log(hz / 20) / Math.log(1000)
}

export const WARP_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Downscale copy into a ring slot (and the thumbnail and echo targets). */
export const WARP_COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
}
`

/**
 * Shared by every profile. uBand is the luminance band (lo < 0 / hi > 1 = that edge open); the key
 * is the dry pixel's luminance, with soft edges inside the band, so outside it the dry pixel shows
 * exactly. uGain is the wet level (linear).
 */
const COMMON = /* glsl */ `
uniform sampler2D tLive;
uniform sampler2D tA;
uniform float uMix;
uniform vec2 uBand;
uniform float uGain;
uniform vec2 uFrameSize;
uniform float uSeed;
varying vec2 vUv;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// Dave Hoskins' hash without sine (stable across GPUs for the small inputs used here)
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
// 3x3 tent around uv at offset d (in uv units)
vec4 tent(vec2 uv, vec2 d) {
  vec4 s = texture2D(tA, uv) * 4.0;
  s += (texture2D(tA, uv + vec2(d.x, 0.0)) + texture2D(tA, uv - vec2(d.x, 0.0))
      + texture2D(tA, uv + vec2(0.0, d.y)) + texture2D(tA, uv - vec2(0.0, d.y))) * 2.0;
  s += texture2D(tA, uv + d) + texture2D(tA, uv - d) + texture2D(tA, uv + vec2(d.x, -d.y)) + texture2D(tA, uv + vec2(-d.x, d.y));
  return s / 16.0;
}
// Soft blur of radius r frame pixels: two tents (r and r/2) averaged
vec4 blurA(vec2 uv, float r) {
  vec2 d = r / uFrameSize;
  return 0.5 * (tent(uv, d) + tent(uv, 0.5 * d));
}
vec4 finish(vec4 wet) {
  vec4 dry = texture2D(tLive, vUv);
  wet = vec4(clamp(wet.rgb * uGain, 0.0, 1.0), wet.a);
  float l = luma(dry.rgb);
  float s = max(1e-4, min(0.05, 0.5 * (uBand.y - uBand.x)));
  float k = (uBand.x < 0.0 ? 1.0 : smoothstep(uBand.x, uBand.x + s, l))
          * (uBand.y > 1.0 ? 1.0 : 1.0 - smoothstep(uBand.y - s, uBand.y, l));
  return mix(dry, mix(dry, wet, k), uMix);
}
`

/**
 * Clean: Vibrato / Vib speed wobble the UV sinusoidally (uWobble amplitude, uWobPhase integrated on
 * the CPU). Circuit-bend swaps random uBlock px blocks for blocks of neighbouring frames (tN1, tN2)
 * read at a wrong offset, with probability uBend. Echo fades the previous output (tEcho) in by uEcho.
 */
export const WARP_CLEAN_FRAG = COMMON + /* glsl */ `
uniform sampler2D tN1;
uniform sampler2D tN2;
uniform sampler2D tEcho;
uniform float uWobble;
uniform float uWobPhase;
uniform float uBend;
uniform float uBlock;
uniform float uEcho;
void main() {
  vec2 uv = vUv;
  if (uWobble > 0.0) {
    uv.x += uWobble * sin(uWobPhase + vUv.y * 6.2831853);
    uv.y += 0.5 * uWobble * cos(0.7 * uWobPhase + vUv.x * 6.2831853);
  }
  vec4 c = texture2D(tA, uv);
  if (uBend > 0.0) {
    vec2 cell = floor(gl_FragCoord.xy / uBlock);
    if (hash12(cell + uSeed * 17.0) < uBend) {
      vec2 off = (vec2(hash12(cell + 5.3 + uSeed), hash12(cell + 9.1 + uSeed)) - 0.5) * (2.0 * uBlock) / uFrameSize;
      c = hash12(cell * 1.7 + uSeed * 3.1) < 0.5 ? texture2D(tN1, uv + off) : texture2D(tN2, uv + off);
    }
  }
  if (uEcho > 0.0) c = mix(c, texture2D(tEcho, vUv), uEcho);
  gl_FragColor = finish(c);
}
`

/**
 * Flange: a smear of up to 6 taps around the read point (weights uW, set on the CPU from Grain size,
 * 0 for unused taps), each tap jittered in time on the CPU and in space by uOff (Modulation).
 * Physics blends the smear toward the single read frame tA. Width reads R and B from frames
 * further back (tR, tB) and slightly to either side.
 */
export const WARP_FLANGE_FRAG = COMMON + /* glsl */ `
uniform sampler2D tF0;
uniform sampler2D tF1;
uniform sampler2D tF2;
uniform sampler2D tF3;
uniform sampler2D tF4;
uniform sampler2D tF5;
uniform float uW[6];
uniform vec2 uOff[6];
uniform float uPhys;
uniform sampler2D tR;
uniform sampler2D tB;
uniform float uWidth;
void main() {
  vec4 c = texture2D(tA, vUv);
  if (uPhys < 1.0) {
    vec4 s = texture2D(tF0, vUv + uOff[0]) * uW[0] + texture2D(tF1, vUv + uOff[1]) * uW[1]
           + texture2D(tF2, vUv + uOff[2]) * uW[2] + texture2D(tF3, vUv + uOff[3]) * uW[3]
           + texture2D(tF4, vUv + uOff[4]) * uW[4] + texture2D(tF5, vUv + uOff[5]) * uW[5];
    c = mix(s, c, uPhys);
  }
  if (uWidth > 0.0) {
    vec2 d = vec2(uWidth * 0.006, 0.0);
    c.r = mix(c.r, texture2D(tR, vUv - d).r, uWidth);
    c.b = mix(c.b, texture2D(tB, vUv + d).b, uWidth);
  }
  gl_FragColor = finish(c);
}
`

/**
 * Degrade: the frame (held at the reduced rate on the CPU) is shaken by uJit (Chaos), pixelated to
 * uPixel frame pixels (Grain size), blurred by uBlur frame pixels (Cutoff) and posterized to uLevels.
 */
export const WARP_DEGRADE_FRAG = COMMON + /* glsl */ `
uniform float uPixel;
uniform float uLevels;
uniform float uBlur;
uniform vec2 uJit;
void main() {
  vec2 uv = vUv + uJit;
  if (uPixel > 1.0) {
    vec2 cell = uPixel / uFrameSize;
    uv = (floor(uv / cell) + 0.5) * cell;
  }
  vec4 c = uBlur > 0.0 ? blurA(uv, uBlur) : texture2D(tA, uv);
  if (uLevels < 255.5) {
    float n = uLevels - 1.0;
    c.rgb = floor(c.rgb * n + 0.5) / n;
  }
  gl_FragColor = finish(c);
}
`

/**
 * Filter Spam: per 1/16 slice (values set on the CPU from a seed of floor(phase * 16)): blur uBlur
 * (Cutoff base + Randomness), tint uTint by uTintAmt (Randomness), edge halo uRes (Resonance, unsharp
 * mask). Octaves (double speed) is a read-time change on the CPU.
 */
export const WARP_FILTERSPAM_FRAG = COMMON + /* glsl */ `
uniform float uBlur;
uniform vec3 uTint;
uniform float uTintAmt;
uniform float uRes;
void main() {
  vec4 c = texture2D(tA, vUv);
  vec4 o = uBlur > 0.0 ? blurA(vUv, uBlur) : c;
  if (uRes > 0.0) {
    vec4 h = tent(vUv, 3.0 / uFrameSize);
    o.rgb += uRes * (c.rgb - h.rgb);
  }
  if (uTintAmt > 0.0) o.rgb = mix(o.rgb, luma(o.rgb) * uTint, uTintAmt);
  gl_FragColor = finish(vec4(clamp(o.rgb, 0.0, 1.0), o.a));
}
`

/**
 * Harmo-nicer: zoomed copies of the read frame at 2x and 1.5x layered over it with opacities uA / uB
 * (Harmonize, the emphasis cycling at Speed). Detune offsets and rotates them in opposite directions
 * (uRot, uShift); Reverse mirrors them (uMirror, 0/1 per copy).
 */
export const WARP_HARMONICER_FRAG = COMMON + /* glsl */ `
uniform float uA;
uniform float uB;
uniform float uRot;
uniform float uShift;
uniform vec2 uMirror;
vec2 zoomed(float z, float rot, float shift, float mirror) {
  float asp = uFrameSize.x / uFrameSize.y;
  vec2 p = vUv - 0.5;
  if (mirror > 0.5) p.x = -p.x;
  p.x *= asp;
  float cs = cos(rot), sn = sin(rot);
  p = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
  p.x /= asp;
  return p / z + 0.5 + vec2(shift, 0.0);
}
void main() {
  vec4 c = texture2D(tA, vUv);
  if (uA > 0.0) c = mix(c, texture2D(tA, zoomed(2.0, uRot, uShift, uMirror.x)), uA);
  if (uB > 0.0) c = mix(c, texture2D(tA, zoomed(1.5, -uRot, -uShift, uMirror.y)), uB);
  gl_FragColor = finish(c);
}
`

/**
 * Fauxcoder: pixels whose luminance is near uCentre (Cutoff, flickered by Squelch and Magic on the
 * CPU) ring in false colour: 8 hue bands across the luminance range. uAmt (Amount x flicker) is the strength.
 */
export const WARP_FAUXCODER_FRAG = COMMON + /* glsl */ `
uniform float uAmt;
uniform float uCentre;
uniform float uWidth;
uniform float uRing;
void main() {
  vec4 c = texture2D(tA, vUv);
  float l = luma(c.rgb);
  float k = 1.0 - smoothstep(0.0, uWidth, abs(l - uCentre));
  if (uAmt > 0.0 && k > 0.0) {
    vec3 fc = 0.5 + 0.5 * cos(6.2831853 * (l * 8.0 + uRing + vec3(0.0, 0.33, 0.67)));
    c.rgb = mix(c.rgb, fc, uAmt * k);
  }
  gl_FragColor = finish(c);
}
`

/**
 * Lo-fizzly: Degrade drops the horizontal resolution to uCols columns (wobbled by the Rate LFO on
 * the CPU; 0 = full). Dirt jitters random lines sideways, adds noise and a random level (uLevel).
 * Radio bleeds the chroma sideways and darkens the corners.
 */
export const WARP_LOFIZZLY_FRAG = COMMON + /* glsl */ `
uniform float uCols;
uniform float uDirt;
uniform float uRadio;
uniform float uLevel;
void main() {
  vec2 uv = vUv;
  if (uDirt > 0.0) {
    float row = floor(vUv.y * uFrameSize.y / 2.0);
    if (hash12(vec2(row, uSeed)) < uDirt * 0.35) uv.x += (hash12(vec2(row + 3.7, uSeed)) - 0.5) * uDirt * 0.08;
  }
  if (uCols > 0.0) uv.x = (floor(uv.x * uCols) + 0.5) / uCols;
  vec4 c = texture2D(tA, uv);
  if (uRadio > 0.0) {
    vec2 d = vec2(uRadio * 0.02, 0.0);
    vec3 sm = (texture2D(tA, uv - d).rgb + texture2D(tA, uv - 2.0 * d).rgb + texture2D(tA, uv - 3.0 * d).rgb) / 3.0;
    float y = luma(c.rgb);
    vec3 chroma = mix(c.rgb - y, (sm - luma(sm)) * 1.4, uRadio);
    c.rgb = y + chroma;
    vec2 q = vUv - 0.5;
    c.rgb *= 1.0 - uRadio * 1.6 * dot(q, q);
  }
  if (uDirt > 0.0) {
    c.rgb += (hash12(gl_FragCoord.xy + uSeed * 61.0) - 0.5) * uDirt * 0.4;
    c.rgb *= uLevel;
  }
  gl_FragColor = finish(vec4(clamp(c.rgb, 0.0, 1.0), c.a));
}
`
