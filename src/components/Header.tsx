import Link from 'next/link'

import Github from '~/components/icons/Github'

export default function Header({ dark }: { dark?: boolean }) {
  return (
    <header className='bg-white/40 p-4 text-black'>
      <nav className='flex items-center justify-between'>
        <Link href='/'>
          <span className='text-2xl font-semibold'>A Cursed Tale</span>
        </Link>
        <div className='flex items-center gap-4'>
          <NavItem text='Projects' url='/projects' dark={dark} />

          <NavItem text='Resume' url='/resume' dark={dark} />

          <NavIcon
            text='Github'
            url='https://github.com/joshatbond'
            dark={dark}
          >
            <Github size={24} />
          </NavIcon>
        </div>
      </nav>
    </header>
  )
}

function NavItem({
  dark,
  text,
  url,
}: {
  text: string
  url: string
  dark?: boolean
}) {
  return (
    <span className='group relative inline-block'>
      <Link href={url}>
        <span>{text}</span>
        <span
          className={`group-hover:animate-text-wipe absolute inset-x-0 top-0 overflow-hidden pb-1 opacity-0 ${dark ? 'text-blue-600' : 'text-neutral-100'}`}
        >
          {text}
        </span>
        <span
          className={`group-hover:animate-text-wipe absolute inset-x-0 bottom-0 h-px opacity-0 ${dark ? 'bg-blue-600' : 'bg-neutral-100'}`}
        ></span>
      </Link>
    </span>
  )
}
function NavIcon({
  children,
  dark,
  text,
  url,
}: React.PropsWithChildren<{ text: string; url: string; dark?: boolean }>) {
  return (
    <span className='group relative inline-block'>
      <Link href={url} target='_blank'>
        <span className='sr-only'>{text}</span>
        <span>{children}</span>
        <span
          className={`group-hover:animate-text-wipe absolute inset-x-0 top-0 overflow-hidden pb-1 opacity-0 ${dark ? 'text-blue-600' : 'text-neutral-100'}`}
        >
          {children}
        </span>
      </Link>
    </span>
  )
}
