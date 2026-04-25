'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { signInWithGoogle, signInWithApple } from '@/lib/auth'
import {
  Sparkles, Mail, Lock, User, ArrowRight, Loader2,
  AlertCircle, CheckCircle2,
} from 'lucide-react'

// ── Icone SVG OAuth ───────────────────────────────────────────────────────────

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

// ── Calcolo forza password ────────────────────────────────────────────────────

function getPasswordStrength(password: string): {
  level: number
  label: string
  color: string
  textColor: string
} {
  if (password.length === 0) return { level: 0, label: '', color: '', textColor: '' }
  if (password.length < 6) return { level: 1, label: 'Debole', color: 'bg-red-500', textColor: 'text-red-400' }

  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 2, label: 'Discreta', color: 'bg-amber-500', textColor: 'text-amber-400' }
  if (score <= 2) return { level: 3, label: 'Buona', color: 'bg-blue-500', textColor: 'text-blue-400' }
  return { level: 4, label: 'Ottima', color: 'bg-green-500', textColor: 'text-green-400' }
}

// ── Componente principale ─────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()

  // Accede al contesto Supabase globale (AuthProvider in Providers.tsx)
  const { register } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  // true quando Supabase ha inviato l'email di conferma
  const [needsVerification, setNeedsVerification] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  // ── Registrazione email/password ─────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.')
      return
    }

    setLoading(true)

    try {
      // Chiama supabase.auth.signUp via context
      const result = await register(email, password, fullName)

      if (result.needsVerification) {
        // Verifica email abilitata → mostriamo la schermata di conferma
        setNeedsVerification(true)
      } else {
        // Verifica email disabilitata → l'utente è già loggato
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione fallita. Riprova.')
    }

    setLoading(false)
  }

  // ── OAuth Google ─────────────────────────────────────────────────────────

  const handleGoogleSignup = async () => {
    setError('')
    setOauthLoading('google')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore con Google. Riprova.')
      setOauthLoading(null)
    }
  }

  // ── OAuth Apple ──────────────────────────────────────────────────────────

  const handleAppleSignup = async () => {
    setError('')
    setOauthLoading('apple')
    try {
      await signInWithApple()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore con Apple. Riprova.')
      setOauthLoading(null)
    }
  }

  // ── Schermata di conferma email ──────────────────────────────────────────

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Controlla la tua email</h1>
          <p className="text-white/50 text-sm mb-6">
            Abbiamo inviato un link di conferma a{' '}
            <span className="text-white">{email}</span>.
            Clicca il link per attivare il tuo account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm transition-colors"
          >
            Torna al login <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    )
  }

  // ── Form di registrazione ────────────────────────────────────────────────

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

        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Crea il tuo account
        </h1>
        <p className="text-white/40 text-center text-sm mb-8">
          Pianifica eventi perfetti con l&apos;AI
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
            onClick={handleGoogleSignup}
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
            onClick={handleAppleSignup}
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
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome completo"
              required
              autoComplete="name"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
            />
          </div>

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

          <div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 caratteri)"
                required
                autoComplete="new-password"
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>
            {/* Indicatore forza password */}
            {password.length > 0 && (
              <div className="flex items-center gap-2 mt-2 px-1">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.level
                          ? passwordStrength.color
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs ${passwordStrength.textColor}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!oauthLoading || !email || !password || !fullName}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-white bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Crea account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-4 px-4">
          Creando un account, accetti i nostri Termini di Servizio e la Privacy Policy.
        </p>

        <p className="text-center text-sm text-white/30 mt-6">
          Hai già un account?{' '}
          <Link href="/login" className="text-rose-400 hover:text-rose-300 transition-colors">
            Accedi
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
