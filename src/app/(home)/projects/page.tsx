import Link from 'next/link'

import Accelerise from '~/assets/accelerise.jpg'
import Barbie from '~/assets/barbie.jpg'
import Bond from '~/assets/bond.jpg'
import Expend4bles from '~/assets/expend4bles.jpg'
import Grepl from '~/assets/grepl.png'
import Oppenheimer from '~/assets/oppenheimer.jpg'
import Skydance from '~/assets/skydance.png'
import TFT from '~/assets/tft-s10.webp'
import Watchers from '~/assets/watchers.jpg'
import Wr from '~/assets/wr.jpg'
import Share from '~/components/icons/Share'
import { resume } from '~/data/resume'

import Img from '../_components/Img'

export default function ProjectsPage() {
  return (
    <article className="space-y-4 p-4 pt-24 sm:overflow-y-auto sm:pt-4">
      <h2 className="text-center text-2xl font-semibold text-neutral-100">
        Behold! Some cool projects I&apos;ve worked on!
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {resume.projects.map(({ id, repo, title, url }) => (
          <div
            className="group min-w-[250px] rounded bg-white/20 p-2"
            key={url}
          >
            {id ? (
              <ProjectImage id={id} />
            ) : (
              <div className="aspect-video w-full rounded bg-slate-400" />
            )}

            <div className="flex justify-between pt-1">
              <Link href={url} target="_blank">
                <div className="flex gap-1 hover:text-blue-200">
                  <span>{title}</span>

                  <Share cn="w-3 h-3 mt-1.5 text-slate-200" />
                </div>
              </Link>

              <span className="hover:text-blue-200">
                {repo && (
                  <Link href={repo} target="_blank">
                    Repository
                  </Link>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}

function ProjectImage({ id }: { id: string }) {
  const imageUrl =
    id === 'accelerise'
      ? Accelerise
      : id === 'barbie'
        ? Barbie
        : id === 'bond'
          ? Bond
          : id === 'expend4bles'
            ? Expend4bles
            : id === 'grepl'
              ? Grepl
              : id === 'oppenheimer'
                ? Oppenheimer
                : id === 'skydance'
                  ? Skydance
                  : id === 'tft-s10'
                    ? TFT
                    : id === 'watchers'
                      ? Watchers
                      : Wr

  return (
    <div className="group relative overflow-hidden">
      <div className="absolute inset-0 bg-neutral-600"></div>

      <span className="relative">
        <Img
          src={imageUrl}
          alt={`${id} project image`}
          width={401}
          height={226}
          cn="object-fit aspect-video w-full rounded transition-transform group-hover:scale-[1.1] duration-300 ease-in-out"
        />
      </span>

      <div className="shine absolute inset-0" />
    </div>
  )
}
