import { lampsChunk } from './lamps'

// Marine snow: specks drifting and sinking through the deep. Each one's
// place comes from its seed and the time, so they move on the GPU alone;
// they wrap around out of sight (past the window's edge, or at the bottom
// and top of their layer, where they fade). Each is as bright as the lamps'
// light where it is.

export const specksVert = /* glsl */ `
${lampsChunk}
attribute vec4 aSeed;   // drift heading, drift speed, phase, size
uniform vec2 uBox;      // half the area they fill, at the surface (a margin past the window)
uniform vec2 uDepth;    // the layer they fill
uniform float uSink;
uniform float uSize;    // device px just under the surface
uniform vec2 uBright;   // in the dark, in full light
varying float vBright;

void main() {
  float t = uTime;
  float depth = uDepth.x + mod(position.z - uDepth.x + uSink * t, uDepth.y - uDepth.x);
  float k = (uCamZ + depth) / uCamZ;
  // Drift in the water; seen from above, deeper specks move less.
  vec2 drift = vec2(cos(aSeed.x), sin(aSeed.x)) * aSeed.y * t
             + 5.0 * vec2(sin(t * 0.21 + aSeed.z), cos(t * 0.17 + aSeed.z * 1.3));
  vec2 s = mod(position.xy + drift / k + uBox, 2.0 * uBox) - uBox;
  vec3 p = vec3(s * k, -depth);

  float l = 0.0;
  for (int j = 0; j < MAX_LAMPS; j++) {
    if (j >= uLampCount) break;
    vec2 entry;
    l += lampAt(j, p, entry) * uLamps[j].w;
  }
  float m = murk(p);
  float fade = smoothstep(uDepth.x, uDepth.x + 60.0, depth) * (1.0 - smoothstep(uDepth.y - 200.0, uDepth.y, depth));
  // Flakes turning as they drift: now and then one catches the light and
  // glints.
  float turn = pow(0.5 + 0.5 * sin(t * (0.5 + aSeed.w) + aSeed.z * 7.0), 14.0);
  vBright = (uBright.x + uBright.y * l * (0.2 + 2.2 * turn)) * pocket(s, m) * fade;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, uSize * aSeed.w * uCamZ / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

export const specksFrag = /* glsl */ `
varying float vBright;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.0) * vBright;
  // Added to what's behind (alpha stays 0, so the surface doesn't hide anything).
  gl_FragColor = vec4(vec3(0.62, 0.93, 0.97) * a, 0.0);
}
`
