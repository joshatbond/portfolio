// The frame LEDs' light falling into murky water, marched along each view
// ray through the top few hundred px of it. Light from a strip enters the
// water just inside the frame, where the surface's broad swells gather it
// into soft brightenings or spread it thin. The murk scatters a little of it
// toward the camera at every step and swallows it with distance; drifting
// clouds of it thicken and thin the glow, and are faintly lit everywhere.
// Around the name and title the water thickens, so they stay readable.

export const lightFrag = /* glsl */ `
uniform sampler2D tCurv;      // curvature of the surface's swells
uniform sampler2D tPrev;      // last frame's result: the light settles over a few frames
uniform float uBlend;         // share of this frame in the result
uniform vec4 uPocket;         // around the text, world px at the surface: centre x, y, radius x, y
uniform float uPocketFeather; // fraction of the radius the edge fades over
uniform float uPocketFloor;
uniform vec2 uHalf;           // half the frame, world px
uniform float uSimScale;      // frame size / sim size
uniform float uCamZ;
uniform float uMaxDepth;
uniform float uReach;
uniform float uLedHeight;
uniform float uLobe;
uniform float uLensGain;
uniform float uLensMax;
uniform float uExtinction;
uniform float uFalloff;
uniform float uIntensity;
uniform float uSeed;
uniform float uTime;
uniform vec4 uMurk;           // 1 / scale (px), amount, ambient, drift (px/s)
varying vec2 vUv;

#ifndef STEPS
#define STEPS 14
#endif

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

// Clouds of murk, 0..1, each layer drifting its own way.
float murk(vec2 p) {
  vec2 q = p * uMurk.x;
  vec2 d = vec2(uTime * uMurk.w * uMurk.x);
  return 0.55 * noise(q + d * vec2(1.0, 0.6))
       + 0.30 * noise(q * 2.03 + d * vec2(-0.8, 1.1) + 7.3)
       + 0.15 * noise(q * 4.11 + d * vec2(1.3, -0.9) + 13.7);
}

// How the swells where the light came through gather or spread it.
float lens(vec2 entry) {
  vec2 uv = entry / (uHalf * 2.0) * uSimScale + 0.5;
  float lap = texture2D(tCurv, uv).r;
  return pow(uLensMax, tanh(-lap * uLensGain));
}

// Light from one strip of the frame reaching p. A strip runs along the x edge
// (axis 0, at x = side * uHalf.x) or the y edge (axis 1).
float strip(vec3 p, float side, int axis) {
  vec3 q = axis == 0
    ? vec3(side * uHalf.x, clamp(p.y, -uHalf.y, uHalf.y), uLedHeight)
    : vec3(clamp(p.x, -uHalf.x, uHalf.x), side * uHalf.y, uLedHeight);
  vec3 v = p - q;
  float d = length(v);
  float lobe = pow(max(-v.z / d, 0.0), uLobe);
  float depth = -p.z;
  float k = uLedHeight / (uLedHeight + depth);  // where the ray crosses the surface
  vec2 entry = q.xy + v.xy * k;
  float water = d * (1.0 - k);
  return lobe * lens(entry) * exp(-uExtinction * water) / (1.0 + water * uFalloff);
}

void main() {
  vec2 s = (vUv - 0.5) * 2.0 * uHalf;   // the surface under this pixel
  vec3 ro = vec3(s, 0.0);
  vec3 rd = normalize(vec3(s, -uCamZ)); // the view ray carries on below the surface
  float tMax = uMaxDepth / -rd.z;
  float dt = tMax / float(STEPS);
  float t = dt * hash12(gl_FragCoord.xy + uSeed);
  float light = 0.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = ro + rd * t;
    float l = 0.0;
    if (abs(uHalf.x - p.x) < uReach) l += strip(p, 1.0, 0);
    if (abs(p.x + uHalf.x) < uReach) l += strip(p, -1.0, 0);
    if (abs(uHalf.y - p.y) < uReach) l += strip(p, 1.0, 1);
    if (abs(p.y + uHalf.y) < uReach) l += strip(p, -1.0, 1);
    light += l * dt;
    t += dt;
  }
  float m = murk(s);
  light *= 1.0 + (m - 0.5) * 2.0 * uMurk.y;
  // The frame's light thins out around the text: an ellipse, frayed by the
  // murk (only ever outward, so the text always sits inside it).
  if (uPocket.z > 0.0) {
    float d = length((s - uPocket.xy) / uPocket.zw) - m * 0.35;
    light *= mix(uPocketFloor, 1.0, smoothstep(1.0, 1.0 + uPocketFeather, d));
  }
  vec3 col = vec3(0.133, 0.827, 0.933) * light * uIntensity;
  // The murk itself, faintly lit: the water never goes dead black.
  col += vec3(0.010, 0.045, 0.052) * uMurk.z * (0.4 + m);

  // The camera never moves, so averaging over frames turns the march's
  // jitter into a clean, softly moving light.
  gl_FragColor = vec4(mix(texture2D(tPrev, vUv).rgb, col, uBlend), 1.0);
}
`

/** One direction of a soft Gaussian blur over the finished light. */
export const lightBlurFrag = /* glsl */ `
uniform sampler2D tLight;
uniform vec2 uStep;   // uv between taps
varying vec2 vUv;
void main() {
  vec3 c = vec3(0.0);
  float w = 0.0;
  for (int i = -4; i <= 4; i++) {
    float k = exp(-float(i * i) / 8.0);
    c += texture2D(tLight, vUv + uStep * float(i)).rgb * k;
    w += k;
  }
  gl_FragColor = vec4(c / w, 1.0);
}
`
