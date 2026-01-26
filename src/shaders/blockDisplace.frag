uniform sampler2D tDiffuse;
uniform float blockSize;
uniform float displaceChance;
uniform float displaceDistance;
uniform float time;
uniform float seed;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 blockCoord = floor(vUv / blockSize) * blockSize;
  float rand = random(blockCoord + seed + floor(time * 10.0));

  vec2 uv = vUv;

  if (rand < displaceChance) {
    float displaceX = (random(blockCoord + 0.1 + seed) - 0.5) * 2.0 * displaceDistance;
    float displaceY = (random(blockCoord + 0.2 + seed) - 0.5) * 2.0 * displaceDistance;
    uv += vec2(displaceX, displaceY);
  }

  gl_FragColor = texture2D(tDiffuse, uv);
}
