'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  children?: React.ReactNode
  variant?: 'primary' | 'ghost'
  fullWidth?: boolean
}

export default function StepButton({
  onClick,
  disabled,
  loading,
  children = 'Continue',
  variant = 'primary',
  fullWidth = true,
}: StepButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center justify-center gap-2 py-4 px-8 rounded-2xl font-semibold text-base transition-all',
        fullWidth && 'w-full',
        variant === 'primary' && [
          'bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/20',
          disabled || loading ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-rose-500/30',
        ],
        variant === 'ghost' && [
          'glass text-white/70 hover:text-white',
          disabled ? 'opacity-40 cursor-not-allowed' : '',
        ]
      )}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Creating your plan...
        </>
      ) : (
        <>
          {children}
          <ArrowRight size={18} />
        </>
      )}
    </motion.button>
  )
}
