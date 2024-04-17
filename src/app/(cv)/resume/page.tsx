import Link from 'next/link'

import GithubIcon from '~/components/icons/Github'
import MailIcon from '~/components/icons/Mail'
import PhoneIcon from '~/components/icons/Phone'
import PinIcon from '~/components/icons/Pin'
import {
  type Contact,
  type Education,
  type Experience,
  type Skill,
  type Link as TLink,
  resume,
} from '~/data/resume'

export default function ResumePage() {
  return (
    <article className="flex-1">
      <h1 className="py-4 text-center text-3xl">Joshua Richardson</h1>

      <section className="flex w-full px-10 print:h-full print:px-0 print:text-[8pt]">
        <aside className="w-1/3 bg-slate-400 p-4">
          <Section title="Contact">
            {resume.contact.map((item, index) => (
              <Contact {...item} key={index} />
            ))}
          </Section>

          <Section title="Links">
            {resume.links.map((item, index) => (
              <LinkItem {...item} key={index} />
            ))}
          </Section>

          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill, index) => (
                <Skill {...skill} key={index} />
              ))}
            </div>
          </Section>
        </aside>

        <div className="flex-1 bg-neutral-200 p-4 text-neutral-900">
          <Section title="Professional Summary" light>
            <p>{resume.objective}</p>
          </Section>

          <Section title="Experience" light>
            {resume.experience.map((item, index) => (
              <Experience {...item} key={index} />
            ))}
          </Section>

          <Section title="Education" light>
            {resume.education.map((item, index) => (
              <Education {...item} key={index} />
            ))}
          </Section>
        </div>
      </section>
    </article>
  )
}

function Section({
  children,
  light,
  title,
}: React.PropsWithChildren<{ light?: boolean; title: string }>) {
  return (
    <div className="mb-2">
      <h2
        className={`mb-4 border-b-2 pb-1 text-2xl ${light ? 'border-slate-600' : 'border-neutral-50'}`}
      >
        {title}
      </h2>

      <div className="ml-6 flex flex-col gap-2 print:ml-0">{children}</div>
    </div>
  )
}

function Contact({ icon, text }: Contact) {
  return (
    <div>
      {icon === 'mail' ? (
        <Link href={`mailto:${text}?subject=Resume Inquiry`}>
          <MailIcon />
          <span>{text}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-4">
          {icon === 'phone' ? <PhoneIcon /> : <PinIcon />}
          <span>{text}</span>
        </div>
      )}
    </div>
  )
}

function LinkItem({ url }: TLink) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative flex max-w-min overflow-hidden text-clip rounded bg-neutral-300 text-black print:bg-transparent">
        <div className="flex items-center gap-2 px-3">
          <span className="print:hidden">
            <GithubIcon size={16} />
          </span>

          <Link href={url} target="_blank">
            <span className="print:text-sm print:text-black print:no-underline">
              {url}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function Skill({ name, time, type }: Skill) {
  return (
    <div
      className={`rounded-lg
        ${
          type === 'g'
            ? 'bg-neutral-300'
            : type === 'f'
              ? 'bg-indigo-500'
              : type === 'b'
                ? 'bg-sky-700'
                : 'bg-gradient-to-r from-sky-700 to-indigo-500'
        } ${type === 'g' ? 'text-neutral-900' : 'text-neutral-100'} max-w-fit px-2 py-2 text-xs`}
    >
      {name}
      <span
        className={`rounded-full ${type === 'g' ? 'bg-black/30 text-neutral-100' : 'bg-white/30 text-neutral-900'} ml-2 h-6 w-6 px-2 py-1 font-thin`}
      >
        {time}y
      </span>
    </div>
  )
}

function Experience({ company, description, from, title, to }: Experience) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="mb-0 text-sky-700">
          <span className="mr-2 font-medium text-neutral-900">{title}</span>
          <Link href={company.link} target="_blank">
            {company.title}
          </Link>
        </p>
        <span>
          {from} - {to}
        </span>
      </div>

      <ul className="mb-4 ml-10 list-disc">
        {description.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function Education({ name, type, where }: Education) {
  return (
    <div>
      <h2 className="text-lg font-medium text-slate-700">{type}</h2>

      <div className="space-x-4 text-sm">
        <span>{name}</span>
        <span className="text-neutral-500">{where}</span>
      </div>
    </div>
  )
}
