'use client'

import { cn } from '@/lib/utils'
import { Activity } from 'lucide-react'

interface ScanProgressProps {
  phase: string
  progress: number
  status: 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'
}

export function ScanProgress({ phase, progress, status }: ScanProgressProps) {
  if (status === 'complete' || status === 'idle') return null

  return (
    <div className="w-full px-4 py-3 bg-[#12131a] border-b border-[#1e2030] transition-all duration-300">
      <div className="container mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-4 w-4 text-cyan-500 animate-pulse" />
          <span className="text-sm text-[#9ca3af]">{phase}</span>
          <span className="text-sm font-mono text-cyan-500 ml-auto">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#1a1b24] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 animate-gradient transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
