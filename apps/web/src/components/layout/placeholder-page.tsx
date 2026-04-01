'use client'

import { Shell } from './shell'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
}

export function PlaceholderPage({
  title,
  subtitle = 'Esta página está pronta para receber o mesmo padrão visual da referência, com módulos, cards contextuais e animações suaves.',
}: PlaceholderPageProps) {
  return (
    <Shell title={title}>
      <div className="grid h-full min-h-[520px] place-items-center rounded-[28px] border border-white/6 bg-shell-600">
        <div className="max-w-md px-6 text-center">
          <p className="mb-3 text-sm text-[#f7f1e4]/45">Em construção</p>
          <h2 className="mb-3 text-[32px] font-semibold tracking-[-0.04em] text-ink-primary">{title}</h2>
          <p className="text-[#f7f1e4]/55">{subtitle}</p>
        </div>
      </div>
    </Shell>
  )
}
