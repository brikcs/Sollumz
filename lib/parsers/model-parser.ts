/**
 * Unified 3D model parser using three.js loaders.
 * Supports OBJ, FBX, GLB/GLTF.
 * Extracts geometry data (positions, normals, UVs, colors, indices)
 * grouped by material for YDR export.
 */

import * as THREE from "three"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import type { ParsedModel, ParsedMesh } from "../store"

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

/**
 * Parse a 3D model file and extract geometry data.
 */
export async function parseModelFile(file: File): Promise<ParsedModel> {
  const ext = getExtension(file.name)
  const arrayBuffer = await file.arrayBuffer()

  let scene: THREE.Group | THREE.Scene

  switch (ext) {
    case "obj": {
      const text = new TextDecoder().decode(arrayBuffer)
      const loader = new OBJLoader()
      scene = loader.parse(text)
      break
    }
    case "fbx": {
      const loader = new FBXLoader()
      scene = loader.parse(arrayBuffer, "")
      break
    }
    case "glb":
    case "gltf": {
      const loader = new GLTFLoader()
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.parse(arrayBuffer, "", resolve, reject)
      })
      scene = gltf.scene
      break
    }
    default:
      throw new Error(`Unsupported file format: .${ext}. Supported: .obj, .fbx, .glb, .gltf`)
  }

  return extractModelData(scene, file.name)
}

/**
 * Extract mesh data from a three.js scene graph, grouped by material.
 */
function extractModelData(root: THREE.Object3D, filename: string): ParsedModel {
  const materialMap = new Map<string, number>()
  const materialNames: string[] = []
  const meshes: ParsedMesh[] = []

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return

    // Apply world transform to geometry
    child.updateMatrixWorld(true)
    const geo = child.geometry.clone()
    geo.applyMatrix4(child.matrixWorld)

    // Ensure indexed geometry
    if (!geo.index) {
      const posCount = geo.attributes.position.count
      const indices = new Uint32Array(posCount)
      for (let i = 0; i < posCount; i++) indices[i] = i
      geo.setIndex(new THREE.BufferAttribute(indices, 1))
    }

    // Ensure normals exist
    if (!geo.attributes.normal) {
      geo.computeVertexNormals()
    }

    // Handle multi-material meshes (groups) or single material
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    const groups = geo.groups.length > 0 ? geo.groups : [{ start: 0, count: geo.index!.count, materialIndex: 0 }]

    for (const group of groups) {
      const matIdx = group.materialIndex ?? 0
      const mat = materials[matIdx] || materials[0]
      const matName = (mat && mat.name) ? mat.name : `Material_${materialNames.length}`

      // Register material
      if (!materialMap.has(matName)) {
        materialMap.set(matName, materialNames.length)
        materialNames.push(matName)
      }
      const globalMatIdx = materialMap.get(matName)!

      // Extract sub-mesh for this group
      const subMesh = extractSubMesh(geo, group.start, group.count, globalMatIdx, matName)
      if (subMesh) meshes.push(subMesh)
    }
  })

  // Fallback: if no materials found, add a default
  if (materialNames.length === 0) {
    materialNames.push("default")
  }

  // If no meshes found, something went wrong
  if (meshes.length === 0) {
    throw new Error("No mesh geometry found in the imported model.")
  }

  return {
    name: filename.replace(/\.[^/.]+$/, ""),
    meshes,
    materialNames,
  }
}

/**
 * Extract a sub-mesh from a BufferGeometry by index range.
 */
function extractSubMesh(
  geo: THREE.BufferGeometry,
  startIndex: number,
  count: number,
  materialIndex: number,
  materialName: string
): ParsedMesh | null {
  const indexAttr = geo.index
  if (!indexAttr) return null

  const srcIndices = indexAttr.array as Uint16Array | Uint32Array
  const srcPositions = geo.attributes.position
  const srcNormals = geo.attributes.normal
  const srcUvs = geo.attributes.uv
  const srcColors = geo.attributes.color

  // Collect unique vertices referenced by this group
  const vertexRemap = new Map<number, number>()
  const usedIndices: number[] = []

  for (let i = startIndex; i < startIndex + count; i++) {
    const origIdx = srcIndices[i]
    if (!vertexRemap.has(origIdx)) {
      vertexRemap.set(origIdx, vertexRemap.size)
    }
    usedIndices.push(vertexRemap.get(origIdx)!)
  }

  const vertexCount = vertexRemap.size
  if (vertexCount === 0) return null

  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  let colors: Float32Array | null = null

  if (srcColors) {
    const itemSize = srcColors.itemSize
    colors = new Float32Array(vertexCount * 4)
    for (const [origIdx, newIdx] of vertexRemap) {
      colors[newIdx * 4] = srcColors.getX(origIdx)
      colors[newIdx * 4 + 1] = srcColors.getY(origIdx)
      colors[newIdx * 4 + 2] = itemSize >= 3 ? srcColors.getZ(origIdx) : 0
      colors[newIdx * 4 + 3] = itemSize >= 4 ? srcColors.getW(origIdx) : 1
    }
  }

  for (const [origIdx, newIdx] of vertexRemap) {
    positions[newIdx * 3] = srcPositions.getX(origIdx)
    positions[newIdx * 3 + 1] = srcPositions.getY(origIdx)
    positions[newIdx * 3 + 2] = srcPositions.getZ(origIdx)

    if (srcNormals) {
      normals[newIdx * 3] = srcNormals.getX(origIdx)
      normals[newIdx * 3 + 1] = srcNormals.getY(origIdx)
      normals[newIdx * 3 + 2] = srcNormals.getZ(origIdx)
    }

    if (srcUvs) {
      uvs[newIdx * 2] = srcUvs.getX(origIdx)
      // GTA V UV convention: v is NOT flipped in the XML data (0 = top)
      uvs[newIdx * 2 + 1] = srcUvs.getY(origIdx)
    }
  }

  const indices = new Uint32Array(usedIndices)

  return {
    positions,
    normals,
    uvs,
    colors,
    indices,
    materialIndex,
    materialName,
  }
}
