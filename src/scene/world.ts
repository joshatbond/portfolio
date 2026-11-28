import { createWorld, type World } from 'bitecs'
import type { Texture, WebGLRenderer, WebGLRenderTarget } from 'three'
import type { FullscreenQuad } from './gpu'

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
  }
  /** Drops queued for the water this frame. */
  drops: Drop[]
  gpu: { renderer: WebGLRenderer; quad: FullscreenQuad }
  /** Published by the waves system. */
  water: { height: Texture | null; curvature: Texture | null; simScale: number }
  /** Published by the light system. */
  light: { target: WebGLRenderTarget | null }
}

export type SceneWorld = World<SceneContext>

/** One step of the frame. Systems may own GPU resources sized to the viewport. */
export interface System {
  /** (Re)creates anything sized to the viewport. Called on mount and resize. */
  resize?(world: SceneWorld): void
  update(world: SceneWorld): void
  dispose?(world: SceneWorld): void
}

export function createSceneWorld(gpu: SceneContext['gpu']): SceneWorld {
  return createWorld<SceneContext>({
    time: { delta: 0, elapsed: 0, then: performance.now() },
    viewport: { width: 1, height: 1, dpr: 1, mobile: false },
    view: { distance: 1240, nameDepth: 1100 },
    input: { moves: [], presses: [], last: null, lastAt: 0 },
    drops: [],
    gpu,
    water: { height: null, curvature: null, simScale: 1 },
    light: { target: null },
  })
}
