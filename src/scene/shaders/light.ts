import { lampsChunk } from './lamps'

// The lamps' light in the deep, marched along each view ray. The murk
// scatters a little of it toward the window at every step, thicker in its
// drifting clouds, and swallows it with distance. On the way in, the light
// crossed the surface, whose broad swells gather it into soft brightenings
// or spread it thin.

export const lightFrag = /* glsl */ `
${lampsChunk}
uniform sampler2D tCurv;      // curvature of the surface's swells
uniform sampler2D tPrev;      // last frame's result: the light settles over a few frames
uniform float uBlend;         // share of this frame in the result
uniform float uSimScale;      // window size / sim size
uniform float uMaxDepth;
uniform float uLensGain;
uniform float uLensMax;
uniform float uIntensity;
uniform float uSeed;
varying vec2 vUv;

#ifndef STEPS
#define STEPS 24
#endif

// How the swells where the light came through gather or spread it.
float lens(vec2 entry) {
  vec2 uv = entry / (uHalf * 2.0) * uSimScale + 0.5;
  float lap = texture2D(tCurv, uv).r;
  return pow(uLensMax, tanh(-lap * uLensGain));
}

void main() {
  vec2 s = (vUv - 0.5) * 2.0 * uHalf;   // the surface under this pixel
  vec3 rd = normalize(vec3(s, -uCamZ)); // the view ray carries on below the surface
  float tMax = uMaxDepth / -rd.z;
  float dt = tMax / float(STEPS);
  float t = dt * hash12(gl_FragCoord.xy + uSeed);
  float light = 0.0;
  float haze = 0.0;
  for (int i = 0; i < STEPS; i++) {
    vec3 p = vec3(s, 0.0) + rd * t;
    float l = 0.0;
    for (int j = 0; j < MAX_LAMPS; j++) {
      if (j >= uLampCount) break;
      if (uLamps[j].z <= 0.0) continue;
      vec2 entry;
      float a = lampAt(j, p, entry) * uLamps[j].z;
      if (a > 1e-4) l += a * lens(entry);
    }
    float m = murk(p);
    light += l * (1.0 + (m - 0.5) * 2.0 * uMurk.y) * dt;
    haze += m;
    t += dt;
  }
  haze /= float(STEPS);
  light *= pocket(s, haze);
  vec3 col = vec3(0.133, 0.827, 0.933) * light * uIntensity;
  // The murk with no lamp on it: all but black.
  col += vec3(0.010, 0.045, 0.052) * uMurk.z * haze;

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
