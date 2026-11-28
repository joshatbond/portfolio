// The frame LEDs' light falling into murky water, marched along each view
// ray. Light from a strip enters the water just inside the frame, where the
// surface acts as a lens: crests focus it into beams, troughs spread it, and
// the further it travels the stronger that gets. Murky water scatters a little
// of it toward the camera at every step, and swallows it with distance.
// The deep text hangs at its own depth behind the light.

export const lightFrag = /* glsl */ `
uniform sampler2D tCurv;
uniform sampler2D tPrev;      // last frame's result: the light settles over a few frames
uniform float uBlend;         // share of this frame in the result
uniform sampler2D tName;
uniform vec4 uNameRect;     // name plane, world px: min x, min y, max x, max y
uniform float uNameDepth;
uniform float uNameDim;
uniform vec2 uHalf;         // half the frame, world px
uniform float uSimScale;    // frame size / sim size
uniform float uCamZ;
uniform float uMaxDepth;
uniform float uReach;
uniform float uLedHeight;
uniform float uLobe;
uniform float uLensGain;
uniform float uExtinction;
uniform float uFalloff;
uniform float uIntensity;
uniform float uSeed;
varying vec2 vUv;

#ifndef STEPS
#define STEPS 28
#endif

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Focusing of the surface where the light came through.
float lens(vec2 entry, float water) {
  vec2 uv = entry / (uHalf * 2.0) * uSimScale + 0.5;
  float lap = texture2D(tCurv, uv).r;
  float spread = 1.0 + lap * uLensGain * water;
  return pow(clamp(1.0 / max(abs(spread), 0.08), 0.0, 6.0), 1.3);
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
  return lobe * lens(entry, water) * exp(-uExtinction * water) / (1.0 + water * uFalloff);
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
  vec3 col = vec3(0.133, 0.827, 0.933) * light * uIntensity;

  // The name and title, deep in the water, behind the light.
  float tn = uNameDepth / -rd.z;
  vec2 pn = (ro + rd * tn).xy;
  vec2 nuv = (pn - uNameRect.xy) / (uNameRect.zw - uNameRect.xy);
  if (nuv.x >= 0.0 && nuv.y >= 0.0 && nuv.x <= 1.0 && nuv.y <= 1.0) {
    vec4 n = texture2D(tName, nuv);
    col += n.rgb * n.a * uNameDim;
  }
  // The camera never moves, so averaging over frames turns the march's
  // jitter into a clean, softly moving light.
  gl_FragColor = vec4(mix(texture2D(tPrev, vUv).rgb, col, uBlend), 1.0);
}
`
