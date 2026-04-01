'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

interface ShellProps {
  children: React.ReactNode
  title?: string
  headerActions?: React.ReactNode
  /** When true the page manages its own search state and receives it via searchValue/onSearchChange */
  searchValue?: string
  onSearchChange?: (v: string) => void
}

export function Shell({ children, title, headerActions, searchValue, onSearchChange }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-shell-900">
      <Sidebar />

      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Header
          title={title}
          search={searchValue}
          onSearchChange={onSearchChange}
          actions={headerActions}
        />

        <main className="flex-1 overflow-y-auto p-5 bg-shell-700">
          {children}
        </main>
      </div>
    </div>
  )
}
