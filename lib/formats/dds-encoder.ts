/**
 * Client-side DDS encoder for BC1 (DXT1) and BC3 (DXT5) compression.
 * Converts PNG/JPG/WebP/BMP images to DDS format suitable for GTA V.
 *
 * DDS Header format follows the Microsoft DDS specification exactly.
 */

// DDS Header constants
const DDS_MAGIC = 0x20534444 // "DDS "
const DDSD_CAPS = 0x1
const DDSD_HEIGHT = 0x2
const DDSD_WIDTH = 0x4
const DDSD_PIXELFORMAT = 0x1000
const DDSD_MIPMAPCOUNT = 0x20000
const DDSD_LINEARSIZE = 0x80000
const DDPF_FOURCC = 0x4
const DDSCAPS_TEXTURE = 0x1000

// FourCC codes
const FOURCC_DXT1 = 0x31545844 // "DXT1"
const FOURCC_DXT5 = 0x35545844 // "DXT5"

export type DdsFormat = "DXT1" | "DXT5"

/**
 * Check if a file is already in DDS format by reading magic bytes.
 */
export function isDdsFile(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false
  const view = new DataView(data)
  return view.getUint32(0, true) === DDS_MAGIC
}

/**
 * Get the D3DFMT string for CodeWalker XML.
 */
export function getDdsFormatString(format: DdsFormat): string {
  return format === "DXT1" ? "D3DFMT_DXT1" : "D3DFMT_DXT5"
}

/**
 * Decode any image file to RGBA pixel data using Canvas API.
 */
async function decodeImageToRGBA(file: File): Promise<{ data: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Resize to power of 2 if necessary
      let w = nearestPowerOf2(img.width)
      let h = nearestPowerOf2(img.height)

      // Cap at 4096
      w = Math.min(w, 4096)
      h = Math.min(h, 4096)

      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      resolve({
        data: new Uint8Array(imageData.data.buffer),
        width: w,
        height: h,
      })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error(`Failed to decode image: ${file.name}`))
    }
    img.src = URL.createObjectURL(file)
  })
}

function nearestPowerOf2(n: number): number {
  if (n <= 0) return 1
  // Round up to nearest power of 2
  let p = 1
  while (p < n) p *= 2
  // But if it's much closer to the smaller pow2, use that
  const lower = p / 2
  if (lower > 0 && (n - lower) < (p - n) && lower >= 4) return lower
  return p
}

/**
 * Get image dimensions without loading the full pixel data.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (file.name.toLowerCase().endsWith(".dds")) {
    return getDdsDimensions(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error("Failed to load image"))
    }
    img.src = URL.createObjectURL(file)
  })
}

async function getDdsDimensions(file: File): Promise<{ width: number; height: number }> {
  const buffer = await file.slice(0, 128).arrayBuffer()
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== DDS_MAGIC) {
    throw new Error("Not a valid DDS file")
  }
  const height = view.getUint32(12, true)
  const width = view.getUint32(16, true)
  return { width, height }
}

/**
 * Detect if image has meaningful alpha channel.
 */
function hasAlpha(data: Uint8Array): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true
  }
  return false
}

/**
 * Encode an image file to DDS format.
 * If the file is already DDS, returns it as-is.
 * Otherwise, decodes to RGBA and compresses to DXT1 or DXT5.
 *
 * @returns The DDS ArrayBuffer, format used, and dimensions.
 */
export async function encodeToDds(
  file: File,
  forceFormat?: DdsFormat
): Promise<{ dds: ArrayBuffer; format: DdsFormat; width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer()

  // Pass through if already DDS
  if (isDdsFile(arrayBuffer)) {
    const dims = await getDdsDimensions(file)
    // Detect format from header
    const view = new DataView(arrayBuffer)
    const fourCC = view.getUint32(84, true)
    const format: DdsFormat = fourCC === FOURCC_DXT5 ? "DXT5" : "DXT1"
    return { dds: arrayBuffer, format, width: dims.width, height: dims.height }
  }

  // Decode image
  const { data, width, height } = await decodeImageToRGBA(file)

  // Choose format
  const format: DdsFormat = forceFormat || (hasAlpha(data) ? "DXT5" : "DXT1")

  // Compress
  const compressed = format === "DXT1"
    ? compressBC1(data, width, height)
    : compressBC3(data, width, height)

  // Build DDS file
  const dds = buildDdsFile(compressed, width, height, format)

  return { dds, format, width, height }
}

/**
 * Build a complete DDS file with header + compressed data.
 */
function buildDdsFile(compressedData: Uint8Array, width: number, height: number, format: DdsFormat): ArrayBuffer {
  const headerSize = 128 // 4 (magic) + 124 (header)
  const buffer = new ArrayBuffer(headerSize + compressedData.byteLength)
  const view = new DataView(buffer)
  const output = new Uint8Array(buffer)

  // Magic
  view.setUint32(0, DDS_MAGIC, true)

  // DDS_HEADER (124 bytes starting at offset 4)
  view.setUint32(4, 124, true) // dwSize
  view.setUint32(8, DDSD_CAPS | DDSD_HEIGHT | DDSD_WIDTH | DDSD_PIXELFORMAT | DDSD_LINEARSIZE | DDSD_MIPMAPCOUNT, true) // dwFlags
  view.setUint32(12, height, true) // dwHeight
  view.setUint32(16, width, true) // dwWidth

  const blockSize = format === "DXT1" ? 8 : 16
  const blocksW = Math.max(1, Math.ceil(width / 4))
  const blocksH = Math.max(1, Math.ceil(height / 4))
  const linearSize = blocksW * blocksH * blockSize
  view.setUint32(20, linearSize, true) // dwPitchOrLinearSize

  view.setUint32(24, 0, true) // dwDepth
  view.setUint32(28, 1, true) // dwMipMapCount (1 = no mipmaps)

  // Reserved[11]  (32 to 75) - already 0

  // DDS_PIXELFORMAT (32 bytes starting at offset 76)
  view.setUint32(76, 32, true) // dwSize
  view.setUint32(80, DDPF_FOURCC, true) // dwFlags
  view.setUint32(84, format === "DXT1" ? FOURCC_DXT1 : FOURCC_DXT5, true) // dwFourCC
  // RGBBitCount, masks - 0 for compressed

  // dwCaps
  view.setUint32(108, DDSCAPS_TEXTURE, true)
  // dwCaps2, 3, 4 - 0

  // Copy compressed data
  output.set(compressedData, headerSize)

  return buffer
}

// ---- BC1 (DXT1) Compression ----

function compressBC1(data: Uint8Array, width: number, height: number): Uint8Array {
  const blocksW = Math.max(1, Math.ceil(width / 4))
  const blocksH = Math.max(1, Math.ceil(height / 4))
  const output = new Uint8Array(blocksW * blocksH * 8)
  let offset = 0

  for (let by = 0; by < blocksH; by++) {
    for (let bx = 0; bx < blocksW; bx++) {
      const block = extractBlock(data, width, height, bx * 4, by * 4)
      encodeBC1Block(block, output, offset)
      offset += 8
    }
  }
  return output
}

// ---- BC3 (DXT5) Compression ----

function compressBC3(data: Uint8Array, width: number, height: number): Uint8Array {
  const blocksW = Math.max(1, Math.ceil(width / 4))
  const blocksH = Math.max(1, Math.ceil(height / 4))
  const output = new Uint8Array(blocksW * blocksH * 16)
  let offset = 0

  for (let by = 0; by < blocksH; by++) {
    for (let bx = 0; bx < blocksW; bx++) {
      const block = extractBlock(data, width, height, bx * 4, by * 4)
      encodeBC3AlphaBlock(block, output, offset)
      encodeBC1Block(block, output, offset + 8)
      offset += 16
    }
  }
  return output
}

/**
 * Extract a 4x4 pixel block from the image (RGBA).
 * If block extends beyond image, edge pixels are clamped.
 */
function extractBlock(data: Uint8Array, width: number, height: number, px: number, py: number): Uint8Array {
  const block = new Uint8Array(64) // 16 pixels * 4 channels
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const sx = Math.min(px + x, width - 1)
      const sy = Math.min(py + y, height - 1)
      const srcOff = (sy * width + sx) * 4
      const dstOff = (y * 4 + x) * 4
      block[dstOff] = data[srcOff]
      block[dstOff + 1] = data[srcOff + 1]
      block[dstOff + 2] = data[srcOff + 2]
      block[dstOff + 3] = data[srcOff + 3]
    }
  }
  return block
}

/**
 * Encode a 4x4 block to BC1 (DXT1) format (8 bytes).
 * Uses simple min/max endpoint selection with improved bounding box.
 */
function encodeBC1Block(block: Uint8Array, output: Uint8Array, offset: number): void {
  // Find min/max colors
  let minR = 255, minG = 255, minB = 255
  let maxR = 0, maxG = 0, maxB = 0

  for (let i = 0; i < 16; i++) {
    const r = block[i * 4]
    const g = block[i * 4 + 1]
    const b = block[i * 4 + 2]
    if (r < minR) minR = r
    if (g < minG) minG = g
    if (b < minB) minB = b
    if (r > maxR) maxR = r
    if (g > maxG) maxG = g
    if (b > maxB) maxB = b
  }

  // Inset bounding box for better quality
  const insetR = (maxR - minR) >> 4
  const insetG = (maxG - minG) >> 4
  const insetB = (maxB - minB) >> 4
  minR = Math.min(255, minR + insetR)
  minG = Math.min(255, minG + insetG)
  minB = Math.min(255, minB + insetB)
  maxR = Math.max(0, maxR - insetR)
  maxG = Math.max(0, maxG - insetG)
  maxB = Math.max(0, maxB - insetB)

  const color0 = colorTo565(maxR, maxG, maxB)
  const color1 = colorTo565(minR, minG, minB)

  // Ensure color0 >= color1 for 4-color mode
  let c0 = color0
  let c1 = color1
  let ep0r = maxR, ep0g = maxG, ep0b = maxB
  let ep1r = minR, ep1g = minG, ep1b = minB

  if (c0 < c1) {
    const tmp = c0; c0 = c1; c1 = tmp
    const tr = ep0r; ep0r = ep1r; ep1r = tr
    const tg = ep0g; ep0g = ep1g; ep1g = tg
    const tb = ep0b; ep0b = ep1b; ep1b = tb
  }

  // Generate palette
  const palette = [
    [ep0r, ep0g, ep0b],
    [ep1r, ep1g, ep1b],
    [
      Math.round((2 * ep0r + ep1r) / 3),
      Math.round((2 * ep0g + ep1g) / 3),
      Math.round((2 * ep0b + ep1b) / 3),
    ],
    [
      Math.round((ep0r + 2 * ep1r) / 3),
      Math.round((ep0g + 2 * ep1g) / 3),
      Math.round((ep0b + 2 * ep1b) / 3),
    ],
  ]

  // For each pixel, find closest palette entry
  let indices = 0
  for (let i = 0; i < 16; i++) {
    const r = block[i * 4]
    const g = block[i * 4 + 1]
    const b = block[i * 4 + 2]

    let bestDist = Infinity
    let bestIdx = 0
    for (let j = 0; j < 4; j++) {
      const dr = r - palette[j][0]
      const dg = g - palette[j][1]
      const db = b - palette[j][2]
      const dist = dr * dr + dg * dg + db * db
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = j
      }
    }
    indices |= bestIdx << (i * 2)
  }

  // Write output
  output[offset] = c0 & 0xff
  output[offset + 1] = (c0 >> 8) & 0xff
  output[offset + 2] = c1 & 0xff
  output[offset + 3] = (c1 >> 8) & 0xff
  output[offset + 4] = indices & 0xff
  output[offset + 5] = (indices >> 8) & 0xff
  output[offset + 6] = (indices >> 16) & 0xff
  output[offset + 7] = (indices >> 24) & 0xff
}

/**
 * Encode the alpha block for BC3 (DXT5) format (8 bytes).
 */
function encodeBC3AlphaBlock(block: Uint8Array, output: Uint8Array, offset: number): void {
  // Find min/max alpha
  let minA = 255
  let maxA = 0
  for (let i = 0; i < 16; i++) {
    const a = block[i * 4 + 3]
    if (a < minA) minA = a
    if (a > maxA) maxA = a
  }

  output[offset] = maxA
  output[offset + 1] = minA

  // Generate alpha palette (8 entries)
  const alphaPalette = new Uint8Array(8)
  alphaPalette[0] = maxA
  alphaPalette[1] = minA

  if (maxA > minA) {
    for (let i = 0; i < 6; i++) {
      alphaPalette[2 + i] = Math.round(((6 - i) * maxA + (1 + i) * minA) / 7)
    }
  }

  // Encode 16 pixels into 6 bytes (3 bits per pixel = 48 bits)
  const indices = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    const a = block[i * 4 + 3]
    let bestDist = Infinity
    let bestIdx = 0
    for (let j = 0; j < 8; j++) {
      const d = Math.abs(a - alphaPalette[j])
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }
    indices[i] = bestIdx
  }

  // Pack 3-bit indices into 6 bytes
  // Indices 0-2 go into bytes 2-4, indices 3-7 go into bytes 5-7 (err, actually pack all 16 into 6 bytes)
  let bits = 0n
  for (let i = 0; i < 16; i++) {
    bits |= BigInt(indices[i]) << BigInt(i * 3)
  }

  output[offset + 2] = Number(bits & 0xFFn)
  output[offset + 3] = Number((bits >> 8n) & 0xFFn)
  output[offset + 4] = Number((bits >> 16n) & 0xFFn)
  output[offset + 5] = Number((bits >> 24n) & 0xFFn)
  output[offset + 6] = Number((bits >> 32n) & 0xFFn)
  output[offset + 7] = Number((bits >> 40n) & 0xFFn)
}

/**
 * Convert RGB to 5:6:5 packed color.
 */
function colorTo565(r: number, g: number, b: number): number {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
}
