'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { signInWithGoogle, signInWithApple } from '@/lib/auth'
import {
  Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react'

// ── Icone SVG OAuth (inline per evitare dipendenze extra) ────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.6-4.2 7.3-10.4 7.3-17.3z" fill="#4285F4"/>
      <path d="M24 48c6.5 0 12-2.1 16-5.8l-7.8-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9H2.4v6.2C6.4 42.7 14.6 48 24 48z" fill="#34A853"/>
      <path d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6v-6.2H2.4A23.9 23.9 0 000 24c0 3.9.9 7.5 2.4 10.8l8.1-6.2z" fill="#FBBC05"/>
      <path d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.1 30.4 0 24 0 14.6 0 6.4 5.3 2.4 13.2l8.1 6.2C12.4 13.7 17.7 9.5 24 9.5z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-164-39.3c-76 0-103.7 40.8-165.9 40.8s-105.3-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.1 135.4-316.6 268.1-316.6 71 0 130.5 46.4 174.1 46.4 43.7 0 112.1-49.4 190.8-49.4 30.5 0 108.2 2.6 168.1 92.3zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
    </svg>
  )
}

// ── Form principale ───────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const callbackError = searchParams.get('error')

  // Accede al contesto Supabase globale (AuthProvider in Providers.tsx)
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    callbackError === 'callback_failed' ? 'Autenticazione fallita. Riprova.' : ''
  )
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  // ── Login email/password ─────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // signInWithPassword via context → Supabase gestisce sessione + cookie
      await login(email, password)
      router.push(redirect)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso fallito. Riprova.')
      setLoading(false)
    }
  }

  // ── Login OAuth Google ───────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setError('')
    setOauthLoading('google')
    try {
      // Redirige a Google → torna su /auth/callback → poi a /dashboard
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore con Google. Riprova.')
      setOauthLoading(null)
    }
  }

  // ── Login OAuth Apple ────────────────────────────────────────────────────

  const handleAppleLogin = async () => {
    setError('')
    setOauthLoading('apple')
    try {
      // Redirige ad Apple → torna su /auth/callback → poi a /dashboard
      await signInWithApple()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore con Apple. Riprova.')
      setOauthLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090F] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">fentsi</span>
        </Link>

        <h1 className="text-2xl font-bold text-white text-center mb-2">Bentornato</h1>
        <p className="text-white/40 text-center text-sm mb-8">
          Accedi per gestire i tuoi eventi
        </p>

        {/* Messaggio di errore */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Pulsanti OAuth */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium text-white border border-white/10 hover:border-white/20 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {oauthLoading === 'google' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continua con Google
          </button>

          <button
            type="button"
            onClick={handleAppleLogin}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-sm font-medium text-white border border-white/10 hover:border-white/20 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {oauthLoading === 'apple' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <AppleIcon />
            )}
            Continua con Apple
          </button>
        </div>

        {/* Divisore */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/20">oppure con email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form email/password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Indirizzo email"
              required
              autoComplete="email"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-rose-400/70 hover:text-rose-400 transition-colors">
              Password dimenticata?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || !!oauthLoading || !email || !password}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Accedi <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          Non hai un account?{' '}
          <Link href="/signup" className="text-rose-400 hover:text-rose-300 transition-colors">
            Registrati
          </Link>
        </p>

        {/* Continua senza account */}
        <Link
          href="/onboarding"
          className="mt-4 block w-full text-center py-3 rounded-2xl text-sm text-white/50 hover:text-white/70 border border-white/8 hover:border-white/15 transition-all"
        >
          Continua senza account
        </Link>
      </motion.div>
    </div>
  )
}

// ── Export con Suspense (richiesto da useSearchParams nel App Router) ─────────

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090F]" />}>
      <LoginForm />
    </Suspense>
  )
}
