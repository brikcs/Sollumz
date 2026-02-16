/**
 * CodeWalker YDR XML generator.
 *
 * Generates valid .ydr.xml files that can be opened directly by CodeWalker
 * and compiled to binary .ydr format. The XML structure exactly matches
 * what Sollumz outputs and what CodeWalker expects.
 */

import type { ParsedModel, MaterialConfig } from "../store"
import { SHADER_MAP, DEFAULT_SHADER } from "../shaders/shader-defs"
import type { DdsFormat } from "./dds-encoder"
import { getDdsFormatString } from "./dds-encoder"

export interface TextureEntry {
  name: string
  samplerName: string
  width: number
  height: number
  format: DdsFormat
  fileName: string
}

export interface YdrXmlOptions {
  name: string
  model: ParsedModel
  materials: MaterialConfig[]
  textures: TextureEntry[]
}

/**
 * Generate the complete YDR XML string.
 */
export function generateYdrXml(opts: YdrXmlOptions): string {
  const { name, model, materials, textures } = opts

  // Compute global bounding box
  const bbox = computeBoundingBox(model)
  const center = {
    x: (bbox.min.x + bbox.max.x) / 2,
    y: (bbox.min.y + bbox.max.y) / 2,
    z: (bbox.min.z + bbox.max.z) / 2,
  }

  // Sphere radius = distance from center to farthest point
  let maxDist = 0
  for (const mesh of model.meshes) {
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const dx = mesh.positions[i] - center.x
      const dy = mesh.positions[i + 1] - center.y
      const dz = mesh.positions[i + 2] - center.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist > maxDist) maxDist = dist
    }
  }

  const lines: string[] = []
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`)
  lines.push(`<Drawable>`)
  lines.push(`  <Name>${escXml(name)}</Name>`)
  lines.push(`  <BoundingSphereCenter x="${f(center.x)}" y="${f(center.y)}" z="${f(center.z)}" />`)
  lines.push(`  <BoundingSphereRadius value="${f(maxDist)}" />`)
  lines.push(`  <BoundingBoxMin x="${f(bbox.min.x)}" y="${f(bbox.min.y)}" z="${f(bbox.min.z)}" />`)
  lines.push(`  <BoundingBoxMax x="${f(bbox.max.x)}" y="${f(bbox.max.y)}" z="${f(bbox.max.z)}" />`)
  lines.push(`  <LodDistHigh value="9998" />`)
  lines.push(`  <LodDistMed value="9998" />`)
  lines.push(`  <LodDistLow value="9998" />`)
  lines.push(`  <LodDistVlow value="9998" />`)
  lines.push(`  <FlagsHigh value="1" />`)
  lines.push(`  <FlagsMed value="0" />`)
  lines.push(`  <FlagsLow value="0" />`)
  lines.push(`  <FlagsVlow value="0" />`)
  lines.push(`  <Unknown9A value="9998" />`)

  // Shader Group
  lines.push(`  <ShaderGroup>`)
  lines.push(`    <Unknown30 value="8" />`)

  // Texture Dictionary
  lines.push(`    <TextureDictionary>`)
  for (const tex of textures) {
    lines.push(`      <Item>`)
    lines.push(`        <Name>${escXml(tex.name)}</Name>`)
    lines.push(`        <Unk32 value="0" />`)
    lines.push(`        <Usage>UNKNOWN</Usage>`)
    lines.push(`        <ExtraFlags value="0" />`)
    lines.push(`        <Width value="${tex.width}" />`)
    lines.push(`        <Height value="${tex.height}" />`)
    lines.push(`        <MipLevels value="1" />`)
    lines.push(`        <Format>${getDdsFormatString(tex.format)}</Format>`)
    lines.push(`        <FileName>${escXml(tex.fileName)}</FileName>`)
    lines.push(`      </Item>`)
  }
  lines.push(`    </TextureDictionary>`)

  // Shaders
  lines.push(`    <Shaders>`)
  for (const mat of materials) {
    const shaderDef = SHADER_MAP.get(mat.shaderName) || DEFAULT_SHADER
    const shaderDisplayName = mat.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()
    lines.push(`      <Item>`)
    lines.push(`        <Name>${escXml(shaderDisplayName)}</Name>`)
    lines.push(`        <FileName>${escXml(shaderDef.filename)}</FileName>`)
    lines.push(`        <RenderBucket value="${shaderDef.renderBucket}" />`)
    lines.push(`        <Parameters>`)

    // Texture parameters
    for (const tp of shaderDef.textureParams) {
      const tex = textures.find(
        (t) => t.samplerName === tp.name && materials.indexOf(mat) === textures.indexOf(t) - textures.findIndex((tt) => tt.samplerName === tp.name)
      ) || textures.find((t) => {
        // Find the texture assigned to this material + sampler
        const matIdx = materials.indexOf(mat)
        const matTexData = mat.textures[tp.name]
        if (!matTexData || !matTexData.file) return false
        const texName = sanitizeTextureName(matTexData.file.name)
        return t.name === texName && t.samplerName === tp.name
      })

      if (tex) {
        lines.push(`          <Item name="${tp.name}" type="Texture">`)
        lines.push(`            <Name>${escXml(tex.name)}</Name>`)
        lines.push(`          </Item>`)
      } else {
        // Write placeholder with empty name
        lines.push(`          <Item name="${tp.name}" type="Texture">`)
        lines.push(`            <Name />`)
        lines.push(`          </Item>`)
      }
    }

    // Vector parameters
    for (const vp of shaderDef.vectorParams) {
      lines.push(`          <Item name="${vp.name}" type="Vector" x="${f(vp.x)}" y="${f(vp.y)}" z="${f(vp.z)}" w="${f(vp.w)}" />`)
    }

    lines.push(`        </Parameters>`)
    lines.push(`      </Item>`)
  }
  lines.push(`    </Shaders>`)
  lines.push(`  </ShaderGroup>`)

  // Drawable Models High LOD
  lines.push(`  <DrawableModelsHigh>`)
  lines.push(`    <Item>`)
  lines.push(`      <RenderMask value="255" />`)
  lines.push(`      <Flags value="0" />`)
  lines.push(`      <HasSkin value="0" />`)
  lines.push(`      <BoneIndex value="0" />`)
  lines.push(`      <Unknown1 value="0" />`)
  lines.push(`      <Geometries>`)

  for (const mesh of model.meshes) {
    const meshBbox = computeMeshBoundingBox(mesh.positions)
    const shaderIndex = mesh.materialIndex
    const matConfig = materials[shaderIndex]
    const shaderDef = matConfig ? SHADER_MAP.get(matConfig.shaderName) || DEFAULT_SHADER : DEFAULT_SHADER

    lines.push(`        <Item>`)
    lines.push(`          <ShaderIndex value="${shaderIndex}" />`)
    lines.push(`          <BoundingBoxMin x="${f(meshBbox.min.x)}" y="${f(meshBbox.min.y)}" z="${f(meshBbox.min.z)}" />`)
    lines.push(`          <BoundingBoxMax x="${f(meshBbox.max.x)}" y="${f(meshBbox.max.y)}" z="${f(meshBbox.max.z)}" />`)

    // Vertex Buffer
    lines.push(`          <VertexBuffer>`)
    lines.push(`            <Flags value="0" />`)
    lines.push(`            <Layout type="GTAV1">`)
    lines.push(`              <Position />`)
    lines.push(`              <Normal />`)
    lines.push(`              <Colour0 />`)
    lines.push(`              <TexCoord0 />`)
    if (shaderDef.needsTangent) {
      lines.push(`              <Tangent />`)
    }
    lines.push(`            </Layout>`)
    lines.push(`            <Data>`)

    const vertCount = mesh.positions.length / 3
    for (let v = 0; v < vertCount; v++) {
      const px = mesh.positions[v * 3]
      const py = mesh.positions[v * 3 + 1]
      const pz = mesh.positions[v * 3 + 2]
      const nx = mesh.normals[v * 3]
      const ny = mesh.normals[v * 3 + 1]
      const nz = mesh.normals[v * 3 + 2]

      // Colors (0-255 range)
      let cr = 255, cg = 255, cb = 255, ca = 255
      if (mesh.colors) {
        cr = Math.round(mesh.colors[v * 4] * 255)
        cg = Math.round(mesh.colors[v * 4 + 1] * 255)
        cb = Math.round(mesh.colors[v * 4 + 2] * 255)
        ca = Math.round(mesh.colors[v * 4 + 3] * 255)
      }

      // UVs
      const u = mesh.uvs.length > 0 ? mesh.uvs[v * 2] : 0
      const vCoord = mesh.uvs.length > 0 ? mesh.uvs[v * 2 + 1] : 0

      let line = `              ${f(px)} ${f(py)} ${f(pz)}   ${f(nx)} ${f(ny)} ${f(nz)}   ${cr} ${cg} ${cb} ${ca}   ${f(u)} ${f(vCoord)}`

      // Tangent (computed as cross product of normal and up, or a default)
      if (shaderDef.needsTangent) {
        const tangent = computeTangent(nx, ny, nz)
        line += `   ${f(tangent[0])} ${f(tangent[1])} ${f(tangent[2])} ${f(tangent[3])}`
      }

      lines.push(line)
    }

    lines.push(`            </Data>`)
    lines.push(`          </VertexBuffer>`)

    // Index Buffer
    lines.push(`          <IndexBuffer>`)
    const indexChunks: string[] = []
    const indices = mesh.indices
    for (let i = 0; i < indices.length; i += 24) {
      const chunk = Array.from(indices.slice(i, Math.min(i + 24, indices.length)))
      indexChunks.push(`              ${chunk.join(" ")}`)
    }
    lines.push(`            <Data>`)
    for (const chunk of indexChunks) {
      lines.push(chunk)
    }
    lines.push(`            </Data>`)
    lines.push(`          </IndexBuffer>`)

    lines.push(`        </Item>`)
  }

  lines.push(`      </Geometries>`)
  lines.push(`    </Item>`)
  lines.push(`  </DrawableModelsHigh>`)
  lines.push(`  <Lights />`)
  lines.push(`</Drawable>`)

  return lines.join("\n")
}

// ---- Helpers ----

function computeBoundingBox(model: ParsedModel) {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (const mesh of model.meshes) {
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i]
      const y = mesh.positions[i + 1]
      const z = mesh.positions[i + 2]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (z < minZ) minZ = z
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      if (z > maxZ) maxZ = z
    }
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

function computeMeshBoundingBox(positions: Float32Array) {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  }
}

function computeTangent(nx: number, ny: number, nz: number): [number, number, number, number] {
  // Compute tangent from normal using a reference vector
  const up = Math.abs(ny) < 0.999 ? [0, 1, 0] : [1, 0, 0]
  // tangent = cross(normal, up)
  let tx = ny * up[2] - nz * up[1]
  let ty = nz * up[0] - nx * up[2]
  let tz = nx * up[1] - ny * up[0]
  const len = Math.sqrt(tx * tx + ty * ty + tz * tz)
  if (len > 0.0001) {
    tx /= len
    ty /= len
    tz /= len
  }
  return [tx, ty, tz, 1.0]
}

export function sanitizeTextureName(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
}

function f(n: number): string {
  // Format number with enough precision
  if (Number.isInteger(n)) return n.toFixed(1)
  const s = n.toFixed(7)
  // Remove trailing zeros but keep at least one decimal
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ".0")
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
