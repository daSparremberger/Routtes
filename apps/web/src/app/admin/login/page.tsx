'use client'

import { useAdminAuth } from '@/contexts/admin-auth-context'
import { useState } from 'react'
import { motion } from 'motion/react'
import { ShieldAlert } from 'lucide-react'

export default function AdminLoginPage() {
  const { signInWithGoogle, error } = useAdminAuth()
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-shell-900 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="mb-12">
          <div className="h-12 w-12 rounded-[18px] bg-shell-600 border border-white/5 flex items-center justify-center mb-8">
            <ShieldAlert size={22} className="text-brand-500" strokeWidth={1.8} />
          </div>

          <h1 className="text-[32px] font-bold tracking-[-0.04em] text-ink-primary leading-none mb-3">
            Admin
          </h1>
          <p className="text-base text-ink-muted leading-relaxed">
            Acesse o painel de administração da plataforma.
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-14 rounded-[16px] bg-white flex items-center justify-center gap-3 font-semibold text-[#1f1a15] text-[15px] hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
          {loading ? (
            <span className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Entrando…' : 'Continuar com Google'}
        </button>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-red-400 bg-red-400/10 rounded-[12px] px-4 py-3 text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a11.994 11.994 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}
