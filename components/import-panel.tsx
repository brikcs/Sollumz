"use client"

import { useCallback, useRef, useState } from "react"
import { Upload } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { parseModelFile } from "@/lib/parsers/model-parser"
import { cn } from "@/lib/utils"

const ACCEPTED_EXTENSIONS = [".obj", ".fbx", ".glb", ".gltf"]

export function ImportPanel() {
  const importModel = useAppStore((s) => s.importModel)
  const reset = useAppStore((s) => s.reset)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "")
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported format: ${ext}. Use .obj, .fbx, .glb, or .gltf`)
        return
      }

      setError(null)
      setIsLoading(true)
      reset()

      try {
        const model = await parseModelFile(file)
        importModel(model)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse model")
      } finally {
        setIsLoading(false)
      }
    },
    [importModel, reset]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        className={cn(
          "flex flex-col items-center justify-center w-full max-w-md aspect-square rounded-lg border-2 border-dashed cursor-pointer transition-all",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-muted-foreground/50 hover:bg-secondary/30",
          isLoading && "pointer-events-none opacity-60"
        )}
      >
        {isLoading ? (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground mt-4">Parsing model...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-foreground">
              Drop a 3D model here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports .OBJ, .FBX, .GLB, .GLTF
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".obj,.fbx,.glb,.gltf"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0])
            e.target.value = ""
          }}
          className="sr-only"
          aria-label="Import 3D model file"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive max-w-md text-center">{error}</p>
      )}
    </div>
  )
}
