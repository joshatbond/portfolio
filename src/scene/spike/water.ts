// SPIKE (throwaway): the water look test for sign-off — ripples, caustics and
// the neon rim, in plain three.js (no React). Not the production scene: no
// chips, flocking or fallbacks yet.
import {
  ClampToEdgeWrapping,
  Color,
  CanvasTexture,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
  type Texture,
} from 'three'
import { dropFrag, nameFrag, nameVert, normalFrag, quadVert, surfaceFrag, updateFrag, wallFrag, wallVert } from './shaders'

const FOG = new Color('#000204')
const LONG = 256 // sim cells along the longer screen side

type Drop = { x: number; y: number; r: number; s: number }

/** Draws the DOM name and title into a texture so the water can refract them. */
function drawAbyss(): { texture: CanvasTexture; rect: DOMRect } | null {
  const abyss = document.querySelector<HTMLElement>('.abyss')
  if (!abyss) return null
  const pad = 48
  const box = abyss.getBoundingClientRect()
  const rect = new DOMRect(box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2)
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rect.width * scale)
  canvas.height = Math.ceil(rect.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  for (const el of abyss.querySelectorAll<HTMLElement>('.name > span, .role > span')) {
    if (!el.getClientRects().length) continue
    const host = el.closest<HTMLElement>('.name, .role')!
    const cs = getComputedStyle(host)
    const r = el.getBoundingClientRect()
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing
    const text = cs.textTransform === 'uppercase' ? el.textContent!.toUpperCase() : el.textContent!
    const m = ctx.measureText(text)
    const baseline = r.top - rect.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    ctx.shadowColor = 'rgba(6, 182, 212, 0.55)'
    ctx.shadowBlur = host.classList.contains('name') ? 23 : 11
    ctx.fillStyle = '#cffafe'
    ctx.fillText(text, r.left - rect.left, baseline)
    ctx.shadowBlur = 0
    ctx.fillText(text, r.left - rect.left, baseline)
  }
  // Sampled as raw display values, like everything else in these shaders.
  return { texture: new CanvasTexture(canvas), rect }
}

/** Everything sized to the viewport; rebuilt on resize. */
function buildWorld(renderer: WebGLRenderer, camera: PerspectiveCamera, causticsTex: Texture, W: number, H: number) {
  const mobile = W < 720
  const P = mobile ? 865 : 1240 // camera distance: the deep (name) shows at ~half scale
  const DEPTH = mobile ? 900 : 1100
  const simW = W >= H ? LONG : Math.round((LONG * W) / H)
  const simH = W >= H ? Math.round((LONG * H) / W) : LONG

  // The plane z = 0 (the water surface, the rim) fills the viewport exactly.
  camera.position.set(0, 0, P)
  camera.fov = (2 * Math.atan(H / 2 / P) * 180) / Math.PI
  camera.aspect = W / H
  camera.near = 10
  camera.far = P + DEPTH * 2
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  const opts = {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
  }
  const sim = [new WebGLRenderTarget(simW, simH, opts), new WebGLRenderTarget(simW, simH, opts)]
  for (const t of sim) {
    renderer.setRenderTarget(t)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
  }
  renderer.setRenderTarget(null)

  const delta = new Vector2(1 / simW, 1 / simH)
  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const mk = (fragmentShader: string, uniforms: Record<string, { value: unknown }>) =>
    new ShaderMaterial({ vertexShader: quadVert, fragmentShader, uniforms, depthTest: false, depthWrite: false })
  const drop = mk(dropFrag, {
    tSim: { value: null },
    uCenter: { value: new Vector2() },
    uRadius: { value: 0.02 },
    uStrength: { value: 0.01 },
    uAspect: { value: new Vector2(simW / LONG, simH / LONG) },
  })
  const update = mk(updateFrag, { tSim: { value: null }, uDelta: { value: delta }, uDamping: { value: 0.995 } })
  const normal = mk(normalFrag, { tSim: { value: null }, uDelta: { value: delta }, uCell: { value: new Vector2(2 / LONG, 2 / LONG) } })
  const quad = new Mesh(new PlaneGeometry(2, 2), update)
  const quadScene = new Scene()
  quadScene.add(quad)

  // Underwater: four walls dropping from the screen edges, no floor.
  const under = new Scene()
  under.background = FOG
  const wallMat = new ShaderMaterial({
    vertexShader: wallVert,
    fragmentShader: wallFrag,
    uniforms: {
      tCaustics: { value: causticsTex },
      tSim: { value: null },
      uHalf: { value: new Vector2(W / 2, H / 2) },
      uDepth: { value: DEPTH },
      uTime: { value: 0 },
      uCameraZ: { value: P },
      uFog: { value: FOG },
      uFogDensity: { value: 0.0009 },
      uEnergy: { value: 0 },
    },
  })
  const walls = [
    { w: W, h: DEPTH, rx: Math.PI / 2, ry: 0, pos: [0, H / 2, -DEPTH / 2] },
    { w: W, h: DEPTH, rx: -Math.PI / 2, ry: 0, pos: [0, -H / 2, -DEPTH / 2] },
    { w: DEPTH, h: H, rx: 0, ry: Math.PI / 2, pos: [-W / 2, 0, -DEPTH / 2] },
    { w: DEPTH, h: H, rx: 0, ry: -Math.PI / 2, pos: [W / 2, 0, -DEPTH / 2] },
  ].map((s) => {
    const m = new Mesh(new PlaneGeometry(s.w, s.h), wallMat)
    m.rotation.set(s.rx, s.ry, 0)
    m.position.set(s.pos[0], s.pos[1], s.pos[2])
    return m
  })
  under.add(...walls)

  // The name and title, hanging in the deep, lined up with the DOM text.
  const abyss = drawAbyss()
  if (abyss) {
    const zName = DEPTH
    const k = (P + zName) / P
    const { rect } = abyss
    const nameMesh = new Mesh(
      new PlaneGeometry(rect.width * k, rect.height * k),
      new ShaderMaterial({
        vertexShader: nameVert,
        fragmentShader: nameFrag,
        uniforms: { tName: { value: abyss.texture }, uDim: { value: 0.56 } },
        transparent: true,
        depthWrite: false,
        // On narrow screens the name is wider than the tub at its depth; the
        // walls there have already faded to black, so draw it over them.
        depthTest: false,
      }),
    )
    nameMesh.position.set((rect.x + rect.width / 2 - W / 2) * k, (H / 2 - (rect.y + rect.height / 2)) * k, -zName)
    under.add(nameMesh)
  }

  const dpr = renderer.getPixelRatio()
  const underRT = new WebGLRenderTarget(Math.round((W * dpr) / 2), Math.round((H * dpr) / 2))

  const pills = [new Vector4(), new Vector4()]
  document.querySelectorAll<HTMLElement>('.pills .btn').forEach((el, i) => {
    if (i > 1) return
    const b = el.getBoundingClientRect()
    pills[i].set(b.x, b.y, b.width, b.height)
  })
  const surface = mk(surfaceFrag, {
    tUnder: { value: underRT.texture },
    tSim: { value: null },
    uResolution: { value: new Vector2(W, H) },
    uRefract: { value: 0.02 },
    uEdgeFalloff: { value: Math.min(160, Math.max(48, Math.min(W, H) * 0.12)) },
    uPills: { value: pills },
    uTime: { value: 0 },
  })

  const pass = (mat: ShaderMaterial) => {
    mat.uniforms.tSim.value = sim[0].texture
    quad.material = mat
    renderer.setRenderTarget(sim[1])
    renderer.render(quadScene, quadCam)
    sim.reverse()
  }

  return {
    W,
    H,
    /** Runs the sim and draws one frame. */
    frame(t: number, drops: Drop[], energy: number) {
      for (const d of drops) {
        drop.uniforms.uCenter.value.set(d.x, d.y)
        drop.uniforms.uRadius.value = d.r
        drop.uniforms.uStrength.value = d.s
        pass(drop)
      }
      pass(update)
      pass(update)
      pass(normal)

      wallMat.uniforms.tSim.value = sim[0].texture
      wallMat.uniforms.uTime.value = t
      wallMat.uniforms.uEnergy.value = energy
      renderer.setRenderTarget(underRT)
      renderer.render(under, camera)

      surface.uniforms.tSim.value = sim[0].texture
      surface.uniforms.uTime.value = t
      quad.material = surface
      renderer.setRenderTarget(null)
      renderer.render(quadScene, quadCam)
    },
    dispose() {
      sim.forEach((t) => t.dispose())
      underRT.dispose()
      under.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose()
          ;(o.material as ShaderMaterial).dispose()
        }
      })
      ;[drop, update, normal, surface].forEach((m) => m.dispose())
      quad.geometry.dispose()
    },
  }
}

/** Mounts the water into `container` and returns a function that tears it down. */
export function mountWater(container: HTMLElement, { caustics }: { caustics: string }): () => void {
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  container.append(canvas)

  const camera = new PerspectiveCamera()
  const causticsTex = new TextureLoader().load(caustics)
  causticsTex.wrapS = causticsTex.wrapT = RepeatWrapping

  let world: ReturnType<typeof buildWorld> | null = null
  const resize = () => {
    const W = container.clientWidth
    const H = container.clientHeight
    if (world && world.W === W && world.H === H) return
    renderer.setSize(W, H, false)
    world?.dispose()
    world = buildWorld(renderer, camera, causticsTex, W, H)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  // Pointer: moving drops ripples along the path; a press drops a bigger one.
  let drops: Drop[] = []
  let energy = 0
  let last: { x: number; y: number } | null = null
  const toSim = (e: PointerEvent) => ({ x: e.clientX / world!.W, y: 1 - e.clientY / world!.H })
  const onMove = (e: PointerEvent) => {
    if (!world) return
    const p = toSim(e)
    if (last) {
      const long = Math.max(world.W, world.H)
      const dist = Math.hypot(((p.x - last.x) * world.W) / long, ((p.y - last.y) * world.H) / long)
      const steps = Math.min(3, Math.ceil(dist / 0.012))
      // Faster strokes stir harder, within limits.
      const s = Math.min(0.0016, 0.0004 + dist * 0.02) / steps
      for (let i = 1; i <= steps; i++) {
        drops.push({ x: last.x + ((p.x - last.x) * i) / steps, y: last.y + ((p.y - last.y) * i) / steps, r: 0.014, s })
      }
      energy = Math.min(1, energy + 0.03)
    }
    last = p
  }
  const onDown = (e: PointerEvent) => {
    if (!world) return
    const p = toSim(e)
    drops.push({ x: p.x, y: p.y, r: 0.028, s: 0.009 })
    energy = 1
    last = p
  }
  const onLeave = () => (last = null)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerdown', onDown, { passive: true })
  document.addEventListener('pointerleave', onLeave)

  // A gentle ambient stir so the caustics never sit dead still.
  let ambient = 0
  let prev = performance.now()
  let started = false
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - prev) / 1000)
    prev = now
    ambient -= dt
    if (ambient <= 0) {
      ambient = 0.5 + Math.random() * 0.9
      drops.push({ x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.84, r: 0.03, s: 0.0007 })
    }
    energy *= Math.pow(0.4, dt)
    world?.frame(now / 1000, drops.splice(0, 24), energy)
    if (!started) {
      started = true
      document.documentElement.dataset.scene = 'ready'
    }
  }
  // Paused while the tab is hidden.
  const onVisibility = () => {
    prev = performance.now()
    renderer.setAnimationLoop(document.hidden ? null : loop)
  }
  document.addEventListener('visibilitychange', onVisibility)
  onVisibility()

  return () => {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerdown', onDown)
    document.removeEventListener('pointerleave', onLeave)
    document.removeEventListener('visibilitychange', onVisibility)
    world?.dispose()
    causticsTex.dispose()
    renderer.dispose()
    canvas.remove()
    drops = []
  }
}
