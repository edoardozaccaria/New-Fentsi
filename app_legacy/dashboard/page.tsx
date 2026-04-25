'use client'

export const dynamic = 'force-dynamic'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOnboardingStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import {
  Sparkles, ArrowLeft, Download, Share2, Users, MapPin,
  Star, CheckCircle2, TrendingUp, ExternalLink, Phone,
  Globe, Map, BadgeCheck, ArrowRight, Plus, X, ShoppingBag,
  Mail, CreditCard, ChevronRight, Loader2,
} from 'lucide-react'
import { BudgetBreakdown, VendorSuggestion, EventPlan } from '@/types/event'
import toast from 'react-hot-toast'
import VendorSelectionWizard from '@/components/vendors/VendorSelectionWizard'
// PlanPaywall removed — freemium model: plan is always accessible

// ── Map backend plan response → frontend EventPlan type ──────────────────────

interface BackendPlanResponse {
  id: string
  title: string
  event_type: string
  event_date: string
  location_city: string
  guest_count: number
  budget_total: string | number
  ai_summary: string
  budget_breakdown: BudgetBreakdown | null
  timeline: { date: string; task: string; priority: 'high' | 'medium' | 'low' }[] | null
  ai_tips: string[] | null
  style_notes: string | null
  status: string
  generated_at: string
  created_at: string
  vendors?: BackendVendor[]
  wizard_submission?: {
    venue_preference: string
    aesthetic_style: string[]
    top_priorities: string[]
    services_wanted: string[]
    extra_notes: string | null
  }
}

interface BackendVendor {
  id: string
  name: string
  category: string
  vendor_type: string
  address: string | null
  city: string | null
  price_range: string | null
  rating: string | number | null
  phone: string | null
  website: string | null
  instagram: string | null
  foursquare_url: string | null
  photo_urls: string[] | null
  ai_match_score: number | null
  ai_match_reason: string | null
  is_selected: boolean
}

function mapBackendPlan(bp: BackendPlanResponse): EventPlan {
  const budget = typeof bp.budget_total === 'string' ? parseFloat(bp.budget_total) : bp.budget_total

  const defaultBreakdown: BudgetBreakdown = {
    catering: 0, photography: 0, video: 0, venue: 0,
    flowers_decor: 0, music: 0, wedding_cake: 0,
    attire: 0, transport: 0, other: 0,
  }

  const vendors: VendorSuggestion[] = (bp.vendors || []).map((v) => ({
    name: v.name,
    category: v.category || v.vendor_type,
    description: v.ai_match_reason || '',
    priceRange: v.price_range || '',
    rating: typeof v.rating === 'string' ? parseFloat(v.rating) : (v.rating || 0),
    tags: [],
    address: v.address || undefined,
    phone: v.phone || undefined,
    website: v.website || undefined,
    googleMapsUri: v.foursquare_url || undefined,
    photoUrl: v.photo_urls?.[0] || undefined,
    reviewCount: undefined,
    whyRecommended: v.ai_match_reason || undefined,
    budgetAllocation: undefined,
  }))

  return {
    id: bp.id,
    title: bp.title,
    summary: bp.ai_summary || '',
    budgetBreakdown: bp.budget_breakdown || defaultBreakdown,
    vendors,
    timeline: bp.timeline || [],
    tips: bp.ai_tips || [],
    score: 90,
    createdAt: bp.created_at,
    vendorsFromGooglePlaces: true,
    locationDisplay: bp.location_city,
  }
}

async function fetchPlanFromBackend(planId: string): Promise<EventPlan> {
  const bp = await apiFetch<BackendPlanResponse>(`/plans/${planId}`)
  return mapBackendPlan(bp)
}

async function savePlanToBackend(planId: string): Promise<void> {
  await apiFetch(`/plans/${planId}/save`, { method: 'POST' })
}

async function exportPlanPdf(planId: string): Promise<void> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
  const res = await fetch(`${API_BASE}/plans/${planId}/pdf`, { credentials: 'include' })
  if (!res.ok) throw new Error('PDF export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fentsi-plan-${planId.slice(0, 8)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

const BUDGET_LABELS: Record<keyof BudgetBreakdown, string> = {
  catering:     '🍽️ Catering',
  photography:  '📸 Photography',
  video:        '🎬 Video',
  venue:        '🏛️ Venue',
  flowers_decor:'💐 Flowers & Décor',
  music:        '🎵 Music',
  wedding_cake: '🎂 Wedding Cake',
  attire:       '👗 Attire',
  transport:    '🚗 Transport',
  other:        '✨ Other',
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   'text-red-400 bg-red-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  low:    'text-green-400 bg-green-400/10',
}

// ── Budget bar ────────────────────────────────────────────────────────────────
function BudgetBar({ label, amount, total }: { label: string; amount: number; total: number }) {
  const pct = Math.round((amount / total) * 100)
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs">{pct}%</span>
          <span className="font-semibold">{formatCurrency(amount)}</span>
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
        />
      </div>
    </motion.div>
  )
}

// ── Category emoji map ────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  venue:           '🏛️',
  catering:        '🍽️',
  photography:     '📸',
  video:           '🎬',
  flowers_decor:   '💐',
  music:           '🎵',
  wedding_cake:    '🎂',
  transport:       '🚗',
  entertainment:   '✨',
  lighting:        '💡',
  wedding_planner: '📋',
}

// ── Rich vendor card ──────────────────────────────────────────────────────────
function VendorCard({
  vendor,
  index,
  selected,
  onToggle,
}: {
  vendor: VendorSuggestion
  index: number
  selected: boolean
  onToggle: (v: VendorSuggestion) => void
}) {
  const hasPhoto = !!vendor.photoUrl
  const hasMap   = !!vendor.googleMapsUri
  const hasPhone = !!vendor.phone
  const website  = vendor.website
  const isSearchFallback = website?.startsWith('https://www.google.com/search')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl overflow-hidden border transition-all group flex flex-col ${
        selected
          ? 'border-rose-500/50 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.08)]'
          : 'border-white/8 hover:border-white/15 bg-white/[0.02]'
      }`}
    >
      {/* Photo or accent bar */}
      {hasPhoto ? (
        <div className="relative h-40 w-full overflow-hidden flex-shrink-0">
          <Image
            src={vendor.photoUrl!}
            alt={vendor.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {vendor.rating && (
            <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-amber-400 bg-black/50 backdrop-blur px-2 py-1 rounded-full">
              <Star size={10} fill="currentColor" /> {vendor.rating}
            </span>
          )}
          {selected && (
            <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 size={14} className="text-white" />
            </div>
          )}
        </div>
      ) : (
        <div className={`h-1.5 w-full flex-shrink-0 ${selected ? 'bg-rose-500' : 'bg-gradient-to-r from-rose-500/30 to-orange-400/15'}`} />
      )}

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white leading-snug">{vendor.name}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-white/35">{vendor.priceRange}</span>
            {!hasPhoto && vendor.rating && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-amber-400">
                <Star size={9} fill="currentColor" /> {vendor.rating}
              </span>
            )}
          </div>
        </div>

        {vendor.address && (
          <p className="flex items-center gap-1 text-xs text-white/35 mb-2 leading-tight">
            <MapPin size={10} className="flex-shrink-0" />
            <span className="truncate">{vendor.address}</span>
          </p>
        )}

        <p className="text-sm text-white/55 leading-relaxed mb-3 flex-1">{vendor.description}</p>

        {vendor.whyRecommended && (
          <div className="flex items-start gap-2 bg-rose-500/8 border border-rose-500/15 rounded-xl p-3 mb-3">
            <BadgeCheck size={13} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-300/80 leading-relaxed">{vendor.whyRecommended}</p>
          </div>
        )}

        {vendor.budgetAllocation ? (
          <div className="text-xs text-white/35 mb-3">
            Budget: <span className="text-white/65 font-semibold">{formatCurrency(vendor.budgetAllocation)}</span>
          </div>
        ) : null}

        {/* ── Book via Fentsi CTA (primary) ─────────────────────── */}
        <button
          onClick={() => onToggle(vendor)}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-2 ${
            selected
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-rose-500/12 text-rose-300 hover:bg-rose-500/20 border border-rose-500/25'
          }`}
        >
          {selected ? (
            <><CheckCircle2 size={14} /> Selezionato</>
          ) : (
            <><Plus size={14} /> Aggiungi alla prenotazione</>
          )}
        </button>

        {/* ── Website / secondary links ──────────────────────────── */}
        <div className="flex gap-2">
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/5"
            >
              <Globe size={11} />
              {isSearchFallback ? 'Cerca online' : 'Sito web'}
              <ExternalLink size={10} className="opacity-50" />
            </a>
          )}
          {hasMap && (
            <a href={vendor.googleMapsUri!} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/5">
              <Map size={11} /> Mappa
            </a>
          )}
          {hasPhone && (
            <a href={`tel:${vendor.phone}`}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70 py-2 rounded-lg hover:bg-white/5 transition-colors border border-white/5">
              <Phone size={11} /> Chiama
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Booking modal ─────────────────────────────────────────────────────────────
function BookingModal({
  vendors,
  onClose,
  eventTitle,
  contactEmail,
  backendPlanId,
}: {
  vendors: VendorSuggestion[]
  onClose: () => void
  eventTitle: string
  contactEmail: string
  backendPlanId?: string | null
}) {
  const [step, setStep]       = useState<'summary' | 'confirm' | 'loading' | 'done'>('summary')
  const [email, setEmail]     = useState(contactEmail)
  const [name, setName]       = useState('')
  const [message, setMessage] = useState('')
  const [mode, setMode]       = useState<'enquiry' | 'coordination'>('enquiry')

  const totalBudget = vendors.reduce((sum, v) => sum + (v.budgetAllocation ?? 0), 0)

  async function handleSubmit() {
    setStep('loading')
    if (mode === 'coordination' && backendPlanId) {
      // Call backend coordination endpoint
      try {
        await apiFetch(`/plans/${backendPlanId}/coordination`, {
          method: 'POST',
          body: { notes: message || undefined },
        })
        setStep('done')
      } catch {
        // Fallback to Stripe checkout
        try {
          const res = await fetch('/api/checkout/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vendors: vendors.map((v) => ({ name: v.name, category: v.category, website: v.website })),
              eventTitle,
              email,
              name,
              message,
            }),
          })
          const { url } = await res.json()
          if (url) window.location.href = url
          else setStep('summary')
        } catch {
          setStep('summary')
        }
      }
    } else if (mode === 'coordination') {
      // No backend plan — use Stripe checkout
      try {
        const res = await fetch('/api/checkout/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendors: vendors.map((v) => ({ name: v.name, category: v.category, website: v.website })),
            eventTitle,
            email,
            name,
            message,
          }),
        })
        const { url } = await res.json()
        if (url) window.location.href = url
        else setStep('summary')
      } catch {
        setStep('summary')
      }
    } else {
      // Free enquiry — call backend quote endpoints if available
      if (backendPlanId) {
        try {
          // Request quotes for each selected vendor that has a backend vendor ID
          for (const v of vendors) {
            // The vendor may have a backend ID in the plan
            const vendorId = (v as VendorSuggestion & { backendId?: string }).backendId
            if (vendorId) {
              await apiFetch(`/plans/${backendPlanId}/vendors/${vendorId}/quote`, {
                method: 'POST',
                body: { message: message || `Hi, I would like a quote for ${eventTitle}.` },
              }).catch(() => {}) // best effort per vendor
            }
          }
          setStep('done')
        } catch {
          setStep('done')
        }
      } else {
        await new Promise((r) => setTimeout(r, 1500))
        setStep('done')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg bg-[#111118] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Prenota con Fentsi</h2>
              <p className="text-xs text-white/40">{vendors.length} servizi selezionati</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {step === 'summary' && (
          <div className="p-6 space-y-5">
            {/* Selected vendors list */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {vendors.map((v) => (
                <div key={v.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{v.name}</p>
                    <p className="text-xs text-white/40">{v.category}</p>
                  </div>
                  {v.budgetAllocation ? (
                    <span className="text-sm font-semibold text-white/70 flex-shrink-0">
                      {formatCurrency(v.budgetAllocation)}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            {totalBudget > 0 && (
              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <span className="text-sm text-white/50">Budget totale allocato</span>
                <span className="font-bold text-white">{formatCurrency(totalBudget)}</span>
              </div>
            )}

            {/* Mode selector */}
            <div className="space-y-2">
              <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Come vuoi procedere?</p>
              <button
                onClick={() => setMode('enquiry')}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  mode === 'enquiry'
                    ? 'border-rose-500/40 bg-rose-500/8'
                    : 'border-white/8 hover:border-white/15 bg-white/[0.02]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'enquiry' ? 'bg-rose-500/20' : 'bg-white/5'}`}>
                  <Mail size={15} className={mode === 'enquiry' ? 'text-rose-400' : 'text-white/40'} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white">Richiedi preventivi</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">Gratuito</span>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed">Fentsi invia una richiesta di preventivo a ogni fornitore selezionato per conto tuo</p>
                </div>
              </button>

              <button
                onClick={() => setMode('coordination')}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                  mode === 'coordination'
                    ? 'border-rose-500/40 bg-rose-500/8'
                    : 'border-white/8 hover:border-white/15 bg-white/[0.02]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${mode === 'coordination' ? 'bg-rose-500/20' : 'bg-white/5'}`}>
                  <CreditCard size={15} className={mode === 'coordination' ? 'text-rose-400' : 'text-white/40'} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white">Pacchetto coordinamento</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">€99</span>
                  </div>
                  <p className="text-xs text-white/45 leading-relaxed">Il team Fentsi gestisce tutte le trattative, contratti e conferme con i fornitori al posto tuo</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('confirm')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              Continua <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-white/50">
              {mode === 'enquiry'
                ? 'Inserisci i tuoi dati — invieremo le richieste di preventivo ai fornitori.'
                : 'Inserisci i tuoi dati per procedere al pagamento del pacchetto coordinamento (€99).'}
            </p>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Il tuo nome"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-rose-500/50"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email"
                type="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-rose-500/50"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Note aggiuntive per i fornitori (opzionale)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-rose-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('summary')}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm transition-colors"
              >
                Indietro
              </button>
              <button
                onClick={handleSubmit}
                disabled={!email || !name}
                className="flex-2 flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {mode === 'enquiry' ? 'Invia richieste' : 'Paga €99 →'}
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="p-12 flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-rose-400 animate-spin" />
            <p className="text-white/60 text-sm">
              {mode === 'enquiry' ? 'Invio richieste ai fornitori…' : 'Reindirizzamento al pagamento…'}
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mb-2">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Richieste inviate!</h3>
            <p className="text-white/50 text-sm max-w-xs">
              Abbiamo inviato le richieste di preventivo a {vendors.length} fornitori. Riceverai risposta su <span className="text-white/80">{email}</span> entro 24–48 ore.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-8 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Perfetto!
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Main dashboard (inner — uses useSearchParams, must be inside Suspense) ────
function DashboardContent() {
  const { plan: storePlan, data, setPlan: setStorePlan } = useOnboardingStore()
  const { isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const [selectedNames, setSelectedNames]       = useState<Set<string>>(new Set())
  const [bookingModalOpen, setBookingModalOpen]  = useState(false)
  const [successToast, setSuccessToast]          = useState(false)
  const [backendPlan, setBackendPlan]            = useState<EventPlan | null>(null)
  const [isLoadingPlan, setIsLoadingPlan]        = useState(false)
  const [loadError, setLoadError]                = useState<string | null>(null)
  const [wizardDone, setWizardDone]              = useState(false)
  const backendPlanId = searchParams.get('planId')

  // Fetch plan from backend if planId is in the URL
  useEffect(() => {
    if (!backendPlanId) return
    let cancelled = false

    async function load() {
      setIsLoadingPlan(true)
      setLoadError(null)
      try {
        const fetched = await fetchPlanFromBackend(backendPlanId!)
        if (!cancelled) {
          setBackendPlan(fetched)
          setStorePlan(fetched) // also hydrate the store
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load plan')
        }
      } finally {
        if (!cancelled) setIsLoadingPlan(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [backendPlanId, setStorePlan])

  useEffect(() => {
    if (searchParams.get('booking') === 'success') {
      setSuccessToast(true)
      setTimeout(() => setSuccessToast(false), 6000)
    }
  }, [searchParams])

  const toggleVendor = useCallback((vendor: VendorSuggestion) => {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      if (next.has(vendor.name)) next.delete(vendor.name)
      else next.add(vendor.name)
      return next
    })
  }, [])

  // Called when the vendor selection wizard completes
  const handleWizardComplete = useCallback(
    (selections: Record<string, VendorSuggestion | null>) => {
      const chosen = Object.values(selections).filter((v): v is VendorSuggestion => v !== null)
      setSelectedNames(new Set(chosen.map((v) => v.name)))
      setWizardDone(true)
    },
    []
  )

  // Use backend plan if available, else fall back to store plan
  const plan = backendPlan || storePlan

  if (isLoadingPlan) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={32} className="text-rose-400 animate-spin mx-auto" />
          <p className="text-white/50">Loading your plan...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{loadError}</p>
          <Link href="/onboarding"
            className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium">
            Create a new plan
          </Link>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-white/50 mb-6">No plan found</p>
          <Link href="/onboarding"
            className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium">
            Create your plan
          </Link>
        </div>
      </div>
    )
  }

  // Show vendor wizard on first load (if plan has vendors and wizard not yet completed)
  if (!wizardDone && plan.vendors.length > 0) {
    return <VendorSelectionWizard plan={plan} onComplete={handleWizardComplete} />
  }

  const selectedVendors = plan.vendors.filter((v) => selectedNames.has(v.name))
  const totalBudget = Object.values(plan.budgetBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-[#09090F]">

      {/* ── Success toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-green-500/15 border border-green-500/30 backdrop-blur-xl shadow-2xl"
          >
            <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-sm font-medium text-white">Prenotazione confermata! Ti contatteremo entro 24 ore.</p>
            <button onClick={() => setSuccessToast(false)} className="text-white/40 hover:text-white ml-1"><X size={15} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between glass border-b border-white/5">
        <Link href="/onboarding" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Start over</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="font-semibold text-sm">fentsi</span>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-white/60 hover:text-white text-xs transition-colors">
            <Share2 size={13} /> Share
          </button>
          <button
            onClick={() => {
              if (backendPlanId) {
                exportPlanPdf(backendPlanId).catch(() => toast?.('PDF export failed'))
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 text-white text-xs font-medium"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Hero card ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative p-8 rounded-3xl overflow-hidden mb-8"
          style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15) 0%, rgba(251,146,60,0.08) 100%)' }}
        >
          <div className="absolute inset-0 border border-rose-500/20 rounded-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-widest text-rose-400/80 font-medium">
                Fentsi Event Plan
                {plan.vendorsFromGooglePlaces && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full text-[10px] normal-case tracking-normal">
                    <BadgeCheck size={10} /> Real vendors
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <Star size={12} fill="currentColor" className="text-amber-400" />
                <span className="text-sm font-bold">{plan.score}/100</span>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">{plan.title}</h1>
            <p className="text-white/60 leading-relaxed mb-6 max-w-2xl">{plan.summary}</p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Users,      label: `${data.guestsCount} guests`,                          sub: 'invited' },
                { icon: TrendingUp, label: formatCurrency(totalBudget),                           sub: 'total budget' },
                { icon: MapPin,     label: plan.locationDisplay || data.region || '—',             sub: 'location' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <s.icon size={16} className="text-rose-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm capitalize">{s.label}</div>
                    <div className="text-xs text-white/40">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* ── Budget breakdown ──────────────────────────────────────── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-xs">💰</span>
              Budget Breakdown
            </h2>
            <div className="space-y-4">
              {Object.entries(plan.budgetBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([key, val]) => val > 0 ? (
                  <BudgetBar
                    key={key}
                    label={BUDGET_LABELS[key as keyof BudgetBreakdown]}
                    amount={val}
                    total={totalBudget}
                  />
                ) : null)}
            </div>
          </motion.section>

          {/* ── Timeline ─────────────────────────────────────────────── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">📅</span>
              Timeline
            </h2>
            <div className="space-y-3">
              {plan.timeline.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 p-4 rounded-xl glass"
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs text-white/40 font-mono">{item.date}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm text-white/80">{item.task}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* ── Vendors grouped by category ────────────────────────────────── */}
        {(() => {
          // Group vendors by category
          const grouped = plan.vendors.reduce<Record<string, VendorSuggestion[]>>((acc, v) => {
            const key = v.category
            if (!acc[key]) acc[key] = []
            acc[key].push(v)
            return acc
          }, {})
          const categories = Object.keys(grouped)

          return categories.length > 0 ? (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">⭐</span>
                  Recommended Vendors
                </h2>
                {plan.vendorsFromGooglePlaces && (
                  <span className="flex items-center gap-1 text-xs text-green-400/70">
                    <BadgeCheck size={12} /> Real local vendors
                  </span>
                )}
              </div>

              <div className="space-y-10">
                {categories.map((cat, catIdx) => {
                  const catKey = cat.toLowerCase().replace(/\s+/g, '_').replace('&', '')
                  const emoji  = CATEGORY_EMOJI[catKey] ??
                    CATEGORY_EMOJI[Object.keys(CATEGORY_EMOJI).find(k => cat.toLowerCase().includes(k)) ?? ''] ??
                    '🏷️'
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * catIdx }}
                    >
                      {/* Category header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl">{emoji}</span>
                        <h3 className="font-semibold text-white text-base">{cat}</h3>
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-xs text-white/30">{grouped[cat].length} option{grouped[cat].length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Vendor cards — 3 columns on desktop */}
                      <div className="grid md:grid-cols-3 gap-4">
                        {grouped[cat].map((v, i) => (
                          <VendorCard
                            key={`${cat}-${i}`}
                            vendor={v}
                            index={catIdx * 3 + i}
                            selected={selectedNames.has(v.name)}
                            onToggle={toggleVendor}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.section>
          ) : null
        })()}

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-10">
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center text-xs">💡</span>
            Fentsi Tips
          </h2>
          <div className="space-y-3">
            {plan.tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                className="flex items-start gap-3 p-4 rounded-xl glass"
              >
                <CheckCircle2 size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white/70">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Upgrade CTA ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-12 mb-8 p-8 rounded-3xl relative overflow-hidden text-center"
          style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(251,146,60,0.08) 100%)' }}
        >
          <div className="absolute inset-0 border border-rose-500/15 rounded-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={22} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Vuoi andare oltre?</h3>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Passa a Fentsi Pro per piani illimitati, messaggi diretti ai fornitori, gestione contratti e supporto prioritario.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold hover:opacity-90 transition-opacity">
                Prova Pro gratis 14 giorni <ArrowRight size={16} />
              </button>
              <Link href="/onboarding" className="px-8 py-3 rounded-full glass text-white/70 hover:text-white font-medium transition-colors">
                Pianifica un altro evento
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bottom padding so sticky bar doesn't cover content */}
        {selectedVendors.length > 0 && <div className="h-28" />}
      </div>

      {/* ── Sticky booking bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVendors.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#0d0d14]/95 backdrop-blur-xl border-t border-white/8"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag size={20} className="text-rose-400" />
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {selectedVendors.length}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedVendors.length} servizi selezionati
                  </p>
                  <p className="text-xs text-white/40">
                    {selectedVendors.map((v) => v.category).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedNames(new Set())}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-2"
                >
                  Deseleziona tutto
                </button>
                <button
                  onClick={() => setBookingModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Prenota con Fentsi <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Booking modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {bookingModalOpen && (
          <BookingModal
            vendors={selectedVendors}
            onClose={() => setBookingModalOpen(false)}
            eventTitle={plan.title}
            contactEmail={data.contactEmail ?? ''}
            backendPlanId={backendPlanId}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page export — wraps DashboardContent in Suspense (required by useSearchParams) ──
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
