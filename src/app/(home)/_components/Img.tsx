'use client'
import Image, { type StaticImageData } from 'next/image'
import { useState } from 'react'

export default function Img(props: {
  alt: string
  height: number
  src: StaticImageData
  width: number
  cn?: string
}) {
  const [loaded, loadedAssign] = useState(false)
  return (
    <Image
      className={`transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}${props.cn ? ` ${props.cn}` : ''}`}
      onLoadingComplete={() => loadedAssign(true)}
      {...props}
    />
  )
}
