/** GTA V Shader Definitions for YDR export.
 *
 * Based on Sollumz ShaderManager and CodeWalker shader definitions.
 * Each shader defines its filename, render bucket, texture parameters,
 * and default vector parameters exactly matching what CodeWalker expects.
 */

export interface TextureParam {
  name: string
  label: string
  description: string
}

export interface VectorParam {
  name: string
  x: number
  y: number
  z: number
  w: number
}

export interface ShaderDef {
  filename: string
  displayName: string
  category: string
  renderBucket: number
  textureParams: TextureParam[]
  vectorParams: VectorParam[]
  /** Whether the vertex layout should include Tangent (for normal maps) */
  needsTangent: boolean
}

// Common vector parameters shared by most shaders
const COMMON_VECTOR_PARAMS: VectorParam[] = [
  { name: "matMaterialColorScale", x: 1, y: 0, z: 0, w: 1 },
  { name: "HardAlphaBlend", x: 1, y: 0, z: 0, w: 0 },
  { name: "useTessellation", x: 0, y: 0, z: 0, w: 0 },
  { name: "wetnessMultiplier", x: 1, y: 0, z: 0, w: 0 },
  { name: "globalAnimUV1", x: 0, y: 1, z: 0, w: 0 },
  { name: "globalAnimUV0", x: 1, y: 0, z: 0, w: 0 },
]

const SPEC_PARAMS: VectorParam[] = [
  { name: "specularIntensityMult", x: 0.125, y: 0, z: 0, w: 0 },
  { name: "specularFalloffMult", x: 100, y: 0, z: 0, w: 0 },
  { name: "specularFresnel", x: 0.97, y: 0, z: 0, w: 0 },
]

const NORMAL_SPEC_PARAMS: VectorParam[] = [
  ...SPEC_PARAMS,
  { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 },
]

const EMISSIVE_PARAMS: VectorParam[] = [
  { name: "emissiveMultiplier", x: 1, y: 0, z: 0, w: 0 },
]

const DETAIL_PARAMS: VectorParam[] = [
  { name: "detailSettings", x: 0, y: 0, z: 0, w: 1 },
]

// Texture param presets
const DIFFUSE_ONLY: TextureParam[] = [
  { name: "DiffuseSampler", label: "Diffuse", description: "Base color / albedo texture" },
]

const DIFFUSE_BUMP: TextureParam[] = [
  ...DIFFUSE_ONLY,
  { name: "BumpSampler", label: "Normal Map", description: "Normal/bump map texture" },
]

const DIFFUSE_SPEC: TextureParam[] = [
  ...DIFFUSE_ONLY,
  { name: "SpecSampler", label: "Specular", description: "Specular map texture" },
]

const DIFFUSE_BUMP_SPEC: TextureParam[] = [
  ...DIFFUSE_ONLY,
  { name: "BumpSampler", label: "Normal Map", description: "Normal/bump map texture" },
  { name: "SpecSampler", label: "Specular", description: "Specular map texture" },
]

const DIFFUSE_BUMP_SPEC_DETAIL: TextureParam[] = [
  ...DIFFUSE_BUMP_SPEC,
  { name: "DetailSampler", label: "Detail", description: "Detail texture overlay" },
]

// ---- Shader definitions ----

export const ALL_SHADERS: ShaderDef[] = [
  // === Standard ===
  {
    filename: "default.sps",
    displayName: "Default",
    category: "Standard",
    renderBucket: 0,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal.sps",
    displayName: "Normal",
    category: "Standard",
    renderBucket: 0,
    textureParams: DIFFUSE_BUMP,
    vectorParams: [...COMMON_VECTOR_PARAMS, { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 }],
    needsTangent: true,
  },
  {
    filename: "spec.sps",
    displayName: "Specular",
    category: "Standard",
    renderBucket: 0,
    textureParams: DIFFUSE_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...SPEC_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_spec.sps",
    displayName: "Normal + Specular",
    category: "Standard",
    renderBucket: 0,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },
  {
    filename: "normal_spec_detail.sps",
    displayName: "Normal + Spec + Detail",
    category: "Standard",
    renderBucket: 0,
    textureParams: DIFFUSE_BUMP_SPEC_DETAIL,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS, ...DETAIL_PARAMS],
    needsTangent: true,
  },
  {
    filename: "normal_detail.sps",
    displayName: "Normal + Detail",
    category: "Standard",
    renderBucket: 0,
    textureParams: [
      ...DIFFUSE_BUMP,
      { name: "DetailSampler", label: "Detail", description: "Detail texture overlay" },
    ],
    vectorParams: [...COMMON_VECTOR_PARAMS, { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 }, ...DETAIL_PARAMS],
    needsTangent: true,
  },
  {
    filename: "spec_detail.sps",
    displayName: "Specular + Detail",
    category: "Standard",
    renderBucket: 0,
    textureParams: [
      ...DIFFUSE_SPEC,
      { name: "DetailSampler", label: "Detail", description: "Detail texture overlay" },
    ],
    vectorParams: [...COMMON_VECTOR_PARAMS, ...SPEC_PARAMS, ...DETAIL_PARAMS],
    needsTangent: false,
  },

  // === Transparent / Alpha ===
  {
    filename: "alpha.sps",
    displayName: "Alpha",
    category: "Transparent",
    renderBucket: 1,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_spec_alpha.sps",
    displayName: "Normal + Spec + Alpha",
    category: "Transparent",
    renderBucket: 1,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },
  {
    filename: "normal_alpha.sps",
    displayName: "Normal + Alpha",
    category: "Transparent",
    renderBucket: 1,
    textureParams: DIFFUSE_BUMP,
    vectorParams: [...COMMON_VECTOR_PARAMS, { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 }],
    needsTangent: true,
  },
  {
    filename: "spec_alpha.sps",
    displayName: "Specular + Alpha",
    category: "Transparent",
    renderBucket: 1,
    textureParams: DIFFUSE_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...SPEC_PARAMS],
    needsTangent: false,
  },

  // === Cutout ===
  {
    filename: "cutout_fence.sps",
    displayName: "Cutout Fence",
    category: "Cutout",
    renderBucket: 3,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_cutout_fence.sps",
    displayName: "Normal + Cutout Fence",
    category: "Cutout",
    renderBucket: 3,
    textureParams: DIFFUSE_BUMP,
    vectorParams: [...COMMON_VECTOR_PARAMS, { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 }],
    needsTangent: true,
  },
  {
    filename: "normal_spec_cutout_fence.sps",
    displayName: "Normal + Spec + Cutout",
    category: "Cutout",
    renderBucket: 3,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },

  // === Decal ===
  {
    filename: "decal.sps",
    displayName: "Decal",
    category: "Decal",
    renderBucket: 2,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_decal.sps",
    displayName: "Normal + Decal",
    category: "Decal",
    renderBucket: 2,
    textureParams: DIFFUSE_BUMP,
    vectorParams: [...COMMON_VECTOR_PARAMS, { name: "bumpiness", x: 1, y: 0, z: 0, w: 0 }],
    needsTangent: true,
  },
  {
    filename: "normal_spec_decal.sps",
    displayName: "Normal + Spec + Decal",
    category: "Decal",
    renderBucket: 2,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },

  // === Emissive ===
  {
    filename: "emissive.sps",
    displayName: "Emissive",
    category: "Emissive",
    renderBucket: 0,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...EMISSIVE_PARAMS],
    needsTangent: false,
  },
  {
    filename: "emissivenight.sps",
    displayName: "Emissive Night",
    category: "Emissive",
    renderBucket: 0,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...EMISSIVE_PARAMS],
    needsTangent: false,
  },
  {
    filename: "emissive_alpha.sps",
    displayName: "Emissive + Alpha",
    category: "Emissive",
    renderBucket: 1,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...EMISSIVE_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_spec_emissive.sps",
    displayName: "Normal + Spec + Emissive",
    category: "Emissive",
    renderBucket: 0,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS, ...EMISSIVE_PARAMS],
    needsTangent: true,
  },

  // === Glass ===
  {
    filename: "glass.sps",
    displayName: "Glass",
    category: "Glass",
    renderBucket: 1,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "glass_normal_spec_reflect.sps",
    displayName: "Glass + Normal + Spec + Reflect",
    category: "Glass",
    renderBucket: 1,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },

  // === Reflect ===
  {
    filename: "reflect.sps",
    displayName: "Reflect",
    category: "Reflect",
    renderBucket: 0,
    textureParams: DIFFUSE_ONLY,
    vectorParams: [...COMMON_VECTOR_PARAMS],
    needsTangent: false,
  },
  {
    filename: "normal_spec_reflect.sps",
    displayName: "Normal + Spec + Reflect",
    category: "Reflect",
    renderBucket: 0,
    textureParams: DIFFUSE_BUMP_SPEC,
    vectorParams: [...COMMON_VECTOR_PARAMS, ...NORMAL_SPEC_PARAMS],
    needsTangent: true,
  },
]

export const SHADER_CATEGORIES = [
  "Standard",
  "Transparent",
  "Cutout",
  "Decal",
  "Emissive",
  "Glass",
  "Reflect",
]

/** Map shader filename to its definition for quick lookup */
export const SHADER_MAP = new Map<string, ShaderDef>(
  ALL_SHADERS.map((s) => [s.filename, s])
)

export const DEFAULT_SHADER = ALL_SHADERS[0] // default.sps
