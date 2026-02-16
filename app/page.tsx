"use client"

import dynamic from "next/dynamic"

// Dynamically import AppLayout to avoid SSR issues with three.js
const AppLayout = dynamic(
  () => import("@/components/app-layout").then((mod) => mod.AppLayout),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading converter...</p>
        </div>
      </div>
    ),
  }
)

export default function Page() {
  return <AppLayout />
}
