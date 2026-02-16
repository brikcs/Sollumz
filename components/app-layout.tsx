"use client"

import { useAppStore } from "@/lib/store"
import { Toolbar } from "./toolbar"
import { ModelViewer } from "./model-viewer"
import { MaterialEditor } from "./material-editor"
import { ExportPanel } from "./export-panel"
import { ImportPanel } from "./import-panel"

export function AppLayout() {
  const parsedModel = useAppStore((s) => s.parsedModel)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Viewport Area */}
        <div className="flex-1 relative">
          {parsedModel ? (
            <ModelViewer />
          ) : (
            <ImportPanel />
          )}
        </div>

        {/* Right Sidebar - Material Editor + Export */}
        {parsedModel && (
          <aside className="w-80 border-l border-border bg-card flex flex-col overflow-hidden shrink-0">
            <div className="flex-1 overflow-y-auto">
              <MaterialEditor />
            </div>
            <ExportPanel />
          </aside>
        )}
      </div>
    </div>
  )
}
