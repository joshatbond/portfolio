import { Vector2, Vector4, type ShaderMaterial, type WebGLRenderTarget } from 'three'
import { config } from '../config'
import { floatTarget, pass } from '../gpu'
import { lightBlurFrag, lightFrag } from '../shaders/light'
import { textRect } from '../abyss'
import type { SceneWorld, System } from '../world'

/**
 * The frame LEDs' light falling into the murky water, rendered at low
 * resolution into world.light.target. Each frame is blended into a running
 * average (half-float, so faint light accumulates without banding), then
 * softened with a blur.
 */
export function lightSystem(): System {
  let targets: WebGLRenderTarget[] = []
  let blurred: WebGLRenderTarget[] = []
  let material: ShaderMaterial | null = null
  let blurX: ShaderMaterial | null = null
  let blurY: ShaderMaterial | null = null
  let frame = 0

  const dispose = () => {
    for (const t of [...targets, ...blurred]) t.dispose()
    for (const m of [material, blurX, blurY]) m?.dispose()
    targets = []
    blurred = []
    material = blurX = blurY = null
  }

  /** The ellipse of thicker water around the name and title (world px at the surface, y up). */
  const pocket = (world: SceneWorld) => {
    const { width: W, height: H } = world.viewport
    const text = [...document.querySelectorAll('.abyss .name > span, .abyss .role > span')].filter((el) => el.getClientRects().length)
    if (!text.length) return new Vector4(0, 0, 0, 0)
    const origin = world.container.getBoundingClientRect()
    const rects = text.map((el) => {
      const r = textRect(el)
      return new DOMRect(r.x - origin.x, r.y - origin.y, r.width, r.height)
    })
    const x0 = Math.min(...rects.map((r) => r.left))
    const x1 = Math.max(...rects.map((r) => r.right))
    const y0 = Math.min(...rects.map((r) => r.top))
    const y1 = Math.max(...rects.map((r) => r.bottom))
    const { pad } = config.abyss.pocket
    // An ellipse through the box's corners (√2 × its half-size), padded.
    return new Vector4((x0 + x1) / 2 - W / 2, H / 2 - (y0 + y1) / 2, ((x1 - x0) / 2) * Math.SQRT2 + pad, ((y1 - y0) / 2) * Math.SQRT2 + pad)
  }

  return {
    resize(world) {
      dispose()
      const { width: W, height: H, dpr, mobile } = world.viewport
      const c = config.light
      const w = Math.max(1, Math.round(W * dpr * c.resolution))
      const h = Math.max(1, Math.round(H * dpr * c.resolution))
      targets = [floatTarget(w, h), floatTarget(w, h)]
      blurred = [floatTarget(w, h), floatTarget(w, h)]
      frame = 0
      // Keep the light to the frame whatever the window's size.
      const scale = Math.min(W, H) / c.referenceSide
      const { pocket: pk } = config.abyss
      material = pass(lightFrag, {
        tCurv: { value: null },
        tPrev: { value: null },
        uBlend: { value: 1 },
        // There in captured stills too, so the page's own text keeps its
        // contrast over them.
        uPocket: { value: pocket(world) },
        uPocketFeather: { value: pk.feather },
        uPocketFloor: { value: pk.floor },
        uHalf: { value: new Vector2(W / 2, H / 2) },
        uSimScale: { value: 1 },
        uCamZ: { value: world.view.distance },
        uMaxDepth: { value: c.maxDepth * scale },
        uReach: { value: c.reach * scale },
        uLedHeight: { value: c.ledHeight },
        uLobe: { value: c.lobe },
        uLensGain: { value: c.lensGain },
        uLensMax: { value: c.lensMax },
        // Shorter paths scatter less; keep the frame about as bright (a little
        // dimmer on phones, where the strips' light meets in the middle).
        uExtinction: { value: c.extinction / scale },
        uFalloff: { value: c.falloff / scale },
        uIntensity: { value: c.intensity / Math.sqrt(scale) },
        uSeed: { value: 0 },
        uTime: { value: 0 },
        uMurk: { value: new Vector4(1 / (c.murk.scale * scale), c.murk.amount, c.murk.ambient, c.murk.drift * scale) },
      })
      material.defines = { STEPS: mobile ? c.steps.mobile : c.steps.desktop }
      blurX = pass(lightBlurFrag, { tLight: { value: null }, uStep: { value: new Vector2(c.blur / 2 / w, 0) } })
      blurY = pass(lightBlurFrag, { tLight: { value: blurred[0].texture }, uStep: { value: new Vector2(0, c.blur / 2 / h) } })
      world.light.target = blurred[1]
    },
    update(world) {
      if (!material || !blurX || !blurY) return
      const { renderer, quad } = world.gpu
      const u = material.uniforms
      u.tCurv.value = world.water.curvature
      u.uSimScale.value = world.water.simScale
      u.uTime.value = world.time.elapsed
      // A fresh jitter each frame; averaged over frames it vanishes.
      u.uSeed.value = (frame % 64) * 17.0
      u.tPrev.value = targets[0].texture
      // Live: a moving average that follows the water. Frozen: the exact mean
      // of every frame so far, which settles in a couple of dozen frames.
      u.uBlend.value = world.frozen ? 1 / (frame + 1) : frame === 0 ? 1 : config.light.temporalBlend
      frame++
      quad.render(renderer, material, targets[1])
      targets.reverse()
      blurX.uniforms.tLight.value = targets[0].texture
      quad.render(renderer, blurX, blurred[0])
      quad.render(renderer, blurY, blurred[1])
    },
    dispose,
  }
}
