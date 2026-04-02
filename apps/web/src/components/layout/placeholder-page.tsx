'use client'

import { useShellConfig } from './shell-context'

interface PlaceholderPageProps {
  title: string
  subtitle?: string
}

export function PlaceholderPage({
  title,
  subtitle = 'Esta pagina esta pronta para receber o mesmo padrao visual da referencia, com modulos, cards contextuais e animacoes suaves.',
}: PlaceholderPageProps) {
  useShellConfig({ title })

  return (
    <div className="grid h-full min-h-[520px] place-items-center">
      <div className="max-w-md px-6 text-center">
        <p className="mb-3 text-sm text-[#f7f1e4]/45">Em construcao</p>
        <h2 className="mb-3 text-[32px] font-semibold tracking-[-0.04em] text-ink-primary">{title}</h2>
        <p className="text-[#f7f1e4]/55">{subtitle}</p>
      </div>
    </div>
  )
}
