'use client'
/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.2.16 ./public/scene.gltf 
Author: tamminen (https://sketchfab.com/tamminen)
License: SKETCHFAB Standard (https://sketchfab.com/licenses)
Source: https://sketchfab.com/3d-models/crow-raven-lowpoly-animations-a96260298937444698e5183a62fc5afa
Title: Crow | Raven Lowpoly animations
*/

import React, { useEffect, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { GroupProps } from '@react-three/fiber'
import {
  BufferGeometry,
  Group,
  NormalBufferAttributes,
  Object3DEventMap,
  Skeleton,
} from 'three'

export default function Model(props: GroupProps) {
  const group = useRef<Group<Object3DEventMap>>(null)
  const { nodes, materials, animations } = useGLTF('/scene.gltf')
  const { actions, names } = useAnimations(animations, group)

  const object7 = nodes.Object_7
  const ob7Geometry =
    object7 && 'geometry' in object7
      ? (object7.geometry as BufferGeometry<NormalBufferAttributes>)
      : null
  const ob7Skeleton =
    object7 && 'skeleton' in object7 ? (object7.skeleton as Skeleton) : null

  useEffect(() => {
    const idleBeak = names[1]
    const idleWings = names[3]
    const interval = setInterval(() => {
      const rand = Math.random()
      if (rand < 0.1) {
        actions[idleBeak!]!.reset().fadeIn(0.5).play()
      }
      if (rand > 0.9) {
        actions[idleWings!]!.reset().fadeIn(0.5).play()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <group ref={group} {...props} dispose={null}>
      <group name='Sketchfab_Scene'>
        <group name='Sketchfab_model' scale={0.25}>
          <group name='root'>
            <group name='GLTF_SceneRootNode'>
              <group name='CrowArmature_13'>
                <group name='GLTF_created_0'>
                  {nodes.GLTF_created_0_rootJoint && (
                    <primitive object={nodes.GLTF_created_0_rootJoint} />
                  )}
                  <group name='Icosphere_12' />

                  {ob7Geometry && ob7Skeleton && (
                    <skinnedMesh
                      castShadow
                      name='Object_7'
                      geometry={ob7Geometry}
                      material={materials.Crow}
                      skeleton={ob7Skeleton}
                    />
                  )}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/scene.gltf')