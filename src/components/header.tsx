'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Radio, RefreshCw, Activity, BarChart3, Layers, Terminal } from 'lucide-react'

type TabType = 'feed' | 'insights' | 'sources' | 'logs'
type ScanStatus = 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error'

interface HeaderProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  scanStatus: ScanStatus
  onRescan: () => void
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'feed', label: 'Feed', icon: Radio },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'sources', label: 'Sources', icon: Layers },
  { id: 'logs', label: 'Logs', icon: Terminal },
]

const statusConfig: Record<ScanStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'Idle', color: 'bg-gray-500', pulse: false },
  scanning: { label: 'Scanning', color: 'bg-cyan-500', pulse: true },
  analyzing: { label: 'Analyzing', color: 'bg-purple-500', pulse: true },
  complete: { label: 'Complete', color: 'bg-emerald-500', pulse: false },
  error: { label: 'Error', color: 'bg-red-500', pulse: false },
}

export function Header({ activeTab, onTabChange, scanStatus, onRescan }: HeaderProps) {
  const status = statusConfig[scanStatus]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-radar backdrop-blur-md" style={{ backgroundColor: 'rgba(10, 11, 15, 0.9)' }}>
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
            <span className="text-sm font-bold text-white">OR</span>
          </div>
          <span className="text-lg font-semibold text-white hidden sm:block">OpportunityRadar</span>

          {/* Status indicator */}
          <div className="flex items-center gap-2 ml-3 px-2.5 py-1 rounded-full bg-[#12131a] border border-[#1e2030]">
            <div className="relative flex items-center">
              <div className={cn('h-2 w-2 rounded-full', status.color)} />
              {status.pulse && (
                <div className={cn('absolute h-2 w-2 rounded-full animate-ping', status.color)} />
              )}
            </div>
            <span className="text-xs text-[#9ca3af]">{status.label}</span>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-[#1a1b24] text-white'
                    : 'text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#12131a]'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Rescan button */}
        <Button
          onClick={onRescan}
          disabled={scanStatus === 'scanning' || scanStatus === 'analyzing'}
          size="sm"
          className={cn(
            'gap-1.5 transition-all duration-200',
            scanStatus === 'complete'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[#1a1b24] hover:bg-[#252636] text-[#9ca3af] border border-[#1e2030]'
          )}
        >
          <RefreshCw className={cn(
            'h-3.5 w-3.5',
            (scanStatus === 'scanning' || scanStatus === 'analyzing') && 'animate-spin'
          )} />
          <span className="hidden sm:inline">
            {scanStatus === 'complete' ? 'Rescan' : scanStatus === 'scanning' ? 'Scanning...' : scanStatus === 'analyzing' ? 'Analyzing...' : 'Scan'}
          </span>
        </Button>
      </div>
    </header>
  )
}
