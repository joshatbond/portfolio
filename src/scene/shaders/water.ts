// Heightfield water after Evan Wallace's WebGL Water.
// Sim texels: r = height, g = velocity, ba = surface normal (x, y).

export const dropFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uCenter;   // sim uv
uniform float uRadius;  // in uv of the longer side
uniform float uStrength;
uniform vec2 uAspect;   // keeps drops round on a non-square sim
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tSim, vUv);
  float d = length((uCenter - vUv) * uAspect) / uRadius;
  float drop = max(0.0, 1.0 - d);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  info.r += drop * uStrength;
  gl_FragColor = info;
}
`

export const updateFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uDelta;
uniform float uDamping;
uniform float uSponge;  // absorbing border width, in uv
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tSim, vUv);
  vec2 dx = vec2(uDelta.x, 0.0);
  vec2 dy = vec2(0.0, uDelta.y);
  float average = (
    texture2D(tSim, vUv - dx).r +
    texture2D(tSim, vUv - dy).r +
    texture2D(tSim, vUv + dx).r +
    texture2D(tSim, vUv + dy).r
  ) * 0.25;
  info.g += (average - info.r) * 2.0;
  // The water carries on past the frame: waves fade out in a border instead
  // of bouncing back.
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  info.g *= uDamping * mix(0.82, 1.0, smoothstep(0.0, uSponge, edge));
  info.r += info.g;
  info.r *= mix(0.9, 1.0, smoothstep(0.0, uSponge, edge));
  gl_FragColor = info;
}
`

export const normalFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uDelta;
uniform vec2 uCell;   // size of one cell, in sim units
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tSim, vUv);
  vec3 dx = vec3(uCell.x, texture2D(tSim, vec2(vUv.x + uDelta.x, vUv.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(tSim, vec2(vUv.x, vUv.y + uDelta.y)).r - info.r, uCell.y);
  info.ba = normalize(cross(dy, dx)).xz;
  gl_FragColor = info;
}
`

/** Curvature (Laplacian) of the surface: how it focuses or spreads light. */
export const curvatureFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uDelta;
varying vec2 vUv;
float h(vec2 uv) { return texture2D(tSim, uv).r; }
void main() {
  vec2 dx = vec2(uDelta.x, 0.0);
  vec2 dy = vec2(0.0, uDelta.y);
  float lap = h(vUv + dx) + h(vUv - dx) + h(vUv + dy) + h(vUv - dy) - 4.0 * h(vUv);
  gl_FragColor = vec4(lap, 0.0, 0.0, 1.0);
}
`
