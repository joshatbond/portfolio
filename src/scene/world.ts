import { createWorld, type World } from 'bitecs'
import type { Texture, WebGLRenderer, WebGLRenderTarget } from 'three'
import type { FullscreenQuad } from './gpu'
import * as components from './chips/components'

/** A disturbance for the water sim, in screen uv (0..1, y up). */
export interface Drop {
  x: number
  y: number
  radius: number
  strength: number
}

export interface SceneContext {
  time: { delta: number; elapsed: number; then: number }
  viewport: { width: number; height: number; dpr: number; mobile: boolean }
  /** Camera distance and the depth of the deep text, for this viewport. */
  view: { distance: number; nameDepth: number }
  input: {
    /** Pointer positions since the last frame, in screen uv. */
    moves: { x: number; y: number }[]
    presses: { x: number; y: number }[]
    last: { x: number; y: number } | null
    lastAt: number
    /** Where the pointer touched the water this frame (world px at the surface), if it did. */
    contact: { x: number; y: number } | null
  }
  /** Screen areas chips steer around (world px at the surface, y up): the name column and the pills. */
  keepOut: { x0: number; y0: number; x1: number; y1: number }[]
  /** Drops queued for the water this frame. */
  drops: Drop[]
  gpu: { renderer: WebGLRenderer; quad: FullscreenQuad }
  /** Published by the waves system. */
  water: { height: Texture | null; curvature: Texture | null; simScale: number }
  /** Published by the light system. */
  light: { target: WebGLRenderTarget | null }
  /** Published by the chip renderer: chips over transparent, for the surface to composite. */
  chips: { target: WebGLRenderTarget | null }
  /** Chip components, registered with the world. */
  components: typeof components
  /** Rendering a still to save or compare: what to leave out. */
  capture: Capture | null
  /** Reduced motion: time stands still; the water and chips don't move. */
  frozen: boolean
  /** The element the scene fills; DOM positions are measured against it. */
  container: HTMLElement
}

export interface Capture {
  chips: boolean
  /** The name and title in the deep. */
  name: boolean
  /** false: only the name and title's glow, not their letters (to measure what they're read against). */
  glyphs: boolean
  /** The frame's LED strips. */
  led: boolean
}

/** An element's box relative to the scene's container, in CSS px (top-left origin). */
export function localRect(world: { container: HTMLElement }, el: Element) {
  const c = world.container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return new DOMRect(r.left - c.left, r.top - c.top, r.width, r.height)
}

export type SceneWorld = World<SceneContext>

/** One step of the frame. Systems may own GPU resources sized to the viewport. */
export interface System {
  /** (Re)creates anything sized to the viewport. Called on mount and resize. */
  resize?(world: SceneWorld): void
  update(world: SceneWorld): void
  dispose?(world: SceneWorld): void
}

export function createSceneWorld(
  gpu: SceneContext['gpu'],
  container: HTMLElement,
  { capture = null, frozen = false }: { capture?: Capture | null; frozen?: boolean } = {},
): SceneWorld {
  return createWorld<SceneContext>({
    time: { delta: 0, elapsed: 0, then: performance.now() },
    viewport: { width: 1, height: 1, dpr: 1, mobile: false },
    view: { distance: 1240, nameDepth: 1100 },
    input: { moves: [], presses: [], last: null, lastAt: 0, contact: null },
    keepOut: [],
    drops: [],
    gpu,
    water: { height: null, curvature: null, simScale: 1 },
    light: { target: null },
    chips: { target: null },
    components,
    capture,
    frozen,
    container,
  })
}
