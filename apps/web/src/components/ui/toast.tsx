'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
}

interface ToastContextValue {
  toast:   (opts: Omit<ToastItem, 'id'>) => void
  success: (title: string, description?: string) => void
  error:   (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info:    (title: string, description?: string) => void
}

// ─── Config ──────────────────────────────────────────────────────────────────

const toastConfig: Record<ToastType, {
  icon: React.ElementType
  iconClass: string
  border: string
  progress: string
}> = {
  success: {
    icon:      CheckCircle2,
    iconClass: 'text-active',
    border:    'border-active/25',
    progress:  'bg-active',
  },
  error: {
    icon:      XCircle,
    iconClass: 'text-danger',
    border:    'border-danger/25',
    progress:  'bg-danger',
  },
  warning: {
    icon:      AlertTriangle,
    iconClass: 'text-warn',
    border:    'border-warn/25',
    progress:  'bg-warn',
  },
  info: {
    icon:      Info,
    iconClass: 'text-brand-600',
    border:    'border-brand-200',
    progress:  'bg-brand-600',
  },
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastCtx = createContext<ToastContextValue | null>(null)

const DURATION = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (opts: Omit<ToastItem, 'id'>) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev.slice(-4), { ...opts, id }])
      setTimeout(() => dismiss(id), DURATION)
    },
    [dismiss],
  )

  const success = useCallback(
    (title: string, description?: string) => toast({ type: 'success', title, description }),
    [toast],
  )
  const error = useCallback(
    (title: string, description?: string) => toast({ type: 'error', title, description }),
    [toast],
  )
  const warning = useCallback(
    (title: string, description?: string) => toast({ type: 'warning', title, description }),
    [toast],
  )
  const info = useCallback(
    (title: string, description?: string) => toast({ type: 'info', title, description }),
    [toast],
  )

  return (
    <ToastCtx.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Toast stack */}
      <div
        aria-live="polite"
        aria-label="Notificações"
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        <AnimatePresence mode="sync">
          {toasts.map((t) => {
            const cfg = toastConfig[t.type]
            const Icon = cfg.icon
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className={cn(
                  'pointer-events-auto relative w-80 overflow-hidden',
                  'flex items-start gap-3 rounded-xl px-4 py-3.5',
                  'bg-surface-card border shadow-card-lg',
                  cfg.border,
                )}
              >
                {/* Progress bar */}
                <motion.div
                  className={cn('absolute bottom-0 left-0 h-0.5 rounded-full', cfg.progress)}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: DURATION / 1000, ease: 'linear' }}
                />

                <Icon size={16} className={cn('mt-0.5 shrink-0', cfg.iconClass)} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-primary leading-snug">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-ink-secondary leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 -mr-0.5 text-ink-muted hover:text-ink-primary transition-colors"
                  aria-label="Fechar notificação"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
