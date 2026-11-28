// The lamps behind the camera and the murky water they light, shared by
// everything that's lit by them: the light in the water (shaders/light.ts)
// and the specks drifting through it (shaders/specks.ts). World px: x right,
// y up, z up from the surface (the deep is z < 0); the camera hangs above
// the middle of the window at z = uCamZ.

export const MAX_LAMPS = 8

export const lampsChunk = /* glsl */ `
#define MAX_LAMPS ${MAX_LAMPS}
uniform vec4 uLamps[MAX_LAMPS];     // x, y (over the water), strength in the water, on the specks
uniform vec4 uLampShape[MAX_LAMPS]; // cone: cos of its outer, inner half-angles (< -1: none); beam: cosⁿ's n (0: none); height
uniform int uLampCount;
uniform float uExtinction;
uniform vec2 uHalf;                 // half the window
uniform float uCamZ;
uniform float uTime;
uniform vec4 uMurk;                 // 1 / scale, amount, ambient, drift (px/s)
uniform vec4 uPocket;               // around the text, at the surface: centre x, y, radius x, y
uniform float uPocketFeather;       // fraction of the radius its edge fades over
uniform float uPocketFloor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

// Clouds of murk at p, 0..1, slowly drifting; depth shifts the pattern a
// little, so the clouds have body but keep their shape seen from above.
float murk(vec3 p) {
  vec2 q = (p.xy + p.z * vec2(0.16, -0.11)) * uMurk.x;
  vec2 d = vec2(uTime * uMurk.w * uMurk.x);
  return 0.55 * noise(q + d * vec2(1.0, 0.6))
       + 0.30 * noise(q * 2.03 + d * vec2(-0.8, 1.1) + 7.3)
       + 0.15 * noise(q * 4.11 + d * vec2(1.3, -0.9) + 13.7);
}

// Lamp i's light reaching p (before the murk and the lamp's strength), and
// where it crossed the surface on the way. Each lamp points straight down,
// the way the camera looks. Its light is as it reaches the surface on its
// axis; off the axis its beam fades, and below the surface it spreads (as
// the square of the distance from the lamp) and the water swallows it.
float lampAt(int i, vec3 p, out vec2 entry) {
  vec4 shape = uLampShape[i];
  vec3 o = vec3(uLamps[i].xy, shape.w);
  vec3 v = p - o;
  float d = length(v);
  float c = -v.z / d;
  float beam = shape.x < -1.0 ? 1.0 : smoothstep(shape.x, shape.y, c);
  if (shape.z > 0.0) beam *= pow(c, shape.z);
  float k = shape.w / (shape.w - p.z);
  entry = o.xy + v.xy * k;
  float water = d * (1.0 - k);
  return beam * k * k * exp(-uExtinction * water);
}

// How much of the lamps' light is let through around the name and title:
// the water there thickens, in an ellipse frayed by the murk (only ever
// outward, so the text always sits inside it).
float pocket(vec2 s, float m) {
  if (uPocket.z <= 0.0) return 1.0;
  float d = length((s - uPocket.xy) / uPocket.zw) - m * 0.35;
  return mix(uPocketFloor, 1.0, smoothstep(1.0, 1.0 + uPocketFeather, d));
}
`
