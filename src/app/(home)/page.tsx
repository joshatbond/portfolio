import dev from '~/assets/web_dev.png'

import Img from './_components/Img'

export default function HomePage() {
  return (
    <article className="relative p-4 text-black">
      <div className="float-end flex h-full w-[40%] flex-col justify-center gap-4 text-neutral-100">
        {/* <h2 className='float-end flex h-full w-[40%] flex-col justify-center text-2xl font-semibold text-neutral-100'> */}
        <h2 className="text-2xl font-semibold">
          Greeting and salutations,
          <br />
          <span>I&apos;m Josh</span>
        </h2>

        <p className="max-w-[30ch] text-neutral-400">
          A full-stack web developer with a passion for building user-friendly
          and accessible websites.
        </p>
      </div>

      <div className="absolute -left-[8.5rem] bottom-[0.5rem] w-[600px]">
        <Img src={dev} alt="Web Development graphic" width={600} height={500} />
      </div>
    </article>
  )
}
