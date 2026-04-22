'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ShoppingBag, Sparkles } from 'lucide-react'
import { VendorSuggestion } from '@/types/event'
import { formatCurrency } from '@/lib/utils'

interface FloatingActionBarProps {
  selectedVendors: VendorSuggestion[]
  onRequestQuotes: () => void
  onClear: () => void
}

export function FloatingActionBar({
  selectedVendors,
  onRequestQuotes,
  onClear,
}: FloatingActionBarProps) {
  const count = selectedVendors.length
  const total = selectedVendors.reduce((sum, v) => sum + (v.budgetAllocation ?? 0), 0)

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          {/* Fade-out gradient above bar */}
          <div className="h-10 bg-gradient-to-t from-[#09090F] to-transparent pointer-events-none" />

          <div className="bg-[#09090F]/98 backdrop-blur-2xl border-t border-white/8 px-4 py-3">
            <div className="max-w-3xl mx-auto flex items-center gap-4">

              {/* Left: bag icon + summary */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                    <ShoppingBag size={17} className="text-rose-400" />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-500/40"
                  >
                    {count}
                  </motion.span>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">
                    {total > 0 ? (
                      <>
                        <span className="gradient-text">{formatCurrency(total)}</span>
                        {' '}stimati
                      </>
                    ) : (
                      `${count} servizi selezionati`
                    )}
                  </p>
                  <p className="text-[11px] text-white/35 truncate mt-0.5">
                    {selectedVendors.map((v) => v.category.replace(/_/g, ' ')).join(' · ')}
                  </p>
                </div>
              </div>

              {/* Right: clear + CTA */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onClear}
                  className="text-xs text-white/30 hover:text-white/55 transition-colors px-2.5 py-2 rounded-lg hover:bg-white/5"
                >
                  Rimuovi
                </button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onRequestQuotes}
                  className="
                    flex items-center gap-2 px-5 py-2.5 rounded-xl
                    bg-gradient-to-r from-rose-500 to-orange-400
                    text-white font-semibold text-sm
                    shadow-lg shadow-rose-500/30
                    hover:shadow-rose-500/45 hover:opacity-95
                    transition-all
                  "
                >
                  <Sparkles size={14} />
                  Richiedi tutti i preventivi
                  <ChevronRight size={15} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
