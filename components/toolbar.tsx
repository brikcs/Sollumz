"use client"

import { useRef, useCallback, useState } from "react"
import { Upload, RotateCcw, Box } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { parseModelFile } from "@/lib/parsers/model-parser"
import { cn } from "@/lib/utils"

export function Toolbar() {
  const parsedModel = useAppStore((s) => s.parsedModel)
  const importModel = useAppStore((s) => s.importModel)
  const reset = useAppStore((s) => s.reset)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      reset()
      try {
        const model = await parseModelFile(file)
        importModel(model)
      } catch (err) {
        console.error("Failed to import:", err)
      } finally {
        setIsLoading(false)
      }
    },
    [importModel, reset]
  )

  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
      {/* Logo / Title */}
      <div className="flex items-center gap-2 mr-4">
        <Box className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground tracking-tight">
          YDR Converter
        </span>
        <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
          Web
        </span>
      </div>

      {/* Import Button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          "bg-secondary text-secondary-foreground hover:bg-accent",
          "disabled:opacity-50"
        )}
      >
        <Upload className="h-3.5 w-3.5" />
        {isLoading ? "Loading..." : "Import Model"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".obj,.fbx,.glb,.gltf"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0])
          e.target.value = ""
        }}
        className="sr-only"
        aria-label="Import 3D model"
      />

      {/* Reset */}
      {parsedModel && (
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Model Name */}
      {parsedModel && (
        <span className="text-xs text-muted-foreground font-mono truncate max-w-48">
          {parsedModel.name}
        </span>
      )}
    </header>
  )
}
