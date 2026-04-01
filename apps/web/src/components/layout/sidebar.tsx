'use client'

import type { ElementType } from 'react'
import { cn } from '@/lib/utils'
import {
  Home,
  Route,
  GraduationCap,
  School,
  UserSquare2,
  Car,
  Radio,
  ClipboardCheck,
  History,
  Wallet,
  Settings,
  Bell,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon: ElementType
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Rotas', href: '/rotas', icon: Route },
  { label: 'Alunos', href: '/alunos', icon: GraduationCap },
  { label: 'Escolas', href: '/escolas', icon: School },
  { label: 'Motoristas', href: '/motoristas', icon: UserSquare2 },
  { label: 'Veículos', href: '/veiculos', icon: Car },
  { label: 'Ao vivo', href: '/execucoes', icon: Radio },
  { label: 'Frequência', href: '/frequencia', icon: ClipboardCheck },
  { label: 'Histórico', href: '/historico', icon: History },
  { label: 'Financeiro', href: '/configuracoes', icon: Wallet },
]

const bottomItems: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
  { label: 'Notificações', href: '/notificacoes', icon: Bell },
  { label: 'Usuário', href: '/perfil', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[88px] shrink-0 flex-col items-center justify-between bg-shell-900 py-5">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/5 bg-shell-600 shadow-lg">
          <div className="h-6 w-6 rounded-full bg-brand-500" />
        </div>

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
                  'relative flex h-12 w-12 items-center justify-center rounded-[16px] transition-all duration-200',
                  active ? 'bg-white/10 text-[#f7f1e4]' : 'text-[#f7f1e4]/45 hover:bg-white/5 hover:text-[#f7f1e4]/90',
                )}
              >
                {active ? <span className="absolute -left-4 h-6 w-1 rounded-full bg-brand-500" /> : null}
                <Icon size={20} strokeWidth={1.9} />
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-white/5 pt-4">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'relative flex h-12 w-12 items-center justify-center rounded-[16px] transition-all duration-200',
                active ? 'bg-white/10 text-[#f7f1e4]' : 'text-[#f7f1e4]/45 hover:bg-white/5 hover:text-[#f7f1e4]/90',
              )}
            >
              {active ? <span className="absolute -left-4 h-6 w-1 rounded-full bg-brand-500" /> : null}
              <Icon size={20} strokeWidth={1.9} />
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
