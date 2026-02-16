"use client"

import { useCallback, useRef, useState } from "react"
import { ChevronDown, ImageIcon, X, Paintbrush } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { SHADER_MAP, DEFAULT_SHADER } from "@/lib/shaders/shader-defs"
import { ShaderSelector } from "./shader-selector"
import { getImageDimensions } from "@/lib/formats/dds-encoder"
import { cn } from "@/lib/utils"

function TextureSlotEditor({
  materialIndex,
  samplerName,
  label,
  description,
}: {
  materialIndex: number
  samplerName: string
  label: string
  description: string
}) {
  const updateMaterialTexture = useAppStore((s) => s.updateMaterialTexture)
  const materials = useAppStore((s) => s.materials)
  const slot = materials[materialIndex]?.textures?.[samplerName]
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file)
      let width = 512
      let height = 512
      try {
        const dims = await getImageDimensions(file)
        width = dims.width
        height = dims.height
      } catch {
        /* use defaults */
      }
      updateMaterialTexture(materialIndex, samplerName, {
        file,
        previewUrl,
        width,
        height,
      })
    },
    [materialIndex, samplerName, updateMaterialTexture]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
    },
    [handleFile]
  )

  const clearTexture = useCallback(() => {
    if (slot?.previewUrl) URL.revokeObjectURL(slot.previewUrl)
    updateMaterialTexture(materialIndex, samplerName, {
      file: null,
      previewUrl: null,
      width: 0,
      height: 0,
    })
  }, [materialIndex, samplerName, slot, updateMaterialTexture])

  return (
    <div className="flex items-start gap-2">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        className={cn(
          "relative w-14 h-14 rounded border-2 border-dashed flex items-center justify-center cursor-pointer shrink-0 overflow-hidden transition-colors",
          slot?.previewUrl
            ? "border-primary/30"
            : "border-border hover:border-muted-foreground/50"
        )}
      >
        {slot?.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slot.previewUrl}
            alt={`${label} texture preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.dds,.tga,.webp,.bmp"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0])
          }}
          className="sr-only"
          aria-label={`Upload ${label} texture`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{label}</span>
          {slot?.file && (
            <button
              onClick={clearTexture}
              className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label={`Clear ${label} texture`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
        {slot?.file && (
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
            {slot.file.name} ({slot.width}x{slot.height})
          </p>
        )}
      </div>
    </div>
  )
}

function MaterialCard({ index }: { index: number }) {
  const materials = useAppStore((s) => s.materials)
  const updateMaterialShader = useAppStore((s) => s.updateMaterialShader)
  const [isExpanded, setIsExpanded] = useState(true)

  const mat = materials[index]
  if (!mat) return null

  const shaderDef = SHADER_MAP.get(mat.shaderName) || DEFAULT_SHADER

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
        style={{ background: "hsl(var(--panel-header))" }}
      >
        <Paintbrush className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-sm font-medium truncate flex-1">{mat.name}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-3 py-3 flex flex-col gap-3">
          {/* Shader Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Shader
            </label>
            <ShaderSelector
              value={mat.shaderName}
              onChange={(filename) => updateMaterialShader(index, filename)}
            />
          </div>

          {/* Texture Slots */}
          {shaderDef.textureParams.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-medium text-muted-foreground">
                Textures
              </label>
              {shaderDef.textureParams.map((tp) => (
                <TextureSlotEditor
                  key={tp.name}
                  materialIndex={index}
                  samplerName={tp.name}
                  label={tp.label}
                  description={tp.description}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function MaterialEditor() {
  const materials = useAppStore((s) => s.materials)
  const parsedModel = useAppStore((s) => s.parsedModel)

  if (!parsedModel) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        Import a model to configure materials
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No materials found in the model
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Materials ({materials.length})
        </h3>
      </div>
      {materials.map((_, idx) => (
        <MaterialCard key={idx} index={idx} />
      ))}
    </div>
  )
}
