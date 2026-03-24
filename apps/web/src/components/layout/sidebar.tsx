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
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Avatar } from '@/components/ui'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Alunos',       href: '/alunos',       icon: Users },
  { label: 'Motoristas',   href: '/motoristas',   icon: Truck },
  { label: 'Veículos',     href: '/veiculos',     icon: Car },
  { label: 'Escolas',      href: '/escolas',      icon: School },
  { label: 'Rotas',        href: '/rotas',        icon: Route },
  { label: 'Execuções',    href: '/execucoes',    icon: Play },
  { label: 'Frequência',   href: '/frequencia',   icon: CalendarCheck },
  { label: 'Histórico',    href: '/historico',    icon: History },
]

const bottomItems: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]

interface SidebarProps {
  user?: { name: string; email: string; avatarUrl?: string }
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col',
        'bg-shell-900 text-ink-inverted',
        'transition-[width] duration-250 ease-out-expo',
        'shadow-sidebar',
        collapsed ? 'w-16' : 'w-sidebar',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-header items-center border-b border-shell-600/40',
        collapsed ? 'justify-center px-0' : 'px-5 gap-3',
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-ink-inverted">
            Routtes
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-2 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </ul>

        {/* Divider */}
        <div className="my-3 h-px bg-shell-600/40 mx-1" />

        <ul className="space-y-0.5">
          {bottomItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </ul>
      </nav>

      {/* User */}
      {user && (
        <div className={cn(
          'border-t border-shell-600/40 px-2 py-3',
        )}>
          <div className={cn(
            'flex items-center rounded-lg px-2 py-2 gap-3',
            'hover:bg-shell-hover cursor-pointer transition-colors duration-150',
            collapsed && 'justify-center px-0',
          )}>
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-inverted truncate">{user.name}</p>
                <p className="text-2xs text-ink-muted truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                className="text-ink-muted hover:text-ink-inverted transition-colors"
                aria-label="Sair"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-[72px]',
          'flex h-6 w-6 items-center justify-center',
          'rounded-full bg-shell-700 border border-shell-500',
          'text-ink-muted hover:text-ink-inverted hover:bg-shell-600',
          'transition-colors duration-150',
          'z-10',
        )}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
}) {
  const Icon = item.icon

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center rounded-md px-2 py-2',
          'text-sm font-medium transition-colors duration-150',
          'group relative',
          collapsed ? 'justify-center w-10 mx-auto' : 'gap-3',
          active
            ? 'bg-shell-700 text-ink-inverted'
            : 'text-ink-muted hover:bg-shell-hover hover:text-ink-inverted',
        )}
        aria-current={active ? 'page' : undefined}
      >
        {/* Active indicator */}
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-brand-400" />
        )}

        <Icon size={16} className="shrink-0" aria-hidden />

        {!collapsed && (
          <span className="flex-1 truncate">{item.label}</span>
        )}

        {/* Badge */}
        {item.badge && item.badge > 0 && !collapsed && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-2xs font-semibold text-white">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}

        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className={cn(
            'pointer-events-none absolute left-full ml-3 z-50',
            'rounded-md bg-shell-700 px-2 py-1',
            'text-xs text-ink-inverted whitespace-nowrap',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'shadow-modal border border-shell-600',
          )}>
            {item.label}
          </span>
        )}
      </Link>
    </li>
  )
}
