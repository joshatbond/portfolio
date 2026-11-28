import { WebGLRenderer } from 'three'
import { config } from './config'
import { FullscreenQuad } from './gpu'
import { seedRandom } from './random'
import { chipRenderSystem } from './systems/chipRender'
import { chipsSystem } from './systems/chips'
import { inputSystem } from './systems/input'
import { lightSystem } from './systems/light'
import { specksSystem } from './systems/specks'
import { stirSystem } from './systems/stir'
import { surfaceSystem } from './systems/surface'
import { timeSystem } from './systems/time'
import { wavesSystem } from './systems/waves'
import { createSceneWorld, type Capture, type System } from './world'

export interface SceneOptions {
  /**
   * false (prefers-reduced-motion): a still. Time stands still, the chips sit
   * at home and the water holds the shape it warmed up to; only the light
   * settles before the one frame is shown. It renders again on resize, and
   * the loop never runs.
   */
  motion?: boolean
  /**
   * Render a still to save or compare (scripts/render-pool-still.mjs,
   * scripts/check-scene-text.mjs), leaving out what's set to false.
   */
  capture?: Partial<Capture>
}

/** Stills draw the same water every time. */
const STILL_SEED = 20261127
/** Frames for a still's light to settle (it averages the march's jitter). */
const STILL_FRAMES = 24

/**
 * Mounts the homepage water into `container` and returns a function that
 * tears it down. Systems run in this order every frame. If the GPU drops
 * the context, the scene tears itself down and the page's still and DOM
 * text show again.
 */
export function mountScene(container: HTMLElement, { motion = true, capture }: SceneOptions = {}): () => void {
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
  const dpr = Math.min(devicePixelRatio, config.view.maxPixelRatio)
  renderer.setPixelRatio(dpr)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)

  const frozen = !motion || Boolean(capture)
  const world = createSceneWorld({ renderer, quad: new FullscreenQuad() }, container, {
    capture: capture ? { chips: true, name: true, glyphs: true, led: true, ...capture } : null,
    frozen,
  })
  const systems: System[] = [
    timeSystem(),
    ...(frozen ? [] : [inputSystem()]),
    chipsSystem(),
    ...(frozen ? [] : [stirSystem()]),
    wavesSystem(),
    lightSystem(),
    specksSystem(),
    chipRenderSystem(),
    surfaceSystem(),
  ]

  /** Re-sizes everything for the container; false when nothing changed. */
  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === world.viewport.width && height === world.viewport.height) return false
    const mobile = width < config.view.mobileBelow
    world.viewport = { width, height, dpr, mobile }
    world.view = { ...(mobile ? config.view.mobile : config.view.desktop) }
    renderer.setSize(width, height, false)
    // A still's water and chips come out the same at every size.
    if (frozen) seedRandom(STILL_SEED)
    for (const s of systems) s.resize?.(world)
    return true
  }
  const frame = () => {
    for (const s of systems) s.update(world)
  }
  const markReady = () => {
    document.documentElement.dataset.scene = 'ready'
  }

  // Nothing is sized or warmed up while the tab is hidden; a resize that
  // comes in meanwhile waits for the tab to show.
  let pending = true
  const applySize = () => {
    if (document.hidden || !pending) return
    pending = false
    if (resize() && frozen) {
      for (let i = 0; i < STILL_FRAMES; i++) frame()
      markReady()
    }
  }
  const observer = new ResizeObserver(() => {
    pending = true
    applySize()
  })

  let ready = false
  const loop = () => {
    frame()
    if (!ready) {
      ready = true
      markReady()
    }
  }
  const onVisibility = () => {
    applySize()
    if (frozen) return
    // The loop pauses while the tab is hidden.
    world.time.then = performance.now()
    renderer.setAnimationLoop(document.hidden ? null : loop)
  }

  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    renderer.setAnimationLoop(null)
    observer.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    for (const s of systems) s.dispose?.(world)
    world.gpu.quad.dispose()
    renderer.dispose()
    canvas.remove()
  }
  // The GPU reset or dropped the context: back to the page's still, with the
  // DOM name and title painting again.
  const onContextLost = () => {
    dispose()
    delete document.documentElement.dataset.scene
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', onVisibility)
  observer.observe(container)
  onVisibility()
  return dispose
}
