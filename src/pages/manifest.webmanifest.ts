import type { APIRoute } from 'astro'
import { site } from '../config/site'

// The web app manifest, built from the site config so the name stays in one place.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: site.name,
        short_name: site.name.split(' ')[0],
        description: site.title,
        start_url: '/',
        display: 'browser',
        background_color: '#000204',
        theme_color: '#000204',
        icons: [
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
