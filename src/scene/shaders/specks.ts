import { lampsChunk } from './lamps'

// Marine snow: specks drifting through the deep, moved by the currents on
// the CPU (systems/specks.ts). Each is as bright as the lamps' light where
// it is, now and then glinting as it turns; it fades in from the dark at the
// bottom of its layer and out as it nears the window.

export const specksVert = /* glsl */ `
${lampsChunk}
attribute vec4 aSeed;   // -, -, phase, size
uniform vec2 uDepth;    // the layer they fill
uniform float uSize;    // device px just under the surface
uniform vec2 uBright;   // in the dark, in full light
varying float vBright;

void main() {
  vec3 p = position;
  float depth = -p.z;
  vec2 s = p.xy * uCamZ / (uCamZ + depth);  // where it shows, at the surface

  float l = 0.0;
  for (int j = 0; j < MAX_LAMPS; j++) {
    if (j >= uLampCount) break;
    vec2 entry;
    l += lampAt(j, p, entry) * uLamps[j].w;
  }
  float m = murk(p);
  float fade = smoothstep(uDepth.x, uDepth.x + 90.0, depth) * (1.0 - smoothstep(uDepth.y - 220.0, uDepth.y, depth));
  // Flakes turning as they drift: now and then one catches the light and
  // glints.
  float turn = pow(0.5 + 0.5 * sin(uTime * (0.5 + aSeed.w) + aSeed.z * 7.0), 14.0);
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
