'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, LogOut, MessageCircle, Settings2, Trash2, UserPen } from 'lucide-react'
import { MobileNavBar, Sidebar, navItems } from './sidebar'
import { Header } from './header'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'

interface ShellProps {
  children: ReactNode
  title?: string
  headerActions?: ReactNode
  searchValue?: string
  onSearchChange?: (v: string) => void
}

type SidePanel = 'chat' | 'notifications' | 'profile' | null

const initialNotifications = [
  {
    id: 'n1',
    title: 'Rota 07 com atraso',
    description: 'Motorista informou atraso de 12 minutos no embarque da Escola Horizonte.',
    time: 'Agora',
  },
  {
    id: 'n2',
    title: 'Nova mensagem da escola',
    description: 'A coordenacao pediu ajuste de desembarque para dois alunos do turno da tarde.',
    time: '12 min',
  },
  {
    id: 'n3',
    title: 'Frequencia pendente',
    description: 'Ainda faltam 3 confirmacoes de presenca para fechar a operacao do dia.',
    time: '27 min',
  },
]

export function Shell({ children, title, headerActions, searchValue, onSearchChange }: ShellProps) {
  const pathname = usePathname()
  const { user, logOut } = useAuth()
  const [openPanel, setOpenPanel] = useState<SidePanel>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(initialNotifications)
  const tenants = useMemo(
    () => [
      { id: 't1', name: 'Routtes Cascavel' },
      { id: 't2', name: 'Lumina Escolar' },
      { id: 't3', name: 'Van Oeste' },
    ],
    [],
  )
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? 't1')
  const activeTenant = tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0]

  function togglePanel(panel: Exclude<SidePanel, null>) {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-shell-900">
      <Sidebar
        notificationsOpen={openPanel === 'notifications'}
        profileOpen={openPanel === 'profile'}
        onToggleNotifications={() => togglePanel('notifications')}
        onToggleProfile={() => togglePanel('profile')}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-l-[28px] bg-shell-900">
        <Header
          title={title}
          search={searchValue}
          onSearchChange={onSearchChange}
          actions={headerActions}
          tenantOptions={tenants}
          activeTenant={activeTenant}
          onSelectTenant={setTenantId}
          chatOpen={openPanel === 'chat'}
          onToggleChat={() => togglePanel('chat')}
          onOpenMenu={() => setMobileMenuOpen(true)}
        />

        <main className="relative flex-1 overflow-y-auto rounded-tl-[28px] bg-shell-700 p-4 pb-28 lg:p-5 lg:pb-5">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <MobileNavBar
        notificationsOpen={openPanel === 'notifications'}
        profileOpen={openPanel === 'profile'}
        onToggleNotifications={() => togglePanel('notifications')}
        onToggleProfile={() => togglePanel('profile')}
      />

      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-30 bg-black/30 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 z-40 w-[290px] border-r border-white/[0.06] bg-shell-900 p-4 lg:hidden"
            >
              <div className="mb-5 flex items-center gap-3 px-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-shell-600">
                  <div className="h-5 w-5 rounded-full bg-brand-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Routtes</p>
                  <p className="text-xs text-ink-muted">Operacao escolar</p>
                </div>
              </div>
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={active
                        ? 'flex items-center gap-3 rounded-[18px] bg-white/[0.07] px-4 py-3 text-sm font-medium text-ink-primary'
                        : 'flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm text-ink-secondary transition hover:bg-white/[0.04] hover:text-ink-primary'}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                <Link
                  href="/configuracoes"
                  onClick={() => setMobileMenuOpen(false)}
                  className={pathname.startsWith('/configuracoes')
                    ? 'flex items-center gap-3 rounded-[18px] bg-white/[0.07] px-4 py-3 text-sm font-medium text-ink-primary'
                    : 'flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm text-ink-secondary transition hover:bg-white/[0.04] hover:text-ink-primary'}
                >
                  <Settings2 size={18} />
                  <span>Configuracoes</span>
                </Link>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {openPanel ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar painel"
              initial={{ opacity: 0 }}
              animate={{ opacity: openPanel === 'chat' ? 1 : 0.01 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 z-10 bg-black/20"
              onClick={() => setOpenPanel(null)}
            />

            {openPanel === 'chat' ? (
              <motion.aside
                initial={{ opacity: 0, x: 44 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 44 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="absolute inset-x-3 bottom-24 top-20 z-20 rounded-[26px] border border-white/10 bg-shell-900 p-4 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-4 lg:w-[360px]"
              >
                <ChatPanel onClose={() => setOpenPanel(null)} />
              </motion.aside>
            ) : null}

            {openPanel === 'notifications' ? (
              <motion.aside
                initial={{ opacity: 0, x: -18, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -18, y: 18, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-x-3 bottom-24 z-20 rounded-[24px] border border-white/10 bg-shell-900 p-4 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:left-[104px] lg:w-[360px]"
              >
                <NotificationsPanel
                  notifications={notifications}
                  onClear={() => setNotifications([])}
                  onClose={() => setOpenPanel(null)}
                />
              </motion.aside>
            ) : null}

            {openPanel === 'profile' ? (
              <motion.aside
                initial={{ opacity: 0, x: -18, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -18, y: 18, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-x-3 bottom-24 z-20 rounded-[24px] border border-white/10 bg-shell-900 p-4 shadow-2xl lg:inset-x-auto lg:bottom-4 lg:left-[104px] lg:w-[320px]"
              >
                <ProfilePanel
                  name={user?.displayName ?? 'Conta Routtes'}
                  email={user?.email ?? 'usuario@routtes.app'}
                  onClose={() => setOpenPanel(null)}
                  onLogout={logOut}
                />
              </motion.aside>
            ) : null}
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function PanelHeader({
  icon,
  title,
  action,
  onClose,
}: {
  icon: ReactNode
  title: string
  action?: ReactNode
  onClose: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/6 text-brand-500">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-ink-primary">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-ink-primary transition hover:bg-white/10"
          aria-label="Fechar painel"
        >
          x
        </button>
      </div>
    </div>
  )
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  return (
    <>
      <PanelHeader icon={<MessageCircle size={18} />} title="Chat operacional" onClose={onClose} />

      <div className="space-y-3">
        <div className="rounded-2xl bg-white/5 p-4 text-sm text-ink-secondary">
          Comunicador entre gestor e motoristas para avisos de rota, atrasos, ajustes e recados do dia.
        </div>
        <div className="rounded-2xl bg-brand-500 p-4 text-sm font-medium text-ink-inverted">
          Exemplo: mensagens da operacao, escolas e atualizacoes dos motoristas em campo.
        </div>
        <div className="rounded-[22px] border border-white/6 bg-shell-600 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-ink-primary">
            <MessageCircle size={16} className="text-brand-500" />
            Conversas rapidas
          </div>
          <div className="space-y-2 text-sm text-ink-muted">
            <p>3 alertas de atraso aguardando revisao.</p>
            <p>1 escola solicitou ajuste de embarque.</p>
            <p>2 motoristas enviaram atualizacao de rota.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function NotificationsPanel({
  notifications,
  onClear,
  onClose,
}: {
  notifications: typeof initialNotifications
  onClear: () => void
  onClose: () => void
}) {
  return (
    <>
      <PanelHeader
        icon={<Bell size={18} />}
        title="Notificacoes"
        onClose={onClose}
        action={
          notifications.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-2 rounded-[14px] bg-white/[0.05] px-3 py-2 text-xs font-medium text-ink-primary transition hover:bg-white/[0.08]"
            >
              <Trash2 size={14} />
              Limpar
            </button>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <div className="rounded-[20px] bg-white/[0.04] px-4 py-5 text-sm text-ink-muted">
          Nenhuma notificacao pendente.
        </div>
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-[20px] bg-white/[0.04] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-primary">{notification.title}</p>
                <span className="text-xs text-ink-muted">{notification.time}</span>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{notification.description}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ProfilePanel({
  name,
  email,
  onClose,
  onLogout,
}: {
  name: string
  email: string
  onClose: () => void
  onLogout: () => Promise<void>
}) {
  return (
    <>
      <PanelHeader icon={<Settings2 size={18} />} title="Perfil" onClose={onClose} />

      <div className="space-y-3">
        <div className="rounded-[20px] bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink-primary">{name}</p>
              <p className="truncate text-sm text-ink-muted">{email}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-[18px] bg-white/[0.04] px-4 py-4 text-left text-sm text-ink-primary transition hover:bg-white/[0.06]"
        >
          <UserPen size={18} className="text-brand-500" />
          <span>Editar perfil</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-[18px] bg-red-500/10 px-4 py-4 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/15"
        >
          <LogOut size={18} />
          <span>Sair da conta</span>
        </button>
      </div>
    </>
  )
}
