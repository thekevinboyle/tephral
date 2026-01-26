uniform sampler2D tDiffuse;
uniform float lineCount;
uniform float lineOpacity;
uniform float lineFlicker;
uniform float time;

varying vec2 vUv;

float random(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  float linePos = mod(vUv.y * lineCount, 1.0);
  float scanLine = step(0.5, linePos);
  float flicker = 1.0 - lineFlicker * random(floor(time * 30.0) + floor(vUv.y * lineCount));
  float darkness = mix(1.0, 1.0 - lineOpacity, scanLine) * flicker;

  gl_FragColor = vec4(color.rgb * darkness, color.a);
}
