/**
 * Site-wide settings. Small things that get toggled live here, so a one-line
 * edit changes the site without touching component code. Every component that
 * shows any of these reads it from here, never from a hard-coded copy.
 */
export const site = {
  // Shows the green "Open to work" chip in the homepage HUD.
  // Set to false (one-word change) to hide it everywhere.
  openToWork: true,
  openToWorkLabel: 'Open to work',

  name: 'Joshua Richardson',
  title: 'Full-stack engineer — frontend focus',
  // The homepage title line on narrow screens, where the full line won't fit.
  titleShort: 'Full-stack · frontend focus',
  url: 'https://joshuarichardson.me',
  links: {
    github: 'https://github.com/joshatbond',
    linkedin: 'https://www.linkedin.com/in/richardson-joshua/',
    email: 'mail@joshuarichardson.me',
    resume: '/resume.pdf',
  },

  // <title> and og:title. Inner pages use "<Page> — <name>".
  siteTitle: 'Joshua Richardson — Full-stack engineer',
  description:
    'Joshua Richardson is a full-stack engineer with a frontend focus. Projects include Dice Augur, a campaign notebook for tabletop games with 3D dice the whole table sees.',
  // Default social preview (1200×630); pages can override it.
  ogImage: '/og/home.png',

  // Homepage 3D chips, in this order. Each entry needs a logo SVG in the chip asset folder.
  stackChips: ['typescript', 'javascript', 'react', 'vue', 'nuxt', 'nextjs', 'nodejs', 'threejs',
               'tailwindcss', 'vite', 'bun', 'rive', 'convex', 'tanstack'],
} as const

export type Site = typeof site
