'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, Briefcase,
  FileText, Link2, Receipt, LogOut, ShieldAlert,
} from 'lucide-react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard',     href: '/admin/dashboard',     icon: LayoutDashboard },
  { label: 'Tenants',       href: '/admin/tenants',       icon: Building2 },
  { label: 'Organizações',  href: '/admin/organizacoes',  icon: Briefcase },
  { label: 'Contratos',     href: '/admin/contratos',     icon: FileText },
  { label: 'Convites',      href: '/admin/convites',      icon: Link2 },
  { label: 'Faturas',       href: '/admin/faturas',       icon: Receipt },
]

function AdminSidebar() {
  const pathname  = usePathname()
  const { logOut, user } = useAdminAuth()

  return (
    <aside className="w-[88px] h-full flex flex-col items-center justify-between py-5 bg-shell-900 shrink-0">
      <div className="flex flex-col items-center gap-3">
        {/* Logo — shield icon to distinguish from gestor */}
        <div className="h-12 w-12 rounded-[18px] bg-shell-600 border border-white/5 flex items-center justify-center shadow-lg">
          <ShieldAlert size={22} className="text-brand-500" strokeWidth={1.8} />
        </div>

        <nav className="mt-4 flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon   = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <NextLink
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative h-12 w-12 rounded-[16px] flex items-center justify-center transition-all duration-200',
                  active
                    ? 'bg-white/10 text-ink-primary'
                    : 'text-ink-muted hover:bg-white/5 hover:text-ink-primary',
                )}
              >
                {active && (
                  <span className="absolute -left-[18px] h-6 w-1 rounded-full bg-brand-500" />
                )}
                <Icon size={20} strokeWidth={1.9} />
              </NextLink>
            )
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5">
        {user && (
          <div
            title={user.displayName ?? user.email ?? ''}
            className="h-10 w-10 rounded-full overflow-hidden border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-brand-500/20 flex items-center justify-center text-brand-500 text-xs font-semibold">
                  {(user.displayName ?? user.email ?? 'A')[0].toUpperCase()}
                </div>
            }
          </div>
        )}
        <button
          onClick={logOut}
          title="Sair"
          className="h-12 w-12 rounded-[16px] flex items-center justify-center text-ink-muted hover:bg-white/5 hover:text-ink-primary transition-all"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  )
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAdminAuth()
  const pathname    = usePathname()
  const isLogin     = pathname === '/admin/login'

  if (isLogin) return <>{children}</>
  if (loading) {
    return (
      <div className="min-h-screen bg-shell-900 flex items-center justify-center">
        <span className="h-6 w-6 border-2 border-white/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-shell-900">
      <AdminSidebar />
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto p-5 bg-shell-700">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <AdminShell>{children}</AdminShell>
      </AdminAuthProvider>
    </QueryClientProvider>
  )
}
