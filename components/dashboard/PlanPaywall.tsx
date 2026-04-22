'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Lock, Sparkles, CheckCircle2, ArrowRight, Star,
  Loader2, Calendar, MapPin, Users,
} from 'lucide-react'
import { EventPlan } from '@/types/event'
import { formatCurrency } from '@/lib/utils'

interface Props {
  plan: EventPlan
  userEmail?: string
}

const FEATURES = [
  'Piano evento completo con timeline',
  'Fornitori AI selezionati per te',
  'Breakdown del budget dettagliato',
  'Consigli personalizzati dall\'AI',
  'Export PDF del piano',
  '1 evento al mese',
]

export default function PlanPaywall({ plan, userEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'single',
          email: userEmail ?? '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il checkout')
      setLoading(false)
    }
  }

  // ── Teaser stats (blurred data to entice) ─────────────────────────────────
  const totalBudget = Object.values(plan.budgetBreakdown).reduce((a, b) => a + b, 0) || 0
  const vendorCount = plan.vendors.length

  return (
    <div className="fixed inset-0 z-50 bg-[#09090F] flex flex-col overflow-y-auto">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-500/8 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-orange-400/5 blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-16 w-full">
        {/* Lock badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <Lock size={14} className="text-rose-400" />
            <span className="text-rose-300 text-xs font-semibold tracking-wide uppercase">Piano pronto</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Il tuo piano è pronto! 🎉
          </h1>
          <p className="text-white/50 text-base max-w-md mx-auto">
            Sblocca il piano completo con fornitori, budget e timeline personalizzati per il tuo evento.
          </p>
        </motion.div>

        {/* Blurred plan teaser */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 mb-8 overflow-hidden"
        >
          {/* Frosted overlay */}
          <div className="absolute inset-0 bg-[#09090F]/60 backdrop-blur-sm z-10 rounded-3xl flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Lock size={22} className="text-rose-400" />
            </div>
            <p className="text-white/70 text-sm font-medium">Abbonati per vedere il piano</p>
          </div>

          {/* Blurred content behind */}
          <div className="filter blur-sm select-none">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1">
                <div className="h-5 w-48 bg-white/10 rounded-full mb-2" />
                <div className="h-3 w-32 bg-white/5 rounded-full" />
              </div>
              <div className="text-right">
                <div className="h-5 w-24 bg-rose-500/20 rounded-full mb-2 ml-auto" />
                <div className="h-3 w-16 bg-white/5 rounded-full ml-auto" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/8" />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { icon: Sparkles,  label: 'Fornitori trovati', value: `${vendorCount}+` },
            { icon: Users,     label: 'Budget allocato',   value: totalBudget > 0 ? formatCurrency(totalBudget) : '—' },
            { icon: Calendar,  label: 'Steps nel piano',   value: `${Math.max(plan.timeline?.length ?? 0, 8)}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 text-center">
              <Icon size={18} className="text-rose-400 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-white/35 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Pricing card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-500/8 to-transparent p-6 mb-6"
        >
          {/* Price */}
          <div className="text-center mb-6">
            <div className="flex items-end justify-center gap-1 mb-1">
              <span className="text-5xl font-bold text-white">€4,99</span>
              <span className="text-white/40 text-base mb-2">/mese</span>
            </div>
            <p className="text-white/40 text-sm">1 evento al mese · Cancella quando vuoi</p>
          </div>

          {/* Feature list */}
          <div className="space-y-2.5 mb-6">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-rose-400 flex-shrink-0" />
                <span className="text-white/70 text-sm">{f}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Reindirizzamento...</>
            ) : (
              <><Sparkles size={18} /> Sblocca il tuo piano</>
            )}
          </button>

          {error && (
            <p className="text-red-400 text-xs text-center mt-3">{error}</p>
          )}
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6 text-white/25 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Star size={11} fill="currentColor" />
            <span>Pagamento sicuro Stripe</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Lock size={11} />
            <span>Cancellazione in qualsiasi momento</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
