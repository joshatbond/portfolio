'use client'

import { Canvas } from '@react-three/fiber'

import Crow from './Crow'

export default function Logo() {
  return (
    <Canvas shadows camera={{ position: [1, 2, 1.5], fov: 50 }}>
      <ambientLight intensity={0.5} />

      <group position={[0.5, 0.3, 0.5]} rotation={[-0.87, 3.13, -0.24]}>
        <Crow />
      </group>
    </Canvas>
  )
}
