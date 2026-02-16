"use client"

import { useRef, useEffect, useMemo } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Grid } from "@react-three/drei"
import * as THREE from "three"
import { useAppStore } from "@/lib/store"

function SceneModel() {
  const parsedModel = useAppStore((s) => s.parsedModel)
  const materials = useAppStore((s) => s.materials)
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  const textureMap = useMemo(() => {
    const map = new Map<string, THREE.Texture>()
    for (const mat of materials) {
      for (const [, slot] of Object.entries(mat.textures)) {
        if (slot.previewUrl && !map.has(slot.previewUrl)) {
          const tex = new THREE.TextureLoader().load(slot.previewUrl)
          tex.flipY = true
          tex.colorSpace = THREE.SRGBColorSpace
          map.set(slot.previewUrl, tex)
        }
      }
    }
    return map
  }, [materials])

  const sceneObjects = useMemo(() => {
    if (!parsedModel) return null
    const objects: Array<{
      geometry: THREE.BufferGeometry
      materialIndex: number
    }> = []

    for (const mesh of parsedModel.meshes) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3))
      geo.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3))
      if (mesh.uvs.length > 0) {
        const previewUvs = new Float32Array(mesh.uvs.length)
        for (let i = 0; i < mesh.uvs.length; i += 2) {
          previewUvs[i] = mesh.uvs[i]
          previewUvs[i + 1] = 1.0 - mesh.uvs[i + 1]
        }
        geo.setAttribute("uv", new THREE.BufferAttribute(previewUvs, 2))
      }
      if (mesh.colors) {
        geo.setAttribute("color", new THREE.BufferAttribute(mesh.colors, 4))
      }
      geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
      geo.computeBoundingBox()
      objects.push({ geometry: geo, materialIndex: mesh.materialIndex })
    }
    return objects
  }, [parsedModel])

  useEffect(() => {
    if (!sceneObjects || sceneObjects.length === 0 || !groupRef.current) return
    const box = new THREE.Box3()
    for (const obj of sceneObjects) {
      const b = obj.geometry.boundingBox
      if (b) box.union(b)
    }
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const dist = maxDim * 2

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.7)
      camera.lookAt(center)
      camera.near = 0.01
      camera.far = maxDim * 100
      camera.updateProjectionMatrix()
    }
  }, [sceneObjects, camera])

  if (!sceneObjects) return null

  return (
    <group ref={groupRef}>
      {sceneObjects.map((obj, idx) => {
        const matConfig = materials[obj.materialIndex]
        const diffuseSlot = matConfig?.textures?.["DiffuseSampler"]
        const tex = diffuseSlot?.previewUrl ? textureMap.get(diffuseSlot.previewUrl) : null

        return (
          <mesh key={idx} geometry={obj.geometry}>
            <meshStandardMaterial
              color={tex ? "#ffffff" : "#8a8a8a"}
              map={tex || null}
              roughness={0.7}
              metalness={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <directionalLight position={[-3, 4, -5]} intensity={0.4} />
      <SceneModel />
      <Grid
        args={[100, 100]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a1a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2a2a"
        fadeDistance={50}
        fadeStrength={1.5}
        infiniteGrid
        position={[0, 0, 0]}
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={0.1} maxDistance={500} />
    </>
  )
}

export function ModelViewer() {
  const parsedModel = useAppStore((s) => s.parsedModel)

  return (
    <div className="flex-1 relative" style={{ background: "hsl(0, 0%, 5%)" }}>
      {!parsedModel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <p className="text-muted-foreground text-sm">Import a model to preview</p>
        </div>
      )}
      <Canvas
        camera={{ fov: 50, near: 0.01, far: 10000, position: [3, 2, 3] }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#0d0d0d"))
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
