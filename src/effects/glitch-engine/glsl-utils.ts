// ═══════════════════════════════════════════════════════════════════════════
// Shared GLSL utility functions
// Import and prepend to effect fragment shaders to avoid duplication
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hash and noise functions for procedural generation.
 * Includes: hash, hash3, valueNoise, fbm (4 octaves), simplex 2D/3D, curlNoise
 */
export const NOISE_GLSL = /* glsl */ `
// ─── Hash functions ───────────────────────────────────────────────────
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// ─── Value noise with smoothstep interpolation ───────────────────────
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// ─── Fractal Brownian Motion (4 octaves) ─────────────────────────────
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 4; i++) {
    v += a * valueNoise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

// ─── Simplex 2D noise (Ashima Arts) ──────────────────────────────────
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ─── Curl noise for organic flow ─────────────────────────────────────
vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = snoise(p + vec2(eps, 0.0));
  float n2 = snoise(p - vec2(eps, 0.0));
  float n3 = snoise(p + vec2(0.0, eps));
  float n4 = snoise(p - vec2(0.0, eps));
  float dndx = (n1 - n2) / (2.0 * eps);
  float dndy = (n3 - n4) / (2.0 * eps);
  return vec2(dndy, -dndx);
}
`

/**
 * Color space conversion utilities.
 * Includes: rgb2hsv, hsv2rgb, rgb2hsl, hsl2rgb, luminance, sRGB<->linear
 */
export const COLOR_UTILS_GLSL = /* glsl */ `
// ─── Luminance ───────────────────────────────────────────────────────
float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// ─── RGB <-> HSV ─────────────────────────────────────────────────────
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// ─── sRGB <-> Linear ────────────────────────────────────────────────
vec3 sRGBToLinear(vec3 c) {
  return pow(max(c, 0.0), vec3(2.2));
}

vec3 linearToSRGB(vec3 c) {
  return pow(max(c, 0.0), vec3(1.0 / 2.2));
}

// ─── UV rotation helper ─────────────────────────────────────────────
vec2 rotateUV(vec2 uv, float angle) {
  vec2 center = vec2(0.5);
  uv -= center;
  float s = sin(angle);
  float c = cos(angle);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  return uv + center;
}

// ─── Blend modes ────────────────────────────────────────────────────
vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend,
    1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
    step(0.5, base)
  );
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
  return mix(
    2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
    sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
    step(0.5, blend)
  );
}
`
