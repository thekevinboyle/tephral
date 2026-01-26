uniform sampler2D tDiffuse;
uniform vec2 redOffset;
uniform vec2 greenOffset;
uniform vec2 blueOffset;
uniform float amount;

varying vec2 vUv;

void main() {
  vec2 rUv = vUv + redOffset * amount;
  vec2 gUv = vUv + greenOffset * amount;
  vec2 bUv = vUv + blueOffset * amount;

  float r = texture2D(tDiffuse, rUv).r;
  float g = texture2D(tDiffuse, gUv).g;
  float b = texture2D(tDiffuse, bUv).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
