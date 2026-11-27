// SPIKE (throwaway): water, caustics and rim shaders for the look test.
// Heightfield sim after Evan Wallace's WebGL Water: r = height, g = velocity,
// ba = surface normal (x, y).

export const quadVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const dropFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uCenter;   // sim uv
uniform float uRadius;  // in uv units of the shorter side
uniform float uStrength;
uniform vec2 uAspect;   // scales uv so drops stay round
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
  info.g *= uDamping;
  info.r += info.g;
  gl_FragColor = info;
}
`

export const normalFrag = /* glsl */ `
uniform sampler2D tSim;
uniform vec2 uDelta;
uniform vec2 uCell;   // world size of one sim cell (x, y)
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tSim, vUv);
  vec3 dx = vec3(uCell.x, texture2D(tSim, vec2(vUv.x + uDelta.x, vUv.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(tSim, vec2(vUv.x, vUv.y + uDelta.y)).r - info.r, uCell.y);
  vec3 n = normalize(cross(dy, dx));
  info.ba = n.xz;
  gl_FragColor = info;
}
`

// ----- Underwater: walls -----
export const wallVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying float vViewDist;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 view = viewMatrix * world;
  vViewDist = -view.z;
  gl_Position = projectionMatrix * view;
}
`

export const wallFrag = /* glsl */ `
uniform sampler2D tCaustics;
uniform sampler2D tSim;
uniform vec2 uHalf;        // half viewport size (world px)
uniform float uDepth;      // wall depth (world px)
uniform float uTime;
uniform float uCameraZ;
uniform vec3 uFog;
uniform float uFogDensity;
uniform float uEnergy;     // how stirred the water is (0..1)
varying vec3 vWorld;
varying float vViewDist;

void main() {
  float depth = clamp(-vWorld.z / uDepth, 0.0, 1.0);   // 0 at the rim, 1 at the far end
  bool side = abs(vWorld.x) > uHalf.x - 0.5;
  // Surface point above this bit of wall, pulled inward a little with depth:
  vec2 surf = vWorld.xy / (uHalf * 2.0) + 0.5;
  vec2 inward = normalize(-(surf - 0.5) + 1e-5);
  surf = clamp(surf + inward * depth * 0.06, 0.002, 0.998);
  vec4 info = texture2D(tSim, surf);
  vec2 n = info.ba;

  // Caustics tile at 512px, drifting slowly, refracted by the surface above.
  float along = side ? vWorld.y : vWorld.x;
  vec2 cuv = vec2(along, depth * uDepth) / 512.0;
  cuv += n * (0.25 + depth * 1.6);
  vec2 drift = vec2(uTime * 0.004, uTime * 0.007);
  float c1 = texture2D(tCaustics, cuv + drift).a;
  float c2 = texture2D(tCaustics, cuv * 1.37 - drift * 1.3 + 0.31).a;
  float caustic = c1 * 0.75 + c1 * c2 * 1.1;
  // Focusing: where the surface curves, the light bunches up.
  caustic *= 0.85 + clamp(-info.r * 14.0, -0.4, 1.4) * (0.4 + uEnergy);

  vec3 cyan = vec3(0.133, 0.827, 0.933);
  vec3 col = cyan * caustic * 0.55;

  // Rim light spilling down the wall.
  float rim = 0.5 * exp(-depth * 60.0) + 0.34 * exp(-depth * 18.0) + 0.12 * exp(-depth * 6.0);
  col += vec3(0.024, 0.714, 0.831) * rim;

  // Into black by ~45% depth, no floor.
  float fade = 1.0 - smoothstep(0.0, 0.45, depth);
  fade *= fade;
  col *= fade;

  float fog = 1.0 - exp(-pow(uFogDensity * max(vViewDist - uCameraZ, 0.0), 2.0));
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
}
`

// ----- Underwater: the name plane -----
export const nameFrag = /* glsl */ `
uniform sampler2D tName;
uniform float uDim;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(tName, vUv);
  // Seen through ~1100px of dark water: dimmed, alpha-blended over the deep.
  gl_FragColor = vec4(t.rgb * uDim, t.a);
}
`

export const nameVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// ----- The surface: refraction, reflections, rim -----
export const surfaceFrag = /* glsl */ `
uniform sampler2D tUnder;
uniform sampler2D tSim;
uniform vec2 uResolution;    // CSS px
uniform float uRefract;
uniform float uEdgeFalloff;  // px: how far in from the rim its reflections reach
uniform vec4 uPills[2];      // x, y, w, h in CSS px (top-left origin)
uniform float uTime;
varying vec2 vUv;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec4 info = texture2D(tSim, vUv);
  vec2 n = info.ba;
  float slope = length(n);

  // Refraction of everything below.
  vec2 uv = vUv + n * uRefract;
  vec3 col = texture2D(tUnder, uv).rgb;

  vec2 px = vUv * uResolution;            // y up
  float dEdge = min(min(px.x, uResolution.x - px.x), min(px.y, uResolution.y - px.y));

  // The rim reflects in wave crests as thin, broken streaks: brightest near
  // the edges, on slopes tilted toward an edge, nearly gone mid-pool. Each
  // edge contributes smoothly, so there's no seam where the nearest edge changes.
  vec2 nd = normalize(n + 1e-6);
  float lean = smoothstep(0.004, 0.03, slope);
  float streak = 0.0;
  streak += pow(max(0.0, -nd.x), 6.0) * exp(-px.x / uEdgeFalloff);
  streak += pow(max(0.0, nd.x), 6.0) * exp(-(uResolution.x - px.x) / uEdgeFalloff);
  streak += pow(max(0.0, -nd.y), 6.0) * exp(-px.y / uEdgeFalloff);
  streak += pow(max(0.0, nd.y), 6.0) * exp(-(uResolution.y - px.y) / uEdgeFalloff);
  col += vec3(0.40, 0.91, 0.98) * streak * lean * 1.35;

  // The pills, reflected and wobbling on the moving surface.
  for (int i = 0; i < 2; i++) {
    vec4 r = uPills[i];
    if (r.z <= 0.0) continue;
    vec2 c = vec2(r.x + r.z * 0.5, uResolution.y - (r.y + r.w * 0.5));
    vec2 p = px + n * 900.0 - c;
    float d = roundedBox(p, vec2(r.z, r.w) * 0.5 + 10.0, r.w * 0.5);
    float glint = (1.0 - smoothstep(-6.0, 6.0, d)) * smoothstep(0.006, 0.04, slope);
    col += vec3(0.13, 0.83, 0.93) * glint * 0.35;
  }

  // Thin specular glints on the steepest crests, fading out toward mid-pool.
  col += vec3(0.40, 0.91, 0.98) * smoothstep(0.08, 0.2, slope) * 0.07 * (0.2 + 0.8 * exp(-dEdge / 220.0));

  // The LED rim: a hot core along every edge and its glow (the only thing
  // that blooms).
  float core = 1.0 - smoothstep(1.0, 2.5, dEdge);
  float glow = 0.95 * exp(-dEdge / 3.0) + 0.45 * exp(-dEdge / 11.0) + 0.25 * exp(-dEdge / 30.0);
  col += vec3(0.65, 0.95, 0.99) * core * 0.95;
  col += vec3(0.024, 0.714, 0.831) * glow * 0.42;

  // Vignette.
  vec2 q = vUv - 0.5;
  col *= 1.0 - smoothstep(0.35, 0.75, length(q)) * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`
