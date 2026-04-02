import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { ShellProvider } from '@/components/layout/shell-context'
import { AppShell } from '@/components/layout/app-shell'

export const metadata: Metadata = {
  title: {
    template: '%s | Routtes',
    default:  'Routtes — Gestão de Transporte Escolar',
  },
  description: 'A base operacional inteligente do seu transporte escolar.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <ShellProvider>
            <AppShell>{children}</AppShell>
          </ShellProvider>
        </Providers>
      </body>
    </html>
  )
}
