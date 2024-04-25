'use client'
import Image, { StaticImageData } from 'next/image'
import { useState } from 'react'

export default function Img(props: {
  alt: string
  height: number
  src: StaticImageData
  width: number
}) {
  const [loaded, loadedAssign] = useState(false)
  return (
    <Image
      className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
      onLoadingComplete={() => loadedAssign(true)}
      {...props}
    />
  )
}
