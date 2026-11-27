import { getImage } from 'astro:assets'
import caustics from '../assets/textures/caustics-cyan.png'

/**
 * URL of the cyan caustics tile, as WebP. It's always shown at low opacity
 * (6–8%) and at 35–50% scale, so a 640px tile at modest quality is plenty.
 */
export async function causticsUrl(): Promise<string> {
  const tile = await getImage({ src: caustics, format: 'webp', width: 640, quality: 60 })
  return tile.src
}
