#version 300 es
precision highp float;

uniform sampler2D u_source;
uniform float u_threshold;
uniform int u_mode;  // 0=brightness, 1=edge, 2=color
uniform vec3 u_targetColor;
uniform float u_colorRange;

in vec2 v_texCoord;
out vec4 fragColor;

float luminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

// Sobel edge detection
float sobelEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
  float tl = luminance(texture(tex, uv + vec2(-1, -1) * texelSize).rgb);
  float t  = luminance(texture(tex, uv + vec2( 0, -1) * texelSize).rgb);
  float tr = luminance(texture(tex, uv + vec2( 1, -1) * texelSize).rgb);
  float l  = luminance(texture(tex, uv + vec2(-1,  0) * texelSize).rgb);
  float r  = luminance(texture(tex, uv + vec2( 1,  0) * texelSize).rgb);
  float bl = luminance(texture(tex, uv + vec2(-1,  1) * texelSize).rgb);
  float b  = luminance(texture(tex, uv + vec2( 0,  1) * texelSize).rgb);
  float br = luminance(texture(tex, uv + vec2( 1,  1) * texelSize).rgb);

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  return sqrt(gx*gx + gy*gy);
}

void main() {
  vec4 color = texture(u_source, v_texCoord);
  float value = 0.0;

  if (u_mode == 0) {
    // Brightness threshold
    value = luminance(color.rgb);
  } else if (u_mode == 1) {
    // Edge detection
    vec2 texelSize = 1.0 / vec2(textureSize(u_source, 0));
    value = sobelEdge(u_source, v_texCoord, texelSize);
  } else if (u_mode == 2) {
    // Color matching
    vec3 diff = abs(color.rgb - u_targetColor);
    float dist = length(diff);
    value = 1.0 - smoothstep(0.0, u_colorRange, dist);
  }

  float binary = step(u_threshold, value);
  fragColor = vec4(binary, binary, binary, 1.0);
}
