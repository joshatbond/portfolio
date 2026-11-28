// The stack chips: their own colours, lit from above, catching the frame's
// cyan light on the faces turned toward it, and dimmed by the murky water as
// they sink. Rendered into their own target (alpha = coverage) and composited
// under the surface so the water refracts them.

export const chipVert = /* glsl */ `
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vColor = color;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

export const chipFrag = /* glsl */ `
uniform vec2 uHalf;
uniform float uFogDepth;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec3 n = normalize(vNormalW);
  vec3 col = vColor * (0.62 + 0.38 * max(n.z, 0.0));

  // The frame's LEDs: cyan on faces turned toward the nearest edge.
  vec2 p = vWorld.xy;
  vec4 d = vec4(uHalf.x - p.x, p.x + uHalf.x, uHalf.y - p.y, p.y + uHalf.y);
  float m = min(min(d.x, d.y), min(d.z, d.w));
  vec2 toEdge = m == d.x ? vec2(1.0, 0.0) : m == d.y ? vec2(-1.0, 0.0) : m == d.z ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
  float rim = exp(-max(m, 0.0) / 280.0) * max(dot(n.xy, toEdge), 0.0);
  col += vec3(0.133, 0.827, 0.933) * rim * 0.55;

  // Murky water: dimmer the deeper they sink.
  col *= exp(-max(-vWorld.z, 0.0) / uFogDepth);
  gl_FragColor = vec4(col, 1.0);
}
`

// Bubbles: soft, pale points, smaller and dimmer with depth, fading as they age.
export const bubbleVert = /* glsl */ `
attribute float aFade;
uniform float uSize;      // device px at the surface
uniform float uDistance;  // camera height above the surface
varying float vFade;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFade = aFade;
  gl_PointSize = uSize * uDistance / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

export const bubbleFrag = /* glsl */ `
varying float vFade;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float ring = smoothstep(1.0, 0.75, r) * (0.35 + 0.65 * smoothstep(0.35, 0.9, r));
  float a = ring * vFade;
  // Premultiplied, like the chips' target.
  gl_FragColor = vec4(vec3(0.75, 0.97, 1.0) * a, a);
}
`
