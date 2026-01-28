'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
            <span className="text-sm font-bold text-white">OR</span>
          </div>
          <span className="text-lg font-semibold text-white">OpportunityRadar</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/browse"
            className={cn(
              'text-sm font-medium transition-colors hover:text-white',
              pathname === '/browse' ? 'text-white' : 'text-zinc-400'
            )}
          >
            Browse
          </Link>
          <Link
            href="/about"
            className={cn(
              'text-sm font-medium transition-colors hover:text-white',
              pathname === '/about' ? 'text-white' : 'text-zinc-400'
            )}
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  )
}
