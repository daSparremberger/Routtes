'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/contexts/auth-context'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            30 * 60 * 1000, // 30 minutos
            gcTime:               60 * 60 * 1000, // 1 hora em memória
            refetchOnWindowFocus: false,
            refetchOnReconnect:   false,
            retry: (failureCount, error: unknown) => {
              // Don't retry on 401 (auth errors)
              if (error instanceof Error && 'status' in error && (error as { status: number }).status === 401) return false
              return failureCount < 1
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
