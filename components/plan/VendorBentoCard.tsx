'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Star, CheckCircle2, Plus, Clock, Send, BadgeCheck } from 'lucide-react'
import { VendorSuggestion } from '@/types/event'
import { formatCurrency } from '@/lib/utils'

// ── Status types & config ─────────────────────────────────────────────────────
export type VendorStatus = 'pending' | 'quote_requested' | 'confirmed'

const STATUS_CONFIG: Record<
  VendorStatus,
  { label: string; pill: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Da confermare',
    pill: 'bg-white/10 text-white/60 border-white/12',
    icon: Clock,
  },
  quote_requested: {
    label: 'Preventivo richiesto',
    pill: 'bg-amber-500/20 text-amber-400 border-amber-500/20',
    icon: Send,
  },
  confirmed: {
    label: 'Confermato ✓',
    pill: 'bg-green-500/20 text-green-400 border-green-500/25',
    icon: BadgeCheck,
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface VendorBentoCardProps {
  vendor: VendorSuggestion
  emoji: string
  index: number
  selected: boolean
  status: VendorStatus
  onToggle: (v: VendorSuggestion) => void
  /** Makes the card span 2 columns — used for the first/featured card */
  large?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────
export function VendorBentoCard({
  vendor,
  emoji,
  index,
  selected,
  status,
  onToggle,
  large = false,
}: VendorBentoCardProps) {
  const hasPhoto  = !!vendor.photoUrl
  const cfg       = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.55,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ scale: 1.018, transition: { duration: 0.2 } }}
      onClick={() => onToggle(vendor)}
      className={[
        'relative rounded-2xl overflow-hidden cursor-pointer group',
        'border transition-colors duration-300',
        large ? 'min-h-[260px] md:min-h-[300px]' : 'min-h-[180px] md:min-h-[200px]',
        selected
          ? 'border-rose-500/55 shadow-[0_0_36px_rgba(244,63,94,0.18)]'
          : 'border-white/8 hover:border-white/18',
      ].join(' ')}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      {hasPhoto ? (
        <>
          <Image
            src={vendor.photoUrl!}
            alt={vendor.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
          {/* Gradient veil: strong at bottom for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/35 to-black/5" />
          {/* Selected tint */}
          {selected && (
            <div className="absolute inset-0 bg-rose-500/10 transition-opacity" />
          )}
        </>
      ) : (
        /* No-photo fallback: branded gradient card */
        <div className="absolute inset-0 bg-[#111118]">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-orange-500/5" />
          {/* Large faint emoji as texture */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 select-none pointer-events-none">
            <span className="text-[9rem] leading-none">{emoji}</span>
          </div>
          {selected && <div className="absolute inset-0 bg-rose-500/8" />}
        </div>
      )}

      {/* ── Content overlay ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">

        {/* Top row: emoji + status badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl drop-shadow-lg">{emoji}</span>

          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-sm ${cfg.pill}`}
            >
              <StatusIcon size={9} />
              {cfg.label}
            </motion.div>
          )}
        </div>

        {/* Bottom: name + rating + price */}
        <div>
          {/* Rating */}
          {vendor.rating > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <Star size={10} fill="#fbbf24" className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{vendor.rating}</span>
              {vendor.reviewCount && (
                <span className="text-[10px] text-white/35">({vendor.reviewCount})</span>
              )}
            </div>
          )}

          {/* Vendor name */}
          <h3
            className={`font-bold text-white leading-tight mb-1.5 drop-shadow-sm ${
              large ? 'text-xl md:text-2xl' : 'text-base'
            }`}
          >
            {vendor.name}
          </h3>

          {/* Category + price row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/45 capitalize font-medium">
              {vendor.category.replace(/_/g, ' ')}
            </span>

            {vendor.budgetAllocation ? (
              <span className="text-sm font-bold text-rose-400 drop-shadow">
                {formatCurrency(vendor.budgetAllocation)}
              </span>
            ) : vendor.priceRange ? (
              <span className="text-xs font-semibold text-white/65">{vendor.priceRange}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Selection checkmark ─────────────────────────────────────────── */}
      {selected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/40"
        >
          <CheckCircle2 size={15} className="text-white" />
        </motion.div>
      )}

      {/* ── Hover "add" pill (visible only when not selected) ───────────── */}
      {!selected && (
        <div className="absolute inset-x-4 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold shadow">
            <Plus size={11} />
            Aggiungi al piano
          </div>
        </div>
      )}
    </motion.div>
  )
}
