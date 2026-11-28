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
    desktop: { distance: 1240 },
    mobile: { distance: 865 },
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
    /**
     * A press or tap: one drop, a little wider than the trail's, whose ring
     * catches the lamp about as a stroke's wake does. A press, not a bright ring.
     */
    press: { radius: 0.02, strength: 0.004 },
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
    approach: 70,
    /** How quickly a speck takes up the water's motion (per s): its inertia. */
    drag: 1.2,
    /**
     * Stirring, faintly: within `radius` px of the pointer (seen at the
     * surface), shallow specks (falling off over `depth` px) ease toward the
     * stroke's direction at up to `max` px/s, taking it up at `rate` per s;
     * a press nudges them out at up to `burst` px/s. The current soon takes
     * them back.
     */
    stir: { radius: 130, depth: 160, max: 40, rate: 4, burst: 30 },
    /** Brightness in the dark, and in a lamp's full light. */
    dark: 0.06,
    lit: 5,
  },

  surface: {
    /** Screen-space refraction of everything below. */
    refract: 0.02,
    glint: { slope: [0.008, 0.04] as [number, number], strength: 0.55 },
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
     * Where they float with reduced motion (the Figma Still frames): the
     * chip's top-left in a 1440×900 (desktop) or 390×844 (mobile) frame,
     * scaled with the window. Which chips appear comes from site.stackChips;
     * phones show the ones in the mobile frame.
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
    /**
     * Reduced motion: they float still just under the surface, at the
     * positions above, rocked (degrees) and lifted a little each.
     */
    surfaceDepth: 14,
    bob: { amplitude: [2, 4], rock: 10 },
    /**
     * Swimming, like fish: in small schools, burst and glide. Each fish has
     * its own pace (px/s). A kick of about `kick.length` s takes it up to
     * `kick.boost`× its pace (each kick up to `kick.vary` stronger or
     * weaker); then it glides, coasting down toward `kick.drift`× its pace
     * (losing e⁻¹ of the difference every `kick.coast` s), until it kicks
     * again. A school's kicks come every `kick.glide` s, a new interval each
     * time; a fish on its own glides that long between its own.
     *
     * It turns on its kicks: quickly (`agility.kick` per s) toward where it
     * wants to go, swerving up to `swerve` rad off that (much less when it
     * follows its school), and climbing or diving at up to `climb` rad.
     * Gliding, it holds its line (`agility.glide`) and levels out (`level`
     * per s). Every fish keeps `separation` px from the others; nothing
     * roams more than `roam` (share of the window) past its edges.
     */
    swim: {
      pace: [60, 90] as [number, number],
      kick: { length: 0.28, boost: 2.8, vary: 0.25, glide: [1.4, 3.8] as [number, number], coast: 1, drift: 0.25 },
      agility: { kick: 12, glide: 0.35 },
      swerve: 0.6,
      climb: 0.75,
      level: 0.5,
      /**
       * The depths they range through (px below the surface), from just under
       * it down to deep in the dark, where they fade into the water. A school
       * (or a fish on its own) picks a new depth every `every` s, leaning
       * shallow (`bias`); while fewer than `visible` (share) of the other
       * fish are making for depths above `visibleDepth`, where they're plain
       * to see, the new depth is above it.
       */
      depth: {
        band: [15, 820] as [number, number],
        bias: 1.6,
        visibleDepth: 300,
        visible: 0.5,
        every: [5, 11] as [number, number],
      },
      /**
       * Small schools: they swim in `size` fish to a school and take in fish
       * up to `most`. A school kicks together, each fish `lag` s after the
       * one before; its fish swim its way (`align`) and
       * keep together (`cohere`, to its middle, per `cohesion` px off it).
       * Schools keep about `spacing` (share of the window's width) apart,
       * each heading (`travel`) for a spot in open water away from the
       * others, a new one when it gets there or every `wander` s. A
       * fish on its own (once a press has broken its school up) looks for
       * company after `regroup` s: it swims toward the nearest school with
       * room, or another fish on its own (kicking `chase`× as hard and as
       * often), and joins it within `join` px.
       */
      school: {
        size: [2, 4] as [number, number],
        most: 5,
        lag: [0.03, 0.1] as [number, number],
        align: 1,
        cohere: 1.4,
        cohesion: 220,
        spacing: 0.36,
        travel: 1.6,
        wander: [8, 16] as [number, number],
        regroup: [2, 4.5] as [number, number],
        join: 260,
        chase: 1.3,
      },
      separation: 110,
      roam: 0.12,
      /** How far the face turns toward where it's going, and banks per rad/s of turn (rad). */
      lean: 0.25,
      bank: 0.25,
      /** Fish this near the surface ripple it as they pass. */
      wake: { depth: 60, every: 0.3, radius: 0.012, strength: 0.00035 },
    },
    /**
     * Swimming in when the scene starts, over `stagger` s, a school at a
     * time: `behind` of them from behind the camera (past the window's top
     * and bottom, just under the surface, swimming away into the water),
     * `deep` rising out of the dark in front of it, and the rest from the
     * left and right, deeper. A school's fish keep within `spread` px of
     * each other and set off `follow` s apart.
     */
    arrive: {
      stagger: 3.5,
      behind: 2,
      deep: 1,
      spread: 48,
      follow: [0.08, 0.22] as [number, number],
      /**
       * They swim in this many times faster than their pace, from behind
       * faster still, turning toward their spot at `agility` per s and
       * closing on the depth they make for at `climb` (per s: from the sides,
       * from behind and from the deep), at most `max` px/s.
       */
      boost: 2,
      behindBoost: 2.6,
      agility: 1.4,
      climb: { side: 0.5, behind: 0.7, deep: 0.9, max: 700 },
      /** Where they start (px below the surface): from behind just under it, from the deep out of sight. */
      behindFrom: 18,
      deepFrom: 1800,
      /**
       * The depths (px) they make for, and how much deeper than that the ones
       * from the sides come in.
       */
      depth: {
        deep: [160, 260] as [number, number],
        behind: [240, 380] as [number, number],
        side: [140, 380] as [number, number],
        sideDrop: [60, 160] as [number, number],
      },
    },
    /**
     * A press breaks up every school whose middle is within `radius` px of
     * it, seen at the surface (each px of depth counting as `depth` px
     * further off), and startles fish on their own that near: each kicks
     * away, from the press and from its school's middle, at up to `speed`
     * px/s, diving about `dive` px, and glides on without turning back for
     * about `time` s; the shallow ones loose a few bubbles. Schools further
     * off carry on.
     */
    scatter: { radius: 200, depth: 0.35, speed: [480, 680] as [number, number], dive: 180, time: 1.1 },
    bubbles: {
      /** Up to this many from a startled fish, fewer the deeper it is, none below `from` px. */
      perDart: 6,
      from: 220,
      life: [0.6, 1.2] as [number, number],
      rise: [120, 240] as [number, number],
      /** Diameter just under the surface (CSS px); deeper bubbles look smaller. */
      size: 5,
    },
    /**
     * Murky water: chips dim by e⁻¹ every `fogDepth` px of depth and, below
     * the first `clearDepth` px, fade into the water's own light as fast.
     */
    fogDepth: 360,
    clearDepth: 60,
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
