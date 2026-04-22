'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Star, MapPin, CheckCircle2, ArrowRight, SkipForward,
  BadgeCheck, Globe, Phone, ChevronLeft, ShoppingCart,
} from 'lucide-react'
import { VendorSuggestion, EventPlan } from '@/types/event'
import { formatCurrency } from '@/lib/utils'

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; label: string; subtitle: string }> = {
  venue:           { emoji: '🏛️', label: 'Venue',              subtitle: 'Dove si svolgerà il tuo evento' },
  catering:        { emoji: '🍽️', label: 'Catering',           subtitle: 'Il banchetto che ricorderanno' },
  photography:     { emoji: '📸', label: 'Fotografo',          subtitle: 'I momenti da conservare per sempre' },
  video:           { emoji: '🎬', label: 'Videomaker',         subtitle: 'Il film del tuo evento' },
  flowers_decor:   { emoji: '💐', label: 'Fiori & Décor',      subtitle: 'L\'atmosfera che hai immaginato' },
  music:           { emoji: '🎵', label: 'Musica',             subtitle: 'La colonna sonora perfetta' },
  wedding_cake:    { emoji: '🎂', label: 'Wedding Cake',       subtitle: 'La torta dei tuoi sogni' },
  transport:       { emoji: '🚗', label: 'Trasporti',          subtitle: 'Arriva in grande stile' },
  entertainment:   { emoji: '✨', label: 'Intrattenimento',    subtitle: 'Sorprendi i tuoi ospiti' },
  lighting:        { emoji: '💡', label: 'Illuminazione',      subtitle: 'La luce giusta per ogni momento' },
  wedding_planner: { emoji: '📋', label: 'Wedding Planner',   subtitle: 'Il tuo supporto professionale' },
}

function getCategoryMeta(category: string): { emoji: string; label: string; subtitle: string } {
  const key = category.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
  return (
    CATEGORY_META[key] ??
    CATEGORY_META[Object.keys(CATEGORY_META).find((k) => key.includes(k) || k.includes(key)) ?? ''] ??
    { emoji: '🏷️', label: category, subtitle: 'Scegli il fornitore ideale' }
  )
}

// ── Single vendor card in the wizard ─────────────────────────────────────────
function WizardVendorCard({
  vendor,
  isSelected,
  index,
  onSelect,
}: {
  vendor: VendorSuggestion
  isSelected: boolean
  index: number
  onSelect: () => void
}) {
  const meta = getCategoryMeta(vendor.category)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={onSelect}
      className={`relative rounded-3xl overflow-hidden border-2 cursor-pointer transition-all duration-300 group flex flex-col ${
        isSelected
          ? 'border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.22)]'
          : 'border-white/8 hover:border-white/25'
      }`}
    >
      {/* ── Hero photo ────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden flex-shrink-0">
        {vendor.photoUrl ? (
          <Image
            src={vendor.photoUrl}
            alt={vendor.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 via-orange-400/10 to-transparent flex items-center justify-center">
            <span className="text-6xl opacity-30">{meta.emoji}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Rating */}
        {vendor.rating > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            <Star size={11} fill="#fbbf24" className="text-amber-400" />
            <span className="text-xs font-bold text-white">{vendor.rating}</span>
            {vendor.reviewCount && vendor.reviewCount > 0 ? (
              <span className="text-[10px] text-white/50 ml-0.5">({vendor.reviewCount})</span>
            ) : null}
          </div>
        )}

        {/* Selected checkmark */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/50"
            >
              <CheckCircle2 size={20} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price bottom-left */}
        {vendor.priceRange && (
          <div className="absolute bottom-4 left-4 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs font-bold text-white/80">
            {vendor.priceRange}
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div
        className={`p-5 flex flex-col flex-1 transition-colors ${
          isSelected ? 'bg-rose-500/8' : 'bg-white/[0.02]'
        }`}
      >
        <h3 className="font-bold text-white text-lg leading-tight mb-1.5">{vendor.name}</h3>

        {vendor.address && (
          <p className="flex items-center gap-1.5 text-xs text-white/40 mb-3 leading-tight">
            <MapPin size={11} className="flex-shrink-0 text-rose-400/60" />
            <span className="line-clamp-1">{vendor.address}</span>
          </p>
        )}

        {vendor.whyRecommended && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/8 border border-rose-500/15 mb-3">
            <BadgeCheck size={13} className="text-rose-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-rose-300/75 leading-relaxed">{vendor.whyRecommended}</p>
          </div>
        )}

        {vendor.budgetAllocation ? (
          <p className="text-xs text-white/30 mt-auto pt-2">
            Budget allocato: <span className="text-white/55 font-semibold">{formatCurrency(vendor.budgetAllocation)}</span>
          </p>
        ) : null}

        {/* Service links */}
        <div className="flex gap-2 mt-3">
          {vendor.website && !vendor.website.includes('google.com/search') && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs transition-colors"
            >
              <Globe size={11} /> Sito
            </a>
          )}
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-xs transition-colors"
            >
              <Phone size={11} /> Tel
            </a>
          )}
        </div>

        {/* Amazon product links (for decor / product categories) */}
        {vendor.productLinks && vendor.productLinks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <p className="text-[10px] text-white/30 uppercase tracking-wide mb-2">Prodotti consigliati</p>
            <div className="space-y-1.5">
              {vendor.productLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-400/8 border border-orange-400/15 hover:bg-orange-400/15 text-orange-300/80 hover:text-orange-200 text-xs transition-colors"
                >
                  <ShoppingCart size={10} className="flex-shrink-0" />
                  <span className="flex-1 truncate">{link.title}</span>
                  <span className="text-[10px] text-orange-400/50">Amazon.it</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Selection indicator bottom bar ─────────────────── */}
      <div
        className={`h-1 transition-all duration-300 ${
          isSelected ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-transparent'
        }`}
      />
    </motion.div>
  )
}

// ── Final summary screen ──────────────────────────────────────────────────────
function WizardSummary({
  selections,
  steps,
  onConfirm,
}: {
  selections: Record<string, VendorSuggestion | null>
  steps: { category: string; emoji: string; label: string }[]
  onConfirm: () => void
}) {
  const chosen = steps.filter((s) => selections[s.category] && selections[s.category] !== null)
  const skipped = steps.filter((s) => s.category in selections && selections[s.category] === null)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto text-center"
    >
      <div className="text-6xl mb-5">🎉</div>
      <h1 className="text-2xl font-bold text-white mb-2">Selezione completata!</h1>
      <p className="text-white/50 text-sm mb-8">
        Hai scelto {chosen.length} fornitori per il tuo evento
      </p>

      {/* Selected vendors */}
      <div className="space-y-2 mb-6 text-left">
        {chosen.map((s) => {
          const vendor = selections[s.category]!
          return (
            <div
              key={s.category}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/8"
            >
              <span className="text-lg">{s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{vendor.name}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </div>
              <CheckCircle2 size={16} className="text-rose-400 flex-shrink-0" />
            </div>
          )
        })}
        {skipped.length > 0 && (
          <p className="text-xs text-white/25 text-center pt-1">
            {skipped.length} categoria{skipped.length > 1 ? 'e' : ''} saltata{skipped.length > 1 ? '' : ''}
          </p>
        )}
      </div>

      <button
        onClick={onConfirm}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
      >
        Vai al tuo piano <ArrowRight size={18} />
      </button>
    </motion.div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────────
interface Props {
  plan: EventPlan
  onComplete: (selections: Record<string, VendorSuggestion | null>) => void
}

export default function VendorSelectionWizard({ plan, onComplete }: Props) {
  // Group vendors by category — max 3 per category
  const steps = useMemo(() => {
    const grouped: Record<string, VendorSuggestion[]> = {}
    plan.vendors.forEach((v) => {
      if (!grouped[v.category]) grouped[v.category] = []
      if (grouped[v.category].length < 3) grouped[v.category].push(v)
    })
    return Object.entries(grouped)
      .filter(([, vendors]) => vendors.length > 0)
      .map(([category, vendors]) => {
        const meta = getCategoryMeta(category)
        return { category, vendors, ...meta }
      })
  }, [plan.vendors])

  const [currentStep, setCurrentStep] = useState(0)
  // Pre-select the first (top-ranked) vendor for every step automatically
  const [selections, setSelections] = useState<Record<string, VendorSuggestion | null>>(() => {
    const initial: Record<string, VendorSuggestion | null> = {}
    // We compute steps inline here because useMemo runs after useState
    const grouped: Record<string, VendorSuggestion[]> = {}
    plan.vendors.forEach((v) => {
      if (!grouped[v.category]) grouped[v.category] = []
      if (grouped[v.category].length < 3) grouped[v.category].push(v)
    })
    Object.entries(grouped).forEach(([cat, vendors]) => {
      if (vendors.length > 0) initial[cat] = vendors[0]
    })
    return initial
  })
  const [showSummary, setShowSummary] = useState(false)
  const [direction, setDirection] = useState(1)

  // If no vendors at all, skip wizard
  if (steps.length === 0) {
    onComplete({})
    return null
  }

  const step = steps[currentStep]
  const selectedVendor = selections[step?.category ?? '']
  const hasChosen = step ? step.category in selections : false
  const isLastStep = currentStep === steps.length - 1

  function selectVendor(vendor: VendorSuggestion) {
    setSelections((prev) => {
      const current = prev[step.category]
      if (current?.name === vendor.name) {
        // Tap again = deselect
        const next = { ...prev }
        delete next[step.category]
        return next
      }
      return { ...prev, [step.category]: vendor }
    })
  }

  function goNext() {
    setDirection(1)
    if (isLastStep) {
      setShowSummary(true)
    } else {
      setCurrentStep((p) => p + 1)
    }
  }

  function goPrev() {
    if (currentStep === 0) return
    setDirection(-1)
    setCurrentStep((p) => p - 1)
  }

  function skip() {
    setDirection(1)
    const newSelections = { ...selections, [step.category]: null }
    setSelections(newSelections)
    if (isLastStep) {
      setShowSummary(true)
    } else {
      setCurrentStep((p) => p + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#09090F] overflow-y-auto">
      {/* Background radial */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/6 blur-3xl rounded-full" />
      </div>

      {/* ── Top progress bar ──────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-20 h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-rose-500 to-orange-400"
          animate={{ width: showSummary ? '100%' : `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 pb-24">

        {/* ── Fentsi logo ───────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goPrev}
            disabled={currentStep === 0 || showSummary}
            className="flex items-center gap-1.5 text-white/30 hover:text-white/60 disabled:opacity-0 transition-colors text-sm"
          >
            <ChevronLeft size={16} /> Indietro
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">f</span>
            </div>
            <span className="text-white/60 text-sm font-medium">fentsi</span>
          </div>

          <span className="text-xs text-white/25 tabular-nums">
            {showSummary ? '✓ Completato' : `${currentStep + 1} / ${steps.length}`}
          </span>
        </div>

        {/* ── Step dots ─────────────────────────────────────── */}
        {!showSummary && (
          <div className="flex items-center justify-center gap-1.5 mb-10">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  i === currentStep
                    ? 'w-8 h-2 bg-gradient-to-r from-rose-500 to-orange-400'
                    : i < currentStep
                    ? 'w-2 h-2 bg-rose-500/50'
                    : 'w-2 h-2 bg-white/10'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Content area ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {showSummary ? (
            <motion.div key="summary">
              <WizardSummary
                selections={selections}
                steps={steps}
                onConfirm={() => onComplete(selections)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Step header */}
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl mb-4"
                >
                  {step.emoji}
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Scegli il tuo {step.label}
                </h1>
                <p className="text-white/40 text-sm">{step.subtitle}</p>
              </div>

              {/* Vendor cards grid */}
              <div
                className={`grid gap-5 ${
                  step.vendors.length === 1
                    ? 'grid-cols-1 max-w-sm mx-auto'
                    : step.vendors.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {step.vendors.map((vendor, i) => (
                  <WizardVendorCard
                    key={vendor.name}
                    vendor={vendor}
                    isSelected={selectedVendor?.name === vendor.name}
                    index={i}
                    onSelect={() => selectVendor(vendor)}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-3 mt-10">
                <motion.button
                  onClick={goNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-10 py-3.5 rounded-full text-sm font-bold transition-all duration-200 bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/25 cursor-pointer"
                >
                  {isLastStep ? 'Completa selezione' : 'Continua'}
                  <ArrowRight size={16} />
                </motion.button>

                <button
                  onClick={skip}
                  className="flex items-center gap-1.5 px-5 py-2 text-white/30 hover:text-white/55 text-xs transition-colors"
                >
                  <SkipForward size={13} />
                  Salta {step.label}
                </button>
              </div>

              {!hasChosen && (
                <p className="text-center text-xs text-white/30 mt-2">
                  Tocca una card per cambiare la scelta, oppure continua con quella consigliata
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
