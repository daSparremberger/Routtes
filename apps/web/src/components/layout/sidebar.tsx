'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  Car,
  ClipboardCheck,
  History,
  Home,
  Radio,
  Route,
  School,
  Settings,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: ElementType
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Rotas', href: '/rotas', icon: Route },
  { label: 'Escolas', href: '/escolas', icon: School },
  { label: 'Pessoas', href: '/pessoas', icon: Users },
  { label: 'Veiculos', href: '/veiculos', icon: Car },
  { label: 'Ao vivo', href: '/execucoes', icon: Radio },
  { label: 'Frequencia', href: '/frequencia', icon: ClipboardCheck },
  { label: 'Historico', href: '/historico', icon: History },
  { label: 'Financeiro', href: '/financeiro', icon: Wallet },
]

interface SidebarProps {
  notificationsOpen?: boolean
  profileOpen?: boolean
  onToggleNotifications?: () => void
  onToggleProfile?: () => void
}

export function Sidebar({
  notificationsOpen,
  profileOpen,
  onToggleNotifications,
  onToggleProfile,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-[88px] shrink-0 flex-col items-center bg-shell-900 py-5 lg:flex">
      <div className="flex shrink-0 flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/5 bg-shell-600 shadow-lg">
          <div className="h-6 w-6 rounded-full bg-brand-500" />
        </div>
      </div>

      <nav className="sidebar-scroll mt-6 flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-2 pb-4">
        {navItems.map((item) => (
          <SidebarLink
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-2 border-t border-white/5 pt-4">
        <SidebarLink
          icon={Settings}
          label="Configuracoes"
          href="/configuracoes"
          active={pathname.startsWith('/configuracoes')}
        />
        <SidebarAction
          icon={Bell}
          label="Notificacoes"
          active={!!notificationsOpen}
          onClick={onToggleNotifications}
        />
        <SidebarAction icon={User} label="Perfil" active={!!profileOpen} onClick={onToggleProfile} />
      </div>
    </aside>
  )
}

export function MobileNavBar({
  notificationsOpen,
  profileOpen,
  onToggleNotifications,
  onToggleProfile,
}: SidebarProps) {
  const pathname = usePathname()
  const mobileItems = navItems.slice(0, 5)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-shell-900/96 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-lg lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {mobileItems.slice(0, 2).map((item) => (
          <MobileLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        <MobileAction
          icon={Bell}
          label="Alertas"
          active={!!notificationsOpen}
          onClick={onToggleNotifications}
        />
        <MobileAction
          icon={User}
          label="Perfil"
          active={!!profileOpen}
          onClick={onToggleProfile}
        />
      </div>
    </div>
  )
}

function SidebarLink({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: ElementType
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center transition-all duration-300',
        active ? 'text-[#f7f1e4]' : 'text-[#f7f1e4]/45 hover:text-[#f7f1e4]/90',
      )}
    >
      <ActiveMark active={active} />
      <motion.span
        key={`${href}-${active ? 'active' : 'idle'}`}
        initial={{ opacity: 0.65, scale: 0.92, y: 3 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={cn('relative', active && 'text-[#f7f1e4]')}
      >
        {active ? (
          <span className="pointer-events-none absolute -left-2 top-1/2 h-8 w-6 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_left,rgba(247,175,39,0.30)_0%,rgba(247,175,39,0.14)_40%,rgba(247,175,39,0.00)_72%)] blur-[6px]" />
        ) : null}
        <Icon size={20} strokeWidth={1.9} />
      </motion.span>
    </Link>
  )
}

function SidebarAction({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ElementType
  label: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center transition-all duration-300',
        active ? 'text-[#f7f1e4]' : 'text-[#f7f1e4]/45 hover:text-[#f7f1e4]/90',
      )}
    >
      <ActiveMark active={active} />
      <motion.span
        key={`${label}-${active ? 'active' : 'idle'}`}
        initial={{ opacity: 0.65, scale: 0.92, y: 3 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={cn('relative', active && 'text-[#f7f1e4]')}
      >
        {active ? (
          <span className="pointer-events-none absolute -left-2 top-1/2 h-8 w-6 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_left,rgba(247,175,39,0.30)_0%,rgba(247,175,39,0.14)_40%,rgba(247,175,39,0.00)_72%)] blur-[6px]" />
        ) : null}
        <Icon size={20} strokeWidth={1.9} />
      </motion.span>
    </button>
  )
}

function MobileLink({
  item,
  active,
}: {
  item: NavItem
  active: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex min-h-14 flex-col items-center justify-center rounded-[18px] px-2 text-[11px] font-medium transition-all',
        active ? 'bg-white/[0.07] text-[#f7f1e4]' : 'text-[#f7f1e4]/55 hover:bg-white/[0.04] hover:text-[#f7f1e4]/90',
      )}
    >
      <Icon size={18} strokeWidth={1.9} />
      <span className="mt-1 truncate">{item.label}</span>
    </Link>
  )
}

function MobileAction({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: ElementType
  label: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-14 flex-col items-center justify-center rounded-[18px] px-2 text-[11px] font-medium transition-all',
        active ? 'bg-white/[0.07] text-[#f7f1e4]' : 'text-[#f7f1e4]/55 hover:bg-white/[0.04] hover:text-[#f7f1e4]/90',
      )}
    >
      <Icon size={18} strokeWidth={1.9} />
      <span className="mt-1 truncate">{label}</span>
    </button>
  )
}

function ActiveMark({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.2 }}
          className="absolute -left-3 inset-y-0 my-auto h-6 w-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(247,175,39,0.95),0_0_22px_rgba(247,175,39,0.7),0_0_34px_rgba(247,175,39,0.35)]"
        />
      ) : null}
    </AnimatePresence>
  )
}
