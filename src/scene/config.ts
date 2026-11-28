/**
 * Every tunable for the homepage water scene, in one place.
 *
 * The scene: the viewport is a window frame with LED strips built into it,
 * looking down into dark, murky water that carries on past every edge. The
 * LEDs' light falls into the water and is bent by the moving surface.
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
  },

  /** A tub is never glass-still: a constant, gentle stir. */
  stir: { every: 0.03, radius: [0.01, 0.022] as const, strength: 0.0012 },

  pointer: {
    trail: { radius: 0.014, maxStrength: 0.0016, spacing: 0.012 },
    press: { radius: 0.028, strength: 0.009 },
  },

  light: {
    /** Fraction of the device pixel size the light volume renders at (it's soft). */
    resolution: 0.5,
    /** Share of each new frame in the light (the rest is the running average). */
    temporalBlend: 0.12,
    steps: { desktop: 28, mobile: 20 },
    /** How far below the surface the volume is marched (px). */
    maxDepth: 1100,
    /**
     * Distances below are for a window whose short side is `referenceSide`
     * px; they scale with the window so the light keeps to the frame on phones.
     */
    referenceSide: 900,
    /** Only frame strips within this distance light a sample (px). */
    reach: 460,
    /** The LEDs sit this far above the water, in the frame (px). */
    ledHeight: 60,
    /** Higher aims the LEDs more steeply down. */
    lobe: 2,
    /** How strongly the surface's curvature focuses the light into beams. */
    lensGain: 260,
    /** Murky water: light lost per px travelled. Keeps the glow near the frame. */
    extinction: 1 / 95,
    /** Geometric spreading per px travelled. */
    falloff: 0.008,
    intensity: 0.0045,
  },

  surface: {
    /** Screen-space refraction of everything below. */
    refract: 0.02,
    /** How far in from the frame its reflections reach on the crests (px, by screen size). */
    edgeFalloff: { min: 48, max: 160, ofShortSide: 0.12 },
  },

  /** The name and title in the deep: pool/paint seen through the water. */
  abyss: { dim: 0.56 },
} as const

export type SceneConfig = typeof config
