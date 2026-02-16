"use client"

import { useState, useMemo } from "react"
import { ChevronDown, Search } from "lucide-react"
import { ALL_SHADERS, SHADER_CATEGORIES, SHADER_MAP } from "@/lib/shaders/shader-defs"
import { cn } from "@/lib/utils"

interface ShaderSelectorProps {
  value: string
  onChange: (filename: string) => void
}

export function ShaderSelector({ value, onChange }: ShaderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")

  const currentShader = SHADER_MAP.get(value)

  const filteredGroups = useMemo(() => {
    const term = search.toLowerCase().trim()
    const groups: Array<{ category: string; shaders: typeof ALL_SHADERS }> = []

    for (const cat of SHADER_CATEGORIES) {
      const shaders = ALL_SHADERS.filter(
        (s) =>
          s.category === cat &&
          (term === "" ||
            s.filename.toLowerCase().includes(term) ||
            s.displayName.toLowerCase().includes(term))
      )
      if (shaders.length > 0) {
        groups.push({ category: cat, shaders })
      }
    }
    return groups
  }, [search])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full rounded-md border bg-secondary px-3 py-2 text-sm transition-colors",
          "hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring",
          isOpen && "ring-1 ring-ring"
        )}
      >
        <div className="flex flex-col items-start min-w-0">
          <span className="truncate text-foreground">{currentShader?.displayName || value}</span>
          <span className="text-xs text-muted-foreground font-mono truncate">
            {value}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-lg max-h-72 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shaders..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto scrollbar-thin flex-1">
              {filteredGroups.map((group) => (
                <div key={group.category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-popover">
                    {group.category}
                  </div>
                  {group.shaders.map((shader) => (
                    <button
                      key={shader.filename}
                      type="button"
                      onClick={() => {
                        onChange(shader.filename)
                        setIsOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "flex flex-col w-full px-3 py-1.5 text-left hover:bg-accent transition-colors",
                        shader.filename === value && "bg-accent"
                      )}
                    >
                      <span className="text-sm text-foreground">{shader.displayName}</span>
                      <span className="text-xs text-muted-foreground font-mono">{shader.filename}</span>
                    </button>
                  ))}
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No shaders found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
