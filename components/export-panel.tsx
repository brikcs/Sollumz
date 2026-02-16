"use client"

import { useCallback, useState } from "react"
import { Download, AlertCircle } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { exportYdr } from "@/lib/export/exporter"
import { cn } from "@/lib/utils"

export function ExportPanel() {
  const parsedModel = useAppStore((s) => s.parsedModel)
  const materials = useAppStore((s) => s.materials)
  const exportName = useAppStore((s) => s.exportName)
  const setExportName = useAppStore((s) => s.setExportName)
  const exportProgress = useAppStore((s) => s.exportProgress)
  const setExportProgress = useAppStore((s) => s.setExportProgress)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async () => {
    if (!parsedModel) return
    setError(null)

    try {
      await exportYdr({
        name: exportName || "prop",
        model: parsedModel,
        materials,
        onProgress: (step, percent) => {
          setExportProgress({ step, percent })
        },
      })

      // Clear progress after a short delay
      setTimeout(() => setExportProgress(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
      setExportProgress(null)
    }
  }, [parsedModel, materials, exportName, setExportProgress])

  if (!parsedModel) return null

  const isExporting = exportProgress !== null && exportProgress.percent < 100

  return (
    <div className="flex flex-col gap-3 p-3 border-t border-border">
      {/* Export Name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block" htmlFor="export-name">
          Export Name
        </label>
        <input
          id="export-name"
          type="text"
          value={exportName}
          onChange={(e) => setExportName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "_"))}
          className="w-full rounded-md border bg-secondary px-3 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring font-mono"
          placeholder="prop_name"
        />
      </div>

      {/* Model Info */}
      <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
        <span>
          {parsedModel.meshes.length} mesh{parsedModel.meshes.length !== 1 ? "es" : ""},{" "}
          {materials.length} material{materials.length !== 1 ? "s" : ""}
        </span>
        <span>
          {parsedModel.meshes.reduce((acc, m) => acc + m.positions.length / 3, 0).toLocaleString()} vertices,{" "}
          {parsedModel.meshes.reduce((acc, m) => acc + m.indices.length / 3, 0).toLocaleString()} triangles
        </span>
      </div>

      {/* Progress */}
      {exportProgress && (
        <div className="flex flex-col gap-1">
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${exportProgress.percent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{exportProgress.step}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Button */}
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className={cn(
          "flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "disabled:opacity-50 disabled:pointer-events-none"
        )}
      >
        <Download className="h-4 w-4" />
        {isExporting ? "Exporting..." : "Export .ydr.xml (ZIP)"}
      </button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Exports CodeWalker XML format. Open the .ydr.xml in CodeWalker to compile to binary .ydr for FiveM/GTA V.
      </p>
    </div>
  )
}
