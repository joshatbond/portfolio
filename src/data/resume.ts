export const resume: Resume = {
  contact: [
    { icon: 'phone', text: '+19096809275' },
    { icon: 'mail', text: 'josh@cursedtale.com' },
    { icon: 'loc', text: 'Castle Rock, CO' },
  ],
  education: [
    {
      type: 'Bachelor of Science, Computer Science',
      name: "Western Governor's University",
      where: 'Salt Lake City, UT',
    },
    {
      type: 'High School Diploma',
      name: 'Etiwanda High School',
      where: 'Etiwanda, CA',
    },
  ],
  experience: [
    {
      from: 'Jan 23',
      to: 'Mar 24',
      title: 'Software Engineer',
      company: { title: 'Bond', link: 'https://www.wearebond.com' },
      description: [
        'Collaborate with development and design teams to build custom sites for upcoming gaming and entertainment pieces',
      ],
    },
    {
      from: 'Apr 22',
      to: 'Oct 22',
      title: 'Engineer II',
      company: {
        title: 'American Express',
        link: 'https://www.americanexpress.com/',
      },
      description: [
        'Part of a team migrating monorepo GraphQL layer to federated GraphQL',
        'Wrote express middleware to capture requests and responses in monorepo and cache in Kafka',
      ],
    },
    {
      from: 'Jan 20',
      to: 'Mar 22',
      title: 'Software Developer',
      company: {
        title: 'Linear Systems Inc',
        link: 'https://www.linearlawenforcement.com/',
      },
      description: [
        'Began rewriting DIMS software using modern technology',
        'Built mobile app that allowed agencies to upload digital evidence from their phones, securely',
        'Built node.js server to collect, process, and retain digital evidence',
      ],
    },
  ],
  links: [{ url: 'https://github.com/joshatbond', to: 'Professional' }],
  objective:
    'Full-Stack Web developer interested in functional programming and type-safety with 4 years experience seeking a position that allows for continued growth and challenges to continue to improve my skillset.',
  projects: [
    {
      title: 'Grepl',
      url: 'grepl.cursedtale.com',
      repo: 'https://github.com/joshatbond/grepl',
      id: 'grepl',
    },
    {
      title: 'Bond Website',
      url: 'https://www.wearebond.com/',
      id: 'bond',
    },
    {
      title: 'Barbie Selfie Generator',
      url: 'https://www.barbieselfie.ai/',
      id: 'barbie',
    },
    {
      title: 'Oppenheimer',
      url: 'https://www.oppenheimermovie.com/',
      id: 'oppenheimer',
    },
    {
      title: 'Expend4bles Poster Generator',
      url: 'https://join.expendables.movie/',
      id: 'expend4bles',
    },
    {
      title: 'Wild Rift Anniversary Site',
      url: 'https://anniversary.wildrift.leagueoflegends.com/en-us/',
      id: 'wr',
    },
    {
      title: 'TFT - Set 10: Remix Rumble',
      url: 'https://remix-rumble.teamfighttactics.leagueoflegends.com/en-us/remix/',
      id: 'tft-s10',
    },
    {
      title: 'Skydance Media Website',
      url: 'https://skydance.com/',
      id: 'skydance',
    },
    {
      title: 'Accelerise Media Website',
      url: 'https://accelarisemedia.com/',
      id: 'accelerise',
    },
    {
      title: 'The Watchers',
      url: 'https://www.areyouwatching.us/',
      id: 'watchers',
    },
  ],
  skills: [
    { name: 'Node.js', time: 4, type: 'g' },
    { name: 'Javascript', time: 5, type: 'g' },
    { name: 'Typescript', time: 3, type: 'g' },
    { name: 'Github', time: 4, type: 'g' },

    { name: 'React', time: 2, type: 'f' },
    { name: 'Vue', time: 1, type: 'f' },
    { name: 'React Native', time: 2, type: 'f' },
    { name: 'Figma', time: 3, type: 'f' },

    { name: 'Next.js', time: 1, type: 's' },
    { name: 'Nuxt.js', time: 1, type: 's' },
    { name: 'GraphQL', time: 2, type: 's' },

    { name: 'PostgreSQL', time: 1, type: 'b' },
    { name: 'Neo4j', time: 1, type: 'b' },
    { name: 'MongoDB', time: 1, type: 'b' },
    { name: 'docker', time: 2, type: 'b' },
    { name: 'Express.js', time: 3, type: 'b' },
    { name: 'traefik', time: 1, type: 'b' },
  ],
}

export type Resume = {
  contact: Contact[]
  education: Education[]
  experience: Experience[]
  links: Link[]
  objective: string
  projects: Project[]
  skills: Skill[]
}
export type Contact = {
  icon: 'phone' | 'mail' | 'loc'
  text: string
}
export type Education = { name: string; type: string; where: string }
export type Experience = {
  company: { title: string; link: string }
  description: string[]
  from: string
  title: string
  to: string
}
export type Link = { url: string; to: string }
export type Skill = { name: string; time: number; type: 'b' | 'f' | 'g' | 's' }
export type Project = {
  id?: string
  repo?: string
  title: string
  url: string
}
