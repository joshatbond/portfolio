/**
 * Copy for /projects, from the Figma frames (2059:1082 desktop, 2060:1135 mobile).
 * Where the mobile frame shortens copy or drops tags, `short` and `wideOnly`
 * carry the difference.
 *
 * Legal (brief §1): Bond appears only as role, company and years plus the NDA
 * note. Never add Bond project or client names, art, stats or links here.
 */

export interface Tag {
  label: string
  /** Hidden on narrow screens, as in the mobile frame. */
  wideOnly?: boolean
}

export interface WorkRow {
  title: string
  blurb: string
  tags: Tag[]
  company: string
  role: string
  years: string
  note: string
  /** Muted title, for the NDA row. */
  muted?: boolean
}

const tags = (...labels: string[]): Tag[] =>
  labels.map((label) => (label.startsWith('~') ? { label: label.slice(1), wideOnly: true } : { label }))

export const diceAugur = {
  eyebrow: '2026 · Full-stack · Solo',
  status: 'Live',
  title: 'Dice Augur',
  href: '/projects/dice-augur',
  tour: 'https://diceaugur.com/app/tour',
  blurb:
    'A tabletop campaign notebook: places, people and plot in one connected world, with a journal, 3D physics dice, a soundboard and a timer. Designed and built on my own, front end to backend, and live at diceaugur.com.',
  blurbShort:
    'A tabletop campaign notebook: places, people and plot in one connected world, with a journal, 3D physics dice, a soundboard and a timer. Built on my own, front end to backend.',
  stack: tags('React 19', '~TanStack Router', 'Convex', 'three.js', 'Rapier', 'Hono', '~Tailwind 4', 'MCP'),
  factLabel: 'Try it',
  fact: 'The tour runs the real backend inside your browser. No account needed.',
}

export const palomaValley = {
  eyebrow: '2025 · Freelance · Live event',
  eyebrowShort: '2025 · Freelance',
  status: 'Event over',
  title: 'Paloma Valley Show',
  source: 'https://github.com/joshatbond/paloma-valley-show',
  blurb:
    'A second-screen companion for a live show. Every phone in the audience became a Game Boy: pick a partner, vote in polls and watch battles play out, while one admin console moved the whole room through the show in real time.',
  blurbShort:
    'A second-screen companion for a live show. Every phone became a Game Boy: pick a partner, vote in polls and watch battles, while one admin console moved the room through the show in real time.',
  stack: tags('TanStack Start', '~React', 'Convex', 'Pixi.js', 'XState', '~Tailwind'),
  factLabel: 'How it worked',
  fact: 'The admin console stepped the show through its phases; every phone followed along live, with its D-pad and A/B buttons as the controls.',
}

export const professional: WorkRow[] = [
  {
    title: 'Agency work at Bond',
    blurb: 'Client work from this role is under NDA, so it isn’t shown here.',
    tags: [],
    company: 'Bond',
    role: 'Software Engineer',
    years: '2023 – 2024',
    note: 'Under NDA',
    muted: true,
  },
  {
    title: 'GraphQL federation migration',
    blurb:
      'Architected the move from a monolithic GraphQL service to Apollo Federation: metrics for a phased rollout, plus Express middleware that timed every query and streamed the results into Kafka.',
    tags: tags('GraphQL', 'Apollo Federation', 'Node.js', 'Express', 'Kafka'),
    company: 'American Express',
    role: 'Software Engineer II',
    years: '2022',
    note: 'Internal · no public link',
  },
  {
    title: 'Evidence capture app',
    blurb:
      'A mobile app for agencies to collect digital evidence: native iOS and Android modules capture RAW photos and hash them with SHA-256, then upload them encrypted so chain of custody holds end to end.',
    tags: tags('React Native', 'iOS', 'Android', 'SHA-256', 'Multi-tenant auth'),
    company: 'Linear Systems',
    role: 'Software Developer',
    years: '2020 – 2022',
    note: 'Internal · no public link',
  },
  {
    title: 'Evidence platform rebuild',
    blurb:
      'Rebuilt the evidence-management platform: a per-client React app on Apollo, a Fastify API over Neo4j with Redis caching, and Node services on Docker Swarm that kept evidence redundant across on-prem servers.',
    tags: tags('React', 'Apollo', 'Fastify', 'Neo4j', 'Redis', 'Docker Swarm'),
    company: 'Linear Systems',
    role: 'Software Developer',
    years: '2020 – 2022',
    note: 'Internal · no public link',
  },
]
