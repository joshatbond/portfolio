// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import { fileURLToPath } from 'node:url'
import threeMinify from 'rollup-plugin-three-minify'
import { site } from './src/config/site.ts'

/** @param {string} pkg @param {string} file */
// rollup-plugin-three-minify resolves 'three' with no importer, which Vite 8
// under Astro answers with a bare path; point it at the prebuilt module.
const threeModule = fileURLToPath(import.meta.resolve('three'))

const fontsource = (pkg, file) => `@fontsource-variable/${pkg}/files/${file}`

export default defineConfig({
  site: site.url,
  output: 'static',
  // `/projects` and `/projects/dice-augur` are the canonical URLs: emit
  // `projects.html` style files so static hosts serve them without a redirect.
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    // Strips three.js built-in materials, unused shader chunks and renderer
    // subsystems, and minifies its GLSL. Whitelist: our scene uses only
    // ShaderMaterial (which still needs the colorspace chunk) and textures.
    plugins: [threeMinify({ materials: [], features: ['colorspace'], textures: true })],
    resolve: { alias: [{ find: /^three$/, replacement: threeModule }] },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Bricolage Grotesque',
      cssVariable: '--font-display',
      fallbacks: ['sans-serif'],
      options: {
        // The opsz build: with `font-optical-sizing: auto` the browser matches
        // optical size to font size, like Figma's "Auto" optical size.
        variants: [{ src: [fontsource('bricolage-grotesque', 'bricolage-grotesque-latin-opsz-normal.woff2')], weight: '200 800', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist',
      cssVariable: '--font-body',
      fallbacks: ['sans-serif'],
      options: {
        variants: [{ src: [fontsource('geist', 'geist-latin-wght-normal.woff2')], weight: '100 900', style: 'normal' }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Geist Mono',
      cssVariable: '--font-mono',
      fallbacks: ['monospace'],
      options: {
        variants: [{ src: [fontsource('geist-mono', 'geist-mono-latin-wght-normal.woff2')], weight: '100 900', style: 'normal' }],
      },
    },
  ],
})
