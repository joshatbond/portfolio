import { lampsChunk } from './lamps'

// The water at the window: it refracts everything beyond it, catches the
// lamps' light on its ripples and mirrors the pills as they wobble.

export const surfaceFrag = /* glsl */ `
${lampsChunk}
uniform sampler2D tUnder;
uniform sampler2D tChips;    // chips over transparent
uniform sampler2D tSim;
uniform float uSimScale;
uniform vec2 uResolution;    // CSS px
uniform float uRefract;
uniform vec4 uPills[2];      // x, y, w, h in CSS px (top-left origin)
uniform sampler2D tName;     // the name and title, drawn from the DOM
uniform vec4 uNameRect;      // where tName sits: x, y, w, h in CSS px (top-left origin)
uniform float uNameDim;
uniform vec4 uGlint;         // slope where glints start, slope where they're full, -, strength
varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec4 info = texture2D(tSim, (vUv - 0.5) * uSimScale + 0.5);
  vec2 n = info.ba;
  float slope = length(n);

  vec2 bent = vUv + n * uRefract;
  vec3 col = texture2D(tUnder, bent).rgb;
  // How lit the water is here (by the lamps; the murk alone barely counts).
  float lit = smoothstep(0.01, 0.18, dot(col, vec3(0.25, 0.65, 0.1)));
  // The name and title, deep below: the camera never moves, so they sit
  // right where the page lays them out, bent by the surface like the light.
  if (uNameRect.z > 0.0) {
    vec2 nuv = (vec2(bent.x, 1.0 - bent.y) * uResolution - uNameRect.xy) / uNameRect.zw;
    if (nuv.x >= 0.0 && nuv.y >= 0.0 && nuv.x <= 1.0 && nuv.y <= 1.0) {
      vec4 t = texture2D(tName, vec2(nuv.x, 1.0 - nuv.y));
      col += t.rgb * t.a * uNameDim;
    }
  }
  // The chips, in the water, refracted like everything else below.
  // Premultiplied: opaque chips replace what's behind; bubbles and the
  // chips' antialiased edges blend.
  vec4 chip = texture2D(tChips, vUv + n * uRefract * 1.2);
  col = col * (1.0 - chip.a) + chip.rgb;

  vec2 px = vUv * uResolution;  // y up

  // The lamps glinting on the ripples: where a lamp lights the water, a
  // ripple's side that faces it catches a glint. In the dark, nothing.
  vec2 nd = normalize(n + 1e-6);
  vec2 s = px - uResolution * 0.5;  // world px at the surface
  float facing = 0.0;
  for (int j = 0; j < MAX_LAMPS; j++) {
    if (j >= uLampCount) break;
    vec2 toLamp = normalize(uLamps[j].xy - s + 1e-3);
    facing = max(facing, pow(max(0.0, dot(nd, toLamp)), 4.0) * min(1.0, uLamps[j].z));
  }
  col += vec3(0.40, 0.91, 0.98) * facing * lit * smoothstep(uGlint.x, uGlint.y, slope) * uGlint.w;

  // The pills, mirrored and wobbling on moving water.
  for (int i = 0; i < 2; i++) {
    vec4 r = uPills[i];
    if (r.z <= 0.0) continue;
    vec2 c = vec2(r.x + r.z * 0.5, uResolution.y - (r.y + r.w * 0.5));
    vec2 p = px + n * 900.0 - c;
    float d = roundedBox(p, vec2(r.z, r.w) * 0.5 + 10.0, r.w * 0.5);
    float glint = (1.0 - smoothstep(-6.0, 6.0, d)) * smoothstep(0.006, 0.04, slope);
    col += vec3(0.13, 0.83, 0.93) * glint * 0.35;
  }

  vec2 q = vUv - 0.5;
  col *= 1.0 - smoothstep(0.35, 0.75, length(q)) * 0.4;

  // Dithered, so the dark water's long, faint gradients don't band.
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`
