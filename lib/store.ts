import { create } from "zustand"
import { DEFAULT_SHADER, SHADER_MAP } from "./shaders/shader-defs"

// ---- Types ----

export interface ParsedMesh {
  /** Vertex positions (3 floats per vertex: x, y, z) */
  positions: Float32Array
  /** Vertex normals (3 floats per vertex: nx, ny, nz) */
  normals: Float32Array
  /** Texture coordinates (2 floats per vertex: u, v) - GTA V convention: v is NOT flipped */
  uvs: Float32Array
  /** Vertex colors (4 floats per vertex: r, g, b, a in 0-1 range), or null */
  colors: Float32Array | null
  /** Triangle indices */
  indices: Uint32Array
  /** Index into the materials array */
  materialIndex: number
  /** Original material name from the model */
  materialName: string
}

export interface ParsedModel {
  name: string
  meshes: ParsedMesh[]
  materialNames: string[]
}

export interface TextureSlotData {
  file: File | null
  previewUrl: string | null
  width: number
  height: number
}

export interface MaterialConfig {
  name: string
  shaderName: string
  textures: Record<string, TextureSlotData>
}

export interface ExportProgress {
  step: string
  percent: number
}

interface AppState {
  parsedModel: ParsedModel | null
  materials: MaterialConfig[]
  exportProgress: ExportProgress | null
  exportName: string

  importModel: (model: ParsedModel) => void
  updateMaterialShader: (index: number, shaderFilename: string) => void
  updateMaterialTexture: (index: number, samplerName: string, data: TextureSlotData) => void
  setExportProgress: (progress: ExportProgress | null) => void
  setExportName: (name: string) => void
  reset: () => void
}

function createDefaultMaterialConfig(name: string): MaterialConfig {
  return {
    name,
    shaderName: DEFAULT_SHADER.filename,
    textures: {},
  }
}

export const useAppStore = create<AppState>((set) => ({
  parsedModel: null,
  materials: [],
  exportProgress: null,
  exportName: "prop",

  importModel: (model) => {
    set({
      parsedModel: model,
      exportName: model.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_") || "prop",
      materials: model.materialNames.map((name) => createDefaultMaterialConfig(name)),
    })
  },

  updateMaterialShader: (index, shaderFilename) => {
    set((state) => {
      const materials = [...state.materials]
      if (!materials[index]) return state
      const shaderDef = SHADER_MAP.get(shaderFilename)
      if (!shaderDef) return state

      // Keep textures that match the new shader's params, discard others
      const oldTextures = materials[index].textures
      const newTextures: Record<string, TextureSlotData> = {}
      for (const param of shaderDef.textureParams) {
        if (oldTextures[param.name]) {
          newTextures[param.name] = oldTextures[param.name]
        }
      }

      materials[index] = {
        ...materials[index],
        shaderName: shaderFilename,
        textures: newTextures,
      }
      return { materials }
    })
  },

  updateMaterialTexture: (index, samplerName, data) => {
    set((state) => {
      const materials = [...state.materials]
      if (!materials[index]) return state
      materials[index] = {
        ...materials[index],
        textures: {
          ...materials[index].textures,
          [samplerName]: data,
        },
      }
      return { materials }
    })
  },

  setExportProgress: (progress) => set({ exportProgress: progress }),
  setExportName: (name) => set({ exportName: name }),

  reset: () => {
    set({
      parsedModel: null,
      materials: [],
      exportProgress: null,
      exportName: "prop",
    })
  },
}))
