'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

interface ShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  headerActions?: React.ReactNode
  /** Remove padding interno (ex: páginas de mapa full-bleed) */
  flushContent?: boolean
}

// Mock user — será substituído pelo hook de auth
const mockUser = {
  name: 'Ana Coordenadora',
  email: 'ana@transporte.com.br',
}

export function Shell({ children, title, subtitle, headerActions, flushContent }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar user={mockUser} />

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} actions={headerActions} />

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            !flushContent && 'p-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
