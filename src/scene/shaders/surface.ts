// The water surface, seen from above: it refracts everything below, catches
// the frame's light on its crests, mirrors the pills as they wobble, and the
// LED strips glow along the frame itself.

export const surfaceFrag = /* glsl */ `
uniform sampler2D tUnder;
uniform sampler2D tChips;    // chips over transparent
uniform sampler2D tSim;
uniform float uSimScale;
uniform vec2 uResolution;    // CSS px
uniform float uRefract;
uniform float uEdgeFalloff;  // px: how far in from the frame its reflections reach
uniform vec4 uPills[2];      // x, y, w, h in CSS px (top-left origin)
uniform sampler2D tName;     // the name and title, drawn from the DOM
uniform vec4 uNameRect;      // where tName sits: x, y, w, h in CSS px (top-left origin)
uniform float uNameDim;
uniform float uLed;          // the frame's LEDs (off when capturing a still)
uniform vec4 uGlint;         // slope where glints start, slope where they're full, mid-water share, strength
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
  float dEdge = min(min(px.x, uResolution.x - px.x), min(px.y, uResolution.y - px.y));

  // The frame's LEDs, mirrored in the ripples: a ripple's side that faces a
  // strip catches a glint of it. Brightest near the frame, and faint all the
  // way across, so the open water still shows it's moving.
  vec2 nd = normalize(n + 1e-6);
  float lean = smoothstep(uGlint.x, uGlint.y, slope);
  float facing = 0.0;
  facing += pow(max(0.0, -nd.x), 4.0) * (uGlint.z + exp(-px.x / uEdgeFalloff));
  facing += pow(max(0.0, nd.x), 4.0) * (uGlint.z + exp(-(uResolution.x - px.x) / uEdgeFalloff));
  facing += pow(max(0.0, -nd.y), 4.0) * (uGlint.z + exp(-px.y / uEdgeFalloff));
  facing += pow(max(0.0, nd.y), 4.0) * (uGlint.z + exp(-(uResolution.y - px.y) / uEdgeFalloff));
  col += vec3(0.40, 0.91, 0.98) * facing * lean * uGlint.w;

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


  // The LED strips in the frame: a hot core and its glow.
  float core = 1.0 - smoothstep(1.0, 2.5, dEdge);
  float glow = 0.95 * exp(-dEdge / 3.0) + 0.45 * exp(-dEdge / 11.0) + 0.25 * exp(-dEdge / 30.0);
  col += vec3(0.65, 0.95, 0.99) * core * 0.95 * uLed;
  col += vec3(0.024, 0.714, 0.831) * glow * 0.42 * uLed;

  vec2 q = vUv - 0.5;
  col *= 1.0 - smoothstep(0.35, 0.75, length(q)) * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`
