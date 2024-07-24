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
  ],
  experience: [
    {
      from: 'Jan 23',
      to: 'Mar 24',
      title: 'Software Engineer',
      company: { title: 'Bond', link: 'https://www.wearebond.com' },
      description: [
        'Contributed to the technical effort by developing custom sites for upcoming gaming and entertainment projects, while collaborating cross-functionally with Development and Design teams, and delivering clean and scalable code in JavaScript with Vue.js and Nuxt.js.',
        'Developed the Barbie Selfie Generator, enabling users to upload portraits and customize movie posters as Barbie/Ken, utilizing Nuxt.js, Vue 2, Automated CI, and AWS deployment, leading to an interactive and personalized user experience which reached viral status and attracted over 2 million site visits within the first 24 hours.',
        "Contributed to the Oppenheimer movie site as a secondary engineer, incorporating 3D animations with three.js for exploring movie locations and characters, and implementing a multi-phase launch sequence, enhancing user engagement with the film's historical context.",
        'Assisted in creating "The Watchers" movie site by integrating looping videos with location-based transitions according to the user\'s timezone, and supported "League of Legends" projects including Remix Rumble and the Wild Rift Anniversary Site, by developing mini-experiences and interactive fan engagement sites',
        'Evaluated software solutions, deploying suites of tests including visual regression and cross-browser compatibility testing, utilizing browser emulation, BrowserStack, and Cypress for automating the visual regression testing to ensure thorough coverage and functionality across multiple platforms.',
        'Deployed using GitHub Actions for testing environments and AWS for sharing production builds with clients.',
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
        'Architected the transition of a monolithic GraphQL repository to a federated model with Apollo Federation, establishing metrics for the phased roll-out and creating middleware to time query execution and accuracy, feeding data into a Kafka event queue, while focusing on caching middleware.',
        'Developed Express.js middleware to intercept and log requests and responses within a mono repository architecture, utilizing Kafka for caching mechanisms, ensuring a fast data retrieval performance.',
        'Created clear, concise and user-friendly documentation, and wrote & maintained clean code with commenting for others to read, understand and collaborate easily.',
        'Collaborated within a project team during sprint stand-ups on a greenfield project, maintaining focused communication and effectively addressing questions to clarify project details and ensure alignment.',
        'Engaged in continuous learning and professional development, the team emphasized the mastery of GraphQL to become a Subject Matter Expert (SME), ensuring the integration of this advanced technology into the development process.',
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
        'Built a mobile application allowing agencies to securely upload digital evidence, featuring encrypted data transmission and a user-friendly interface, integrating a multi-tenant authorization service, native iOS/Android modules for capturing RAW images hashed with SHA-256, and a secure file transfer system to maintain chain-of-custody.',
        'Overhauled the DIMS software by integrating a React SPA with Apollo client for dynamic database fetching on the front-end, customizable for each client, and employing a Fastify server, Neo4j database, Redis for caching and JWT session management on the back-end, all aligned with CLEAN architecture principles for scalability and evolvability.',
        'Developed a robust Node.js server on a custom-built Gentoo Linux box, incorporating Docker Swarm to dynamically manage node servers based on demand, and integrated asynchronous programming, event-driven architecture, and error handling mechanisms to systematically collect, process, and securely retain digital evidence while ensuring data redundancy across multiple on-premises servers using CRON jobs and RSYNC.',
      ],
    },
  ],
  links: [
    { url: 'https://github.com/joshatbond', to: 'GH' },
    { url: 'https://portfolio.cursedtale.com', to: 'CV' },
  ],
  objective: [
    'Full-Stack Web developer with a wealth of experience delivering complex solutions including entertainment web applications and inventory management systems within fast-paced environments.',
    'Extensive technical skill set, with mastery in JavaScript, TypeScript, and Node.js; proficient in cloud services (Docker, Traefik) and databases (PostgreSQL, MongoDB), enhancing infrastructure reliability and performance.',
    'Impactful contributions during each phase of the Software Development Life Cycle, from architectural design to deployment and optimization, using blue-green deployments and canary releases for efficient system performance.',
    'Engaged collaborator with strong interpersonal skills, able to influence and align multiple teams with conflicting priorities to drive progress under aggressive time constraints.',
  ],
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
      url: 'https://web.archive.org/web/20240510130935/https://www.oppenheimermovie.com/',
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
  objective: string[]
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
