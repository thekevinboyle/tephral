// GLSL shared by the SEG effects. The mask texture stores class IDs
// (0 bg, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others) with row 0
// at the image TOP, so v is flipped when sampling.
export const SEG_MASK_GLSL = /* glsl */ `
uniform sampler2D segMask;
uniform float hasMask;

float segClass(vec2 uv) {
  return floor(texture2D(segMask, vec2(uv.x, 1.0 - uv.y)).r * 255.0 + 0.5);
}

// sel: 0 person, 1 skin, 2 hair, 3 clothes
float segSelected(float c, int sel) {
  if (sel == 1) return (c == 2.0 || c == 3.0) ? 1.0 : 0.0;
  if (sel == 2) return c == 1.0 ? 1.0 : 0.0;
  if (sel == 3) return c == 4.0 ? 1.0 : 0.0;
  return c > 0.5 ? 1.0 : 0.0;
}
`

/** Seconds per auto-trigger at a BPM, never shorter than 0.2 s. */
export function beatsToSeconds(beats: number, bpm: number): number {
  const safeBpm = Math.min(300, Math.max(20, bpm || 120))
  return Math.max(0.2, (Math.max(1, beats) * 60) / safeBpm)
}
