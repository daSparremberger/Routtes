'use client'

import { BellRing, Building2, Palette, ShieldCheck } from 'lucide-react'
import { useShellConfig } from '@/components/layout/shell-context'

const sections = [
  {
    title: 'Conta e acesso',
    description: 'Gerencie perfis, permissoes e preferencias de autenticacao da operacao.',
    icon: ShieldCheck,
  },
  {
    title: 'Tenant e identidade',
    description: 'Ajuste nome da organizaçao, identidade visual e dados institucionais do dashboard.',
    icon: Building2,
  },
  {
    title: 'Alertas e notificacoes',
    description: 'Defina regras para alertas operacionais, avisos de rota e lembretes internos.',
    icon: BellRing,
  },
  {
    title: 'Experiencia do dashboard',
    description: 'Controle exibicao de modulos, atalhos, temas e comportamento da interface.',
    icon: Palette,
  },
]

export default function ConfiguracoesPage() {
  useShellConfig({ title: 'Configuracoes' })
  return (
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-white/6 bg-shell-600 p-5">
          <p className="mb-2 text-sm text-ink-muted">Pagina de configuracao</p>
          <h2 className="mb-3 text-[32px] font-semibold tracking-[-0.04em] text-ink-primary">
            Ajustes do ambiente
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">
            Aqui fica a base para centralizar preferencias do dashboard, controles da tenant e regras da operacao.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <article key={section.title} className="rounded-[24px] border border-white/6 bg-white/[0.04] p-4">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/6 text-brand-500">
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-ink-primary">{section.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-secondary">{section.description}</p>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/6 bg-shell-600 p-5">
          <p className="mb-2 text-sm text-ink-muted">Proximos modulos</p>
          <h3 className="mb-4 text-2xl font-semibold text-ink-primary">Fila de configuracoes</h3>
          <div className="space-y-3">
            {['Permissoes por papel', 'Parametros de notificacao', 'Temas da tenant', 'Seguranca de sessao'].map((item) => (
              <div key={item} className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-ink-secondary">
                {item}
              </div>
            ))}
          </div>
        </aside>
      </div>
  )
}
