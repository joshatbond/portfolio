import { WebGLRenderer } from 'three'
import { config } from './config'
import { FullscreenQuad } from './gpu'
import { chipRenderSystem } from './systems/chipRender'
import { chipsSystem } from './systems/chips'
import { inputSystem } from './systems/input'
import { lightSystem } from './systems/light'
import { stirSystem } from './systems/stir'
import { surfaceSystem } from './systems/surface'
import { timeSystem } from './systems/time'
import { wavesSystem } from './systems/waves'
import { createSceneWorld, type System } from './world'

export interface SceneOptions {
  /**
   * false (prefers-reduced-motion): no sim, bobbing or flocking. The Still
   * frame renders once (and again on resize) and the loop never runs.
   */
  motion?: boolean
  /** Render a still to save as an image (scripts/render-pool-still.mjs). */
  capture?: { chips: boolean }
}

/**
 * Mounts the homepage water into `container` and returns a function that
 * tears it down. Systems run in this order every frame.
 */
export function mountScene(container: HTMLElement, { motion = true, capture }: SceneOptions = {}): () => void {
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
  const dpr = Math.min(devicePixelRatio, config.view.maxPixelRatio)
  renderer.setPixelRatio(dpr)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)

  const quad = new FullscreenQuad()
  const world = createSceneWorld({ renderer, quad }, capture ?? null)
  const systems: System[] = [
    timeSystem(),
    ...(motion ? [inputSystem()] : []),
    chipsSystem(),
    ...(motion ? [stirSystem()] : []),
    wavesSystem(),
    lightSystem(),
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
    for (const s of systems) s.resize?.(world)
    return true
  }
  const markReady = () => {
    document.documentElement.dataset.scene = 'ready'
  }
  const frame = () => {
    for (const s of systems) s.update(world)
  }
  // Without motion: enough frames for the light to settle, then hold still.
  const still = () => {
    for (let i = 0; i < 40; i++) frame()
    markReady()
  }
  const observer = new ResizeObserver(() => {
    if (resize() && !motion) still()
  })
  observer.observe(container)
  resize()
  if (!motion) {
    still()
    return () => {
      observer.disconnect()
      for (const s of systems) s.dispose?.(world)
      quad.dispose()
      renderer.dispose()
      canvas.remove()
    }
  }

  let ready = false
  const loop = () => {
    frame()
    if (!ready) {
      ready = true
      markReady()
    }
  }
  // Paused while the tab is hidden.
  const onVisibility = () => {
    world.time.then = performance.now()
    renderer.setAnimationLoop(document.hidden ? null : loop)
  }
  document.addEventListener('visibilitychange', onVisibility)
  onVisibility()

  return () => {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    for (const s of systems) s.dispose?.(world)
    quad.dispose()
    renderer.dispose()
    canvas.remove()
  }
}
