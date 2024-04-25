'use client'
import Image from 'next/image'
import { useState } from 'react'
import dev from '~/assets/web_dev.png'

export default function Img() {
  const [done, doneAssign] = useState(false)
  return (
    <div className='absolute -left-[8.5rem] bottom-[0.5rem] w-[600px]'>
      <Image
        src={dev}
        className={done ? 'opacity-100' : 'opacity-0'}
        onLoadingComplete={() => doneAssign(true)}
        alt='Web Development graphic'
        width={600}
        height={500}
        onLoad={() => doneAssign(true)}
      />
    </div>
  )
}
