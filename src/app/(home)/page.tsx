import Img from './_components/Img'

export default function HomePage() {
  return (
    <article className='relative p-4 text-black'>
      <div className='float-end h-full flex flex-col w-[40%] justify-center text-neutral-100 gap-4'>
        {/* <h2 className='float-end flex h-full w-[40%] flex-col justify-center text-2xl font-semibold text-neutral-100'> */}
        <h2 className='font-semibold text-2xl'>
          Greeting and salutations,
          <br />
          <span>I&apos;m Josh</span>
        </h2>

        <p className='max-w-[30ch] text-neutral-400'>
          A full-stack web developer with a passion for building user-friendly
          and accessible websites.
        </p>
      </div>

      <Img />
    </article>
  )
}
