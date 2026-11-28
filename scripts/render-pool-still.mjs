// Renders the pool scene's stills for devices that can't run it (no WebGL,
// Save-Data, low power): the water lit by the lamp behind the camera, with
// the chips at home (homepage) or empty (404). The name and the pills aren't
// in the image; the page draws those itself.
//
// usage: pnpm build && pnpm preview, then node scripts/render-pool-still.mjs [baseUrl]
import { chromium } from 'playwright'
import sharp from 'sharp'

const base = process.argv[2] ?? 'http://localhost:4321'
const sizes = [
  { name: 'desktop', width: 1440, height: 900, dpr: 1 },
  { name: 'mobile', width: 390, height: 844, dpr: 2 },
]
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
for (const variant of ['chips', 'empty']) {
  for (const s of sizes) {
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.dpr })
    // The mobile still covers every phone, and on narrow or short ones (320
    // wide, where the pills wrap; 375×667) the name sits up to ~48 px higher
    // in it than at 390×844. Reach the chips' keep-out up that far, with the
    // text (and the light's pocket around it) left where it is.
    if (s.name === 'mobile') {
      await page.addInitScript(() =>
        document.addEventListener('DOMContentLoaded', () => {
          document.head.append(Object.assign(document.createElement('style'), { textContent: '.abyss { padding-top: 48px; margin-top: -48px }' }))
        }),
      )
    }
    await page.goto(`${base}/?capture=${variant}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready', null, { timeout: 120000 })
    await page.addStyleTag({ content: '.surface, .hud, .tub { visibility: hidden !important } .pool-scene { opacity: 1 !important; transition: none !important }' })
    await page.waitForTimeout(300)
    const png = await page.locator('.pool-scene').screenshot()
    const out = `src/assets/pool/still-${variant === 'chips' ? '' : 'empty-'}${s.name}.webp`
    const info = await sharp(png).webp({ quality: 78, effort: 6 }).toFile(out)
    console.log(out, `${info.width}×${info.height}`, `${Math.round(info.size / 1024)} KB`)
    await page.close()
  }
}
await browser.close()
