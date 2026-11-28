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

/**
 * Mounts the homepage water into `container` and returns a function that
 * tears it down. Systems run in this order every frame.
 */
export function mountScene(container: HTMLElement): () => void {
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
  const dpr = Math.min(devicePixelRatio, config.view.maxPixelRatio)
  renderer.setPixelRatio(dpr)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)

  const quad = new FullscreenQuad()
  const world = createSceneWorld({ renderer, quad })
  const systems: System[] = [
    timeSystem(),
    inputSystem(),
    chipsSystem(),
    stirSystem(),
    wavesSystem(),
    lightSystem(),
    chipRenderSystem(),
    surfaceSystem(),
  ]

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === world.viewport.width && height === world.viewport.height) return
    const mobile = width < config.view.mobileBelow
    world.viewport = { width, height, dpr, mobile }
    world.view = { ...(mobile ? config.view.mobile : config.view.desktop) }
    renderer.setSize(width, height, false)
    for (const s of systems) s.resize?.(world)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  let ready = false
  const loop = () => {
    for (const s of systems) s.update(world)
    if (!ready) {
      ready = true
      document.documentElement.dataset.scene = 'ready'
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
