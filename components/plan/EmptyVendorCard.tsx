'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

const SERVICE_LABELS: Record<string, string> = {
  catering:        'Catering',
  photography:     'Fotografo',
  video:           'Videomaker',
  dj_music:        'DJ / Musica',
  music:           'DJ / Musica',
  flowers_decor:   'Fiori & Décor',
  wedding_cake:    'Wedding Cake',
  wedding_planner: 'Wedding Planner',
  transport:       'Trasporto',
  entertainment:   'Intrattenimento',
  lighting:        'Illuminazione',
  venue:           'Location',
}

interface EmptyVendorCardProps {
  category: string
  emoji: string
  index: number
  onAdd?: () => void
}

export function EmptyVendorCard({ category, emoji, index, onAdd }: EmptyVendorCardProps) {
  const label = SERVICE_LABELS[category] ?? category.replace(/_/g, ' ')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 0.55, scale: 1 }}
      whileHover={{ opacity: 1, scale: 1.018, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.06 + 0.25, duration: 0.45 }}
      onClick={onAdd}
      className="
        relative rounded-2xl overflow-hidden cursor-pointer group
        border border-dashed border-white/14 hover:border-rose-500/35
        min-h-[180px] md:min-h-[200px]
        transition-colors duration-300
      "
    >
      {/* Subtle mesh background */}
      <div className="absolute inset-0 bg-[#111118]" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.025] to-transparent" />

      {/* Large faint emoji */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] select-none pointer-events-none group-hover:opacity-[0.07] transition-opacity">
        <span className="text-[8rem] leading-none grayscale">{emoji}</span>
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 gap-3.5 text-center">
        <span className="text-3xl grayscale group-hover:grayscale-0 transition-all duration-300 drop-shadow">
          {emoji}
        </span>

        <div>
          <p className="text-sm font-semibold text-white/60 group-hover:text-white/85 transition-colors">
            Manca il {label}?
          </p>
          <p className="text-xs text-white/28 mt-1 group-hover:text-white/45 transition-colors">
            Aggiungi un fornitore al piano
          </p>
        </div>

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="
            w-9 h-9 rounded-full border border-white/18 flex items-center justify-center
            group-hover:border-rose-500/50 group-hover:bg-rose-500/12
            transition-all duration-200
          "
        >
          <Plus size={15} className="text-white/40 group-hover:text-rose-400 transition-colors" />
        </motion.div>
      </div>
    </motion.div>
  )
}
