# joshuarichardson.me

Joshua Richardson's portfolio. Astro (static output) with a React Three Fiber island for the homepage scene, deployed as a static bundle on Cloudflare.

## Deploy

`pnpm run deploy` builds the site and uploads `dist/` to Cloudflare Workers static assets as the `portfolio` Worker, serving joshuarichardson.me and www.joshuarichardson.me (`wrangler.jsonc`). Unknown paths get the 404 page, `/resume` redirects to `/resume.pdf` (`public/_redirects`), and each hashed file under `/_astro/` is cached for a year (`dist/_headers`, written after the build by `scripts/write-headers.mjs`).

It needs `CLOUDFLARE_API_TOKEN`: a token with Workers Scripts edit on the account, and DNS and Workers Routes edit on the joshuarichardson.me zone. The domain's Proton Mail records are separate, and deploying never touches them.
