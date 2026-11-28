/**
 * Every tunable for the homepage water scene, in one place.
 *
 * The scene: the viewport is a window looking out into the inky deep, like
 * a submersible's. Lamps behind the camera throw their light out into the
 * water, which carries on past every edge; the moving water at the window
 * bends it, and marine snow drifts through it.
 */
export const config = {
  view: {
    /** Camera distance above the water (px). The deep text shows at ~half scale. */
    desktop: { distance: 1240, nameDepth: 1100 },
    mobile: { distance: 865, nameDepth: 900 },
    /** Narrower than this uses the mobile view. */
    mobileBelow: 720,
    maxPixelRatio: 1.5,
  },

  water: {
    /** Sim cells along the longer side of the water (brief: 256). */
    cells: 256,
    /** The sim covers the frame plus this margin on every side, so ripples roll out of view. */
    margin: 0.125,
    /** Width of the absorbing border, as a fraction of the sim. */
    sponge: 0.06,
    damping: 0.995,
    stepsPerFrame: 2,
    /** Sim steps run on load so the water is already alive on the first frame. */
    prewarm: 400,
    /**
     * The broad swells that bend the light: the height blurred (taps every
     * `spacing` cells, so about 2·spacing cells wide), kept at 1/`downsample`
     * of the sim, and its curvature taken `stencil` texels apart. Ripples
     * smaller than this never focus the light.
     */
    swell: { spacing: 2, downsample: 4, stencil: 1.5 },
  },

  /** A tub is never glass-still: a constant, gentle stir. */
  stir: { every: 0.03, radius: [0.01, 0.022] as const, strength: 0.0012 },

  pointer: {
    trail: { radius: 0.014, maxStrength: 0.0016, spacing: 0.012 },
    press: { radius: 0.028, strength: 0.009 },
  },

  /**
   * The lamps, set back behind the camera and pointing the way it looks.
   * Each has a place over the water (0..1 across and down the window), how
   * far behind the camera it's set (px), and how strongly it lights the water
   * and the specks. `beam` is the radius at the surface (px) where its light
   * has fallen to half off its axis; `pool` cuts it to a cone instead (radii
   * at the surface: full strength within the first, gone past the second).
   */
  lamps: [
    // The main light: one lamp just behind the camera, a quarter of the way
    // up from the bottom.
    { at: [0.5, 0.75], behind: 120, water: 1.4, specks: 0.12, beam: 360 },
    // A dim cone around it: it barely shows in the water, but the specks
    // glint in it.
    { at: [0.5, 0.75], behind: 120, water: 0.05, specks: 1, pool: [420, 900] },
  ] as Lamp[],

  light: {
    /** Fraction of the device pixel size the light volume renders at (it's soft). */
    resolution: 0.25,
    /** Share of each new frame in the light (the rest is the running average). */
    temporalBlend: 0.12,
    /** Blur over the finished light, in light texels (×4 CSS px at full scale). */
    blur: 2.5,
    steps: { desktop: 24, mobile: 16 },
    /** How far into the deep the light is marched (px). */
    maxDepth: 1000,
    /**
     * Distances here and in `lamps` are for a window whose short side is
     * `referenceSide` px; they scale with the window, so phones get the same
     * picture, smaller.
     */
    referenceSide: 900,
    /**
     * How strongly the surface's broad swells bend the light: soft
     * brightening where they gather it and dimming where they spread it, at
     * most `lensMax`× either way.
     */
    lensGain: 1800,
    lensMax: 1.5,
    /** Light lost per px travelled through the water. */
    extinction: 1 / 230,
    intensity: 0.0012,
    /**
     * The murk: clouds in the water (about `scale` px across, drifting at
     * `drift` px/s) that thicken and thin the light by up to ±`amount`.
     * Without a lamp on it, it's all but black (`ambient`).
     */
    murk: { scale: 240, amount: 0.75, ambient: 0.18, drift: 6 },
  },

  /**
   * Marine snow: specks carried by the deep's currents (src/scene/flow.ts),
   * lit by the lamps they pass through and all but invisible outside them.
   * The view drifts slowly forward through them.
   */
  specks: {
    /** Specks per million CSS px of window. */
    density: 900,
    max: 1600,
    /** The layer they fill (px below the surface). */
    depth: [30, 950] as [number, number],
    /** Diameter (CSS px) just under the surface. */
    size: 3.5,
    /**
     * The currents: eddies `wavelength` px across, moving the water at about
     * `speed` px/s, each pattern giving way to the next over `turnover` s;
     * `lift` is the share that churns up and down.
     */
    current: { wavelength: [280, 720] as [number, number], speed: 14, turnover: 26, lift: 0.35 },
    /** Moving slowly forward: everything drifts toward the window (px/s). */
    approach: 16,
    /** How quickly a speck takes up the water's motion (per s): its inertia. */
    drag: 1.2,
    /**
     * Stirring: the pointer sweeps specks along within `radius` px (seen at
     * the surface), shallow ones most (falling off over `depth` px); a press
     * pushes them out at up to `burst` px/s.
     */
    stir: { radius: 170, depth: 320, sweep: 0.6, burst: 180 },
    /** Brightness in the dark, and in a lamp's full light. */
    dark: 0.06,
    lit: 5,
  },

  surface: {
    /** Screen-space refraction of everything below. */
    refract: 0.02,
    glint: { slope: [0.008, 0.04] as [number, number], midWater: 0.6, strength: 0.55 },
  },

  /** The name and title in the deep: pool/paint seen through the water. */
  abyss: {
    dim: 0.56,
    /**
     * The water thickens around the name and title: an ellipse around them
     * (padded by `pad` px, its edge softened over `feather` of its radius and
     * frayed by the murk) where the light falls to `floor` of its strength.
     * It keeps them at the contrast floor on phones, where the lamps' light
     * reaches the middle; wide windows barely need it.
     */
    pocket: {
      desktop: { pad: 0, feather: 1.2, floor: 0.6 },
      mobile: { pad: 0, feather: 0.6, floor: 0.25 },
    },
  },

  chips: {
    /**
     * Still positions from the Figma Still frames: the chip's top-left in a
     * 1440×900 (desktop) or 390×844 (mobile) frame. Positions scale with the
     * window. Which chips appear comes from site.stackChips; phones show the
     * ones in the mobile frame.
     */
    desktop: {
      frame: [1440, 900],
      at: {
        typescript: [178, 178], javascript: [438, 108], react: [688, 218], vue: [968, 128], nuxt: [1203, 268],
        nextjs: [268, 398], nodejs: [1118, 438], threejs: [513, 348], tailwindcss: [858, 358], vite: [173, 618],
        bun: [1223, 658], rive: [368, 758], convex: [1000, 770], tanstack: [1310, 110],
      },
    },
    mobile: {
      frame: [390, 844],
      at: {
        typescript: [40, 128], javascript: [268, 100], react: [163, 230], vue: [44, 320], nuxt: [286, 314],
        nodejs: [30, 746], tailwindcss: [298, 740], convex: [155, 112], tanstack: [165, 325],
      },
    },
    /** Chip edge length (px); the artwork is 64. */
    size: 64,
    /** Still: floating just under the surface. */
    surfaceDepth: 14,
    bob: { amplitude: [2, 4], period: [4, 6], rock: 10 },
    /** Still chips each send out a soft ripple this often (s). */
    ripple: { every: [1.6, 2.6], radius: 0.022, strength: 0.0005 },
    /** Pointer contact within this distance (px) makes a chip dive. */
    disturbRadius: 350,
    dive: { duration: [0.4, 0.7], bands: [160, 420], scatter: [220, 420], splash: 0.0028 },
    bubbles: {
      perDive: 10,
      life: [0.6, 1.2],
      rise: [120, 240],
      /** Diameter just under the surface (CSS px); deeper bubbles look smaller. */
      size: 5,
    },
    school: {
      speed: [130, 95],
      separation: 90,
      alignment: 220,
      cohesion: 260,
      /** How far past the frame the school may roam, as a fraction of it. */
      roam: 0.35,
      /** Extra clearance around the name column and the pills (px). */
      keepOut: 36,
    },
    /** With no input for this long (s), chips rise and bob again. */
    idle: 6,
    rise: { duration: [1.8, 2.6] },
    /** Murky water: chips dim by e⁻¹ every this many px of depth. */
    fogDepth: 360,
  },
} as const

export type SceneConfig = typeof config

export interface Lamp {
  at: readonly [number, number]
  behind: number
  water: number
  specks: number
  beam?: number
  pool?: readonly [number, number]
}
