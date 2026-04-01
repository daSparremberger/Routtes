'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const { signIn, loading, error } = useAuth()
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [busy,     setBusy]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch {
      // error is already set in context
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-shell-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="h-10 w-10 rounded-[14px] bg-shell-600 border border-white/5 flex items-center justify-center">
            <div className="h-5 w-5 rounded-full bg-brand-500" />
          </div>
          <span className="text-xl font-semibold text-ink-primary tracking-tight">Routtes</span>
        </div>

        <div className="rounded-[28px] border border-white/6 bg-shell-600 p-8">
          <h1 className="text-2xl font-semibold text-ink-primary mb-1">Entrar</h1>
          <p className="text-sm text-ink-muted mb-6">Acesse o painel de gestão</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full h-11 px-4 rounded-[14px] bg-white/5 border border-white/8 text-ink-primary placeholder:text-ink-muted text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-11 rounded-[14px] bg-white/5 border border-white/8 text-ink-primary placeholder:text-ink-muted text-sm focus:outline-none focus:border-brand-500/50 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-[12px] px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || loading}
              className="w-full h-11 rounded-[14px] bg-brand-500 text-ink-inverted font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {busy ? (
                <span className="h-4 w-4 border-2 border-ink-inverted/30 border-t-ink-inverted rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
