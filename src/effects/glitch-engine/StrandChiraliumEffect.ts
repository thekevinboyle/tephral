import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/chiraliumEffect.ts (CPU
// ground truth, effect id 'strand_chiralium'). CPU state: a module-level
// `crystalSeeds` array of up to `floor(density*100)` {x,y,angle,size}
// objects, regenerated only when the seed count or `density` changes. Each
// seed is placed by sampling up to 20 random (x,y) candidates and keeping
// the first one whose brightness exceeds `threshold` (or, failing that
// after 15 attempts, forcing placement anyway) — a one-off JS-side search
// with no GPU equivalent (no persistent state to search against). Every
// frame, each seed re-checks brightness AT ITS OWN FIXED PIXEL
// (`brightness < threshold*0.8` skips it — a relaxed hysteresis threshold
// vs. the placement-time `threshold`, so a seed doesn't flicker on/off
// right at the boundary) and, if still bright enough, draws a crystal via
// `drawCrystal()`, which re-randomizes ALL facet geometry (5-7 facets, each
// with an independently re-rolled radius) via fresh `Math.random()` calls
// EVERY SINGLE FRAME — a deliberately noisy, shimmering shape, not a
// stable polygon that merely fades.
//
// GPU approach: MAX_SEEDS=100 matches density's ceiling (100 == UI density
// max * 100). Since there's no persistent JS array to search for bright
// spots, each seed's CANDIDATE position is instead hashed onto a coarse
// grid cell (CHIRAL_GRID=40px, per the brief's "facet placement per bright
// coarse-grid cells + hash" guidance) — stable for that seed index across
// frames — and the per-frame `brightness < threshold*0.8` re-check (the
// CPU's ongoing visibility gate) is reproduced exactly; only the CPU's
// one-off placement-time search is not reproduced (a seed's coarse cell is
// simply always the same hash of its index, not re-rolled toward
// brightness). A cheap broad-phase distance cull (hash-only, no texture
// read) runs BEFORE the brightness sample so the expensive texture2D read
// only happens for pixels near a candidate seed — this keeps the 100-slot
// loop's cost bounded despite each seed nominally needing its own texture
// sample. The facet body reproduces the CPU's per-frame geometry reroll
// with a `floor(time*60.0)`-bucket hash (same reroll-every-~1/60s technique
// as StrandSeamEffect's void particles / StrandTimefallEffect's noise
// flicker) driving each angular facet's radius, so the crystal visibly
// shimmers/re-facets rather than presenting a static polygon.
//
// COLORSPACE WARNING compliance: every sample goes through linearToSRGB
// before use; the composited result goes through sRGBToLinear immediately
// before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port — the
// CPU overlay canvas has no "renders on black" mode (unlit pixels are
// simply transparent); effectMix is the only blend control. Draws under
// `ctx.globalCompositeOperation = 'screen'` throughout (verbatim from the
// CPU source), reproduced with blendScreen().
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float threshold;
uniform float density;
uniform float shimmer;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

const int MAX_SEEDS = 100;
const float CHIRAL_GRID = 40.0;

float chHash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  float cols = max(floor(resolution.x / CHIRAL_GRID), 1.0);
  float rows = max(floor(resolution.y / CHIRAL_GRID), 1.0);
  float totalCells = cols * rows;
  float seedCount = floor(density * 100.0);

  for (int i = 0; i < MAX_SEEDS; i++) {
    if (float(i) >= seedCount) break;
    float fi = float(i);

    float cellIdx = floor(chHash(fi * 3.7 + 1.0) * totalCells);
    float cellX = mod(cellIdx, cols);
    float cellY = floor(cellIdx / cols);
    vec2 seedPx = (vec2(cellX, cellY) + 0.5) * CHIRAL_GRID;

    float seedAngle = chHash(fi * 5.9 + 2.0) * 6.28318530718;
    float seedSize = mix(10.0, 40.0, chHash(fi * 7.1 + 3.0));

    vec2 rel = pixelCoord - seedPx;
    float maxReach = seedSize + 2.0;
    if (dot(rel, rel) > maxReach * maxReach) continue;

    // Brightness gate, sampled ONLY for near-seed pixels (the broad-phase
    // cull above keeps this expensive texture read rare) — reproduces the
    // CPU's per-frame brightness-less-than-threshold*0.8 re-check exactly,
    // though not its one-off placement-time bright-spot search (see header).
    vec2 seedUV = clamp(seedPx / resolution, 0.0, 1.0);
    vec3 seedColorSRGB = linearToSRGB(clamp(texture2D(inputBuffer, seedUV).rgb, 0.0, 1.0));
    float brightness = (seedColorSRGB.r + seedColorSRGB.g + seedColorSRGB.b) / 3.0;
    if (brightness < threshold * 0.8) continue;

    float rotation = seedAngle + time * shimmer * 0.5;
    float c = cos(-rotation);
    float s = sin(-rotation);
    vec2 local = vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);

    float shimmerOffset = sin(time * 5.0 + seedPx.x * 0.1 + seedPx.y * 0.1) * shimmer * 0.5;
    float alpha = clamp(0.3 + shimmerOffset + brightness * 0.3, 0.0, 1.0);

    // Faceted crystal body: a CLOSED polygon (CPU drawCrystal's moveTo/
    // lineTo/closePath chain) with 5-7 vertices whose radii re-roll every
    // ~1/60s (frame-bucket hash), reproducing the CPU's per-frame geometry
    // reroll. facetCount is a per-seed hash of 5+floor(rand*3) (the CPU
    // rolls it fresh each frame; a stable per-seed count reads the same and
    // keeps the sectors coherent). Vertices sit at angle sectorSize*i,
    // starting at angle 0 exactly like the CPU.
    float facetCount = 5.0 + floor(chHash(fi * 19.7 + 11.0) * 3.0);
    float sectorSize = 6.28318530718 / facetCount;
    float frameBucket = floor(time * 60.0);

    float dist = length(local);
    float ang = atan(local.y, local.x);
    if (ang < 0.0) ang += 6.28318530718;
    float k = floor(ang / sectorSize);
    float kNext = mod(k + 1.0, facetCount);
    float facetFrac = fract(ang / sectorSize);

    // The two vertices bounding this angular sector.
    float rk = seedSize * (0.5 + chHash(fi * 13.3 + k * 17.1 + frameBucket * 0.037) * 0.5);
    float rn = seedSize * (0.5 + chHash(fi * 13.3 + kNext * 17.1 + frameBucket * 0.037) * 0.5);
    float ak = k * sectorSize;
    float an = (k + 1.0) * sectorSize;
    vec2 vA = rk * vec2(cos(ak), sin(ak));
    vec2 vB = rn * vec2(cos(an), sin(an));

    // Boundary radius along this pixel's direction is the intersection of
    // the ray r*D with the STRAIGHT edge (chord) vA->vB:
    //   r = (vA x vB) / (D x vB - D x vA).
    // The prior code linearly interpolated the two vertex radii instead,
    // which bows each sector's edge OUTWARD into an arc and collapses the
    // whole polygon into a near-circle (the reported "pale oval glow"). The
    // chord solve gives true flat edges and sharp vertices at sector seams.
    vec2 D = dist > 1e-4 ? local / dist : vec2(1.0, 0.0);
    float cross_AB = vA.x * vB.y - vA.y * vB.x;
    float denom = (D.x * vB.y - D.y * vB.x) - (D.x * vA.y - D.y * vA.x);
    float facetR = abs(denom) > 1e-4 ? cross_AB / denom : seedSize;
    facetR = clamp(facetR, 1.0, seedSize);

    float bodyCoverage = 1.0 - smoothstep(facetR - 1.2, facetR + 1.2, dist);

    if (bodyCoverage > 0.0) {
      // Radial gradient over the full seedSize (CPU: createRadialGradient
      // (0,0,0, 0,0,size)), NOT over the per-angle facet radius.
      float tr = clamp(dist / max(seedSize, 0.001), 0.0, 1.0);
      vec3 cc0 = vec3(255.0, 235.0, 150.0) / 255.0;
      vec3 cc1 = vec3(255.0, 215.0, 0.0) / 255.0;
      vec3 cc2 = vec3(200.0, 150.0, 0.0) / 255.0;
      vec3 crystalColor;
      float crystalAlphaBase;
      if (tr < 0.5) {
        float f = tr / 0.5;
        crystalColor = mix(cc0, cc1, f);
        crystalAlphaBase = mix(alpha * 0.8, alpha * 0.5, f);
      } else {
        float f = (tr - 0.5) / 0.5;
        crystalColor = mix(cc1, cc2, f);
        crystalAlphaBase = mix(alpha * 0.5, alpha * 0.2, f);
      }
      // NORMAL alpha composite (source-over), NOT screen-against-video: the
      // CPU draws each crystal onto a CLEARED (transparent) overlay canvas,
      // where its 'screen' blend runs against black and thus keeps the fill
      // SATURATED gold; that overlay is then source-over composited over the
      // video. Screen-blending the gold against the bright video backdrop
      // (the prior code) washes it toward white — the reported desaturation.
      float crystalAlpha = crystalAlphaBase * bodyCoverage;
      colorSRGB = mix(colorSRGB, crystalColor, crystalAlpha);

      // Sharp edge stroke along the straight polygon edge.
      float edgeCoverage = 1.0 - smoothstep(0.0, 1.5, abs(dist - facetR));
      vec3 edgeColor = vec3(255.0, 255.0, 200.0) / 255.0;
      colorSRGB = mix(colorSRGB, edgeColor, alpha * edgeCoverage);

      // Inner facet spokes (center -> 0.7*size toward each vertex).
      if (dist < seedSize * 0.7) {
        float spokeDist = min(facetFrac, 1.0 - facetFrac);
        float spokeCoverage = 1.0 - smoothstep(0.0, 0.06, spokeDist);
        vec3 spokeColor = vec3(255.0, 235.0, 150.0) / 255.0;
        colorSRGB = mix(colorSRGB, spokeColor, alpha * 0.3 * spokeCoverage);
      }
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandChiraliumParams {
  threshold: number
  density: number
  shimmer: number
  mix: number
}

export const DEFAULT_STRAND_CHIRALIUM_PARAMS: StrandChiraliumParams = {
  threshold: 0.7,
  density: 0.5,
  shimmer: 0.5,
  mix: 1,
}

export class StrandChiraliumEffect extends Effect {
  constructor(params: Partial<StrandChiraliumParams> = {}) {
    const p = { ...DEFAULT_STRAND_CHIRALIUM_PARAMS, ...params }

    super('StrandChiraliumEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['density', new THREE.Uniform(p.density)],
        ['shimmer', new THREE.Uniform(p.shimmer)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<StrandChiraliumParams>) {
    if (params.threshold !== undefined) {
      this.uniforms.get('threshold')!.value = params.threshold
    }
    if (params.density !== undefined) {
      this.uniforms.get('density')!.value = params.density
    }
    if (params.shimmer !== undefined) {
      this.uniforms.get('shimmer')!.value = params.shimmer
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
