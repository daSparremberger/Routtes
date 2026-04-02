'use client'

import { BadgeDollarSign, CircleAlert, Receipt, Wallet } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'

const cards = [
  { title: 'Receita prevista', value: 'R$ 48.320', icon: Wallet, tone: 'text-brand-500' },
  { title: 'Mensalidades em aberto', value: '12 contratos', icon: Receipt, tone: 'text-red-300' },
  { title: 'Motoristas a repassar', value: 'R$ 11.450', icon: BadgeDollarSign, tone: 'text-emerald-300' },
]

export default function FinanceiroPage() {
  useShellConfig({ title: 'Financeiro' })
  return (
      <div className="grid gap-5">
        <section className="rounded-[28px] border border-white/6 bg-shell-600 p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm text-ink-muted">Visao financeira</p>
              <h2 className="text-[32px] font-semibold tracking-[-0.04em] text-ink-primary">Resumo de recebimentos</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
              <CircleAlert size={14} />
              Estrutura inicial
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <article key={card.title} className="rounded-[24px] border border-white/6 bg-white/[0.04] p-4">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/6 ${card.tone}`}>
                    <Icon size={18} />
                  </div>
                  <p className="mb-2 text-sm text-ink-muted">{card.title}</p>
                  <h3 className="text-2xl font-semibold text-ink-primary">{card.value}</h3>
                </article>
              )
            })}
          </div>
        </section>
      </div>
  )
}
