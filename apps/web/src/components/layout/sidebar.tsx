'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Truck,
  Car,
  School,
  Route,
  Play,
  CalendarCheck,
  History,
  Settings,
  Bell,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Rotas',      href: '/rotas',       icon: Route },
  { label: 'Alunos',     href: '/alunos',      icon: Users },
  { label: 'Escolas',    href: '/escolas',     icon: School },
  { label: 'Motoristas', href: '/motoristas',  icon: Truck },
  { label: 'Veículos',   href: '/veiculos',    icon: Car },
  { label: 'Execuções',  href: '/execucoes',   icon: Play },
  { label: 'Frequência', href: '/frequencia',  icon: CalendarCheck },
  { label: 'Histórico',  href: '/historico',   icon: History },
]

const bottomItems: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
  { label: 'Notificações',  href: '/notificacoes',  icon: Bell },
  { label: 'Perfil',        href: '/perfil',        icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[88px] h-full flex flex-col items-center justify-between py-5 bg-shell-900 shrink-0">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-[18px] bg-shell-600 border border-white/5 flex items-center justify-center shadow-lg">
          <div className="h-6 w-6 rounded-full bg-brand-500" />
        </div>

        {/* Main nav */}
        <nav className="mt-4 flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
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
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
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
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
