// Contrast checks on rendered pixels (brief §4).
//
// 1. Labels: the text of every link and button (nav, footer, buttons, pills,
//    the skip link) must reach 7:1 against its worst background pixel in the
//    default, hover and keyboard-focus states it's visible in. The label's
//    colour is hidden, the pixels behind it captured, and every pixel tested.
// 2. Floor: all other text must reach text/tertiary on pool/deep (4.57:1)
//    against its 95th-percentile worst pixel, so one bright caustic speck
//    doesn't fail a paragraph. All text is hidden and the page is captured in
//    overlapping viewport-sized windows, without changing the layout.
//
// Pages are checked at the design widths and either side of each breakpoint.
//
// usage: node scripts/check-contrast.mjs [baseUrl] [path ...]
//   default: http://localhost:4321 and every page in dist/ (build first)
import { chromium } from 'playwright'
import sharp from 'sharp'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const [base = 'http://localhost:4321', ...argPaths] = process.argv.slice(2)
const WIDTHS = [1440, 1024, 720, 390, 320]
const VIEWPORT_H = 900
const LABEL_MIN = 7

const lin = (c) => {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (la, lb) => (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
// text/tertiary (#6C7786) on pool/deep (#000204)
const FLOOR_MIN = Math.floor(ratio(luminance([0x6c, 0x77, 0x86]), luminance([0x00, 0x02, 0x04])) * 100) / 100

/** rgb()/rgba() or color(srgb r g b / a) → [r, g, b, a] in 0–255 (alpha 0–1). */
const parseColor = (s) => {
  const n = s.match(/[\d.]+/g).map(Number)
  if (s.startsWith('color(')) return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1]
  return [n[0], n[1], n[2], n[3] ?? 1]
}

function builtPaths() {
  const pages = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.html')) pages.push('/' + relative('dist', p).replace(/\.html$/, '').replace(/(^|\/)index$/, ''))
    }
  }
  if (existsSync('dist')) walk('dist')
  return pages.sort()
}
const paths = argPaths.length ? argPaths : builtPaths()
if (paths.length === 0) {
  console.error('No pages to check: run `pnpm build` first, or pass routes explicitly.')
  process.exit(1)
}

let failures = 0
let checked = 0
const report = (ok, value, min, where) => {
  checked++
  if (!ok) failures++
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'ok  ' : 'FAIL'} ${value.toFixed(2)}:1 (min ${min})  ${where}`)
}

/** Worst-case ratios of `color` against the pixels of a raw RGB region. */
function measure({ data, width: w, height: h }, color) {
  const n = w * h
  const ratios = new Float64Array(n)
  const a = color[3]
  for (let p = 0; p < n; p++) {
    const px = [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
    const fg = [0, 1, 2].map((k) => color[k] * a + px[k] * (1 - a))
    ratios[p] = ratio(luminance(fg), luminance(px))
  }
  ratios.sort()
  return { min: ratios[0], p5: ratios[Math.floor(n * 0.05)] }
}

async function rawRegion(png, box) {
  const img = sharp(png)
  const { width, height } = await img.metadata()
  const left = Math.max(0, Math.floor(box.x))
  const top = Math.max(0, Math.floor(box.y))
  const w = Math.max(1, Math.min(Math.ceil(box.x + box.w) - left, width - left))
  const h = Math.max(1, Math.min(Math.ceil(box.y + box.h) - top, height - top))
  const { data, info } = await img.extract({ left, top, width: w, height: h }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: VIEWPORT_H }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const path of paths) {
    const res = await page.goto(base + path, { waitUntil: 'networkidle' })
    const expected = path === '/404' ? [200, 404] : [200]
    if (!res || !expected.includes(res.status())) {
      failures++
      console.log(`FAIL ${path} returned ${res ? res.status() : 'no response'}`)
      continue
    }
    await page.evaluate(() => document.fonts.ready)
    // States should settle at once, so nothing is measured mid-transition.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' })

    // ----- 1. Link and button labels, per state -----
    // Glyphs are hidden with a fill-colour override, so inline styles,
    // currentColor icons and borders stay exactly as rendered.
    await page.addStyleTag({
      content: '[data-cc-hide], [data-cc-hide] * { -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
    })
    const labelCount = await page.evaluate(() => {
      window.__labels = [...document.querySelectorAll('a, button')].filter((el) => el.innerText.trim())
      return window.__labels.length
    })
    for (let i = 0; i < labelCount; i++) {
      for (const state of ['default', 'hover', 'focus']) {
        await page.mouse.move(0, 0)
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
        const target = await page.evaluateHandle((k) => window.__labels[k], i)
        // Not rendered at this width (e.g. the case study's menu on phones).
        if (!(await target.evaluate((n) => n.getClientRects().length > 0))) continue
        await target.evaluate((n) => n.scrollIntoView({ block: 'center', inline: 'nearest' }))
        const name = await target.evaluate((n) => n.innerText.trim().split('\n')[0].slice(0, 40))
        if (state === 'hover') {
          // Hover a point that hit-tests to the label itself (a multi-line
          // link's box centre can fall outside it).
          const point = await target.evaluate((n) => {
            for (const rect of n.getClientRects()) {
              const x = rect.left + rect.width / 2
              const y = rect.top + rect.height / 2
              const hit = document.elementFromPoint(x, y)
              if (hit && (hit === n || n.contains(hit))) return { x, y }
            }
            return null
          })
          if (!point) continue // covered or off-screen: not hoverable here
          await page.mouse.move(point.x, point.y)
        }
        if (state === 'focus') {
          await target.evaluate((n) => n.focus({ focusVisible: true }))
          await page.keyboard.press('Shift')
        }
        await page.waitForTimeout(30)
        const active = await target.evaluate((n, st) => (st === 'hover' ? n.matches(':hover') : st === 'focus' ? n.matches(':focus-visible') : true), state)
        if (!active) {
          failures++
          console.log(`FAIL could not put "${name}" in its ${state} state (${width}px ${path})`)
          continue
        }
        // Each text run with its own colour, clipped to the element's box (a
        // glyph box can be taller than the line, and the focus ring outside
        // the element isn't behind the label).
        const runs = await target.evaluate((n) => {
          const own = n.getBoundingClientRect()
          const out = []
          const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT)
          for (let t = walker.nextNode(); t; t = walker.nextNode()) {
            if (!t.textContent.trim() || t.parentElement.closest('.visually-hidden')) continue
            const color = getComputedStyle(t.parentElement).color
            const range = document.createRange()
            range.selectNodeContents(t)
            for (const r of range.getClientRects()) {
              const x = Math.max(own.left, r.left)
              const y = Math.max(own.top, r.top)
              const w = Math.min(own.right, r.right) - x
              const h = Math.min(own.bottom, r.bottom) - y
              if (w < 1 || h < 1) continue
              const inView = x >= 0 && y >= 0 && x + w <= innerWidth && y + h <= innerHeight
              out.push({ color, box: { x, y, w, h }, inView })
            }
          }
          return out
        })
        const visible = runs.filter((r) => r.inView)
        // Not visible in this state (e.g. the skip link before it's focused).
        if (!visible.length) continue
        await target.evaluate((n) => n.setAttribute('data-cc-hide', ''))
        const png = await page.screenshot()
        await target.evaluate((n) => n.removeAttribute('data-cc-hide'))
        let worst = Infinity
        for (const run of visible) worst = Math.min(worst, measure(await rawRegion(png, run.box), parseColor(run.color)).min)
        report(worst >= LABEL_MIN, worst, LABEL_MIN, `label ${width}px ${path}  "${name}" [${state}]`)
      }
    }

    // ----- 2. All other text, window by window -----
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    const colors = await page.evaluate(() => {
      window.__texts = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement
        if (!el || !node.textContent.trim() || el.closest('a, button, script, style, .visually-hidden')) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue
        window.__texts.push(node)
      }
      return window.__texts.map((node) => ({ color: getComputedStyle(node.parentElement).color, text: node.textContent.trim().slice(0, 40) }))
    })
    const hide = await page.addStyleTag({
      content: '*, *::before, *::after { -webkit-text-fill-color: transparent !important; text-shadow: none !important; }',
    })
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
    const done = new Set()
    for (let y = 0; ; y += VIEWPORT_H - 200) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y)
      await page.waitForTimeout(30)
      const boxes = await page.evaluate(() =>
        window.__texts.map((node) => {
          const r = document.createRange()
          r.selectNodeContents(node)
          return [...r.getClientRects()].filter((b) => b.width > 1 && b.height > 1).map((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height }))
        }),
      )
      const png = await page.screenshot()
      for (let k = 0; k < boxes.length; k++) {
        for (let j = 0; j < boxes[k].length; j++) {
          const id = `${k}:${j}`
          const b = boxes[k][j]
          if (done.has(id) || b.x < 0 || b.y < 0 || b.x + b.w > width || b.y + b.h > VIEWPORT_H) continue
          done.add(id)
          const { p5 } = measure(await rawRegion(png, b), parseColor(colors[k].color))
          report(p5 >= FLOOR_MIN, p5, FLOOR_MIN, `text  ${width}px ${path}  "${colors[k].text}"`)
        }
      }
      if (y + VIEWPORT_H >= docHeight) break
    }
    await hide.evaluate((n) => n.remove())
  }
  await context.close()
}

await browser.close()
console.log(`\n${checked} checks on ${paths.join(', ')}, ${failures} failed`)
process.exit(failures ? 1 : 0)
