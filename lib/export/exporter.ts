/**
 * Export pipeline: converts textures to DDS, generates YDR XML, bundles as ZIP.
 */

import JSZip from "jszip"
import { saveAs } from "file-saver"
import { encodeToDds } from "../formats/dds-encoder"
import { generateYdrXml, sanitizeTextureName } from "../formats/ydr-xml"
import type { TextureEntry } from "../formats/ydr-xml"
import type { ParsedModel, MaterialConfig } from "../store"
import type { DdsFormat } from "../formats/dds-encoder"

export interface ExportOptions {
  name: string
  model: ParsedModel
  materials: MaterialConfig[]
  onProgress: (step: string, percent: number) => void
}

export async function exportYdr(options: ExportOptions): Promise<void> {
  const { name, model, materials, onProgress } = options

  onProgress("Converting textures to DDS...", 5)

  // Collect all textures from all materials
  const textureEntries: TextureEntry[] = []
  const ddsFiles: Array<{ fileName: string; data: ArrayBuffer }> = []
  const processedTextures = new Map<string, TextureEntry>()

  let texCount = 0
  let totalTextures = 0
  for (const mat of materials) {
    for (const key of Object.keys(mat.textures)) {
      if (mat.textures[key]?.file) totalTextures++
    }
  }

  for (let matIdx = 0; matIdx < materials.length; matIdx++) {
    const mat = materials[matIdx]
    for (const [samplerName, slotData] of Object.entries(mat.textures)) {
      if (!slotData?.file) continue

      const texName = sanitizeTextureName(slotData.file.name)
      const ddsFileName = `${texName}.dds`

      // Skip if we already processed this texture
      if (processedTextures.has(texName)) {
        const existing = processedTextures.get(texName)!
        textureEntries.push({ ...existing, samplerName })
        continue
      }

      texCount++
      const percent = 5 + Math.round((texCount / Math.max(totalTextures, 1)) * 60)
      onProgress(`Converting texture ${texCount}/${totalTextures}: ${slotData.file.name}`, percent)

      try {
        const result = await encodeToDds(slotData.file)

        const entry: TextureEntry = {
          name: texName,
          samplerName,
          width: result.width,
          height: result.height,
          format: result.format as DdsFormat,
          fileName: ddsFileName,
        }

        textureEntries.push(entry)
        ddsFiles.push({ fileName: ddsFileName, data: result.dds })
        processedTextures.set(texName, entry)
      } catch (err) {
        console.error(`Failed to convert texture: ${slotData.file.name}`, err)
        // Skip this texture but continue
      }
    }
  }

  // Generate YDR XML
  onProgress("Generating YDR XML...", 70)
  const xmlContent = generateYdrXml({
    name,
    model,
    materials,
    textures: textureEntries,
  })

  // Create ZIP
  onProgress("Creating ZIP archive...", 85)
  const zip = new JSZip()

  // Add the XML file
  zip.file(`${name}.ydr.xml`, xmlContent)

  // Add DDS textures in a subfolder
  for (const dds of ddsFiles) {
    zip.file(`${name}/${dds.fileName}`, dds.data)
  }

  // Generate and download ZIP
  onProgress("Downloading...", 95)
  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })

  saveAs(blob, `${name}.zip`)
  onProgress("Export complete!", 100)
}
