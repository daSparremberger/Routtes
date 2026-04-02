'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Shell } from './shell'
import { useShellContext } from './shell-context'

const titleFallbacks: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pessoas': 'Pessoas',
  '/escolas': 'Escolas',
  '/rotas': 'Rotas',
  '/veiculos': 'Veiculos',
  '/financeiro': 'Financeiro',
  '/configuracoes': 'Configuracoes',
  '/alunos': 'Alunos',
  '/motoristas': 'Motoristas',
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { options } = useShellContext()

  const useShell =
    pathname !== '/' &&
    pathname !== '/login' &&
    !pathname.startsWith('/admin')

  const fallbackTitle = useMemo(() => titleFallbacks[pathname] ?? undefined, [pathname])

  if (!useShell) return <>{children}</>

  return (
    <Shell
      title={options.title ?? fallbackTitle}
      headerActions={options.headerActions}
      searchValue={options.searchValue}
      onSearchChange={options.onSearchChange}
    >
      {children}
    </Shell>
  )
}
