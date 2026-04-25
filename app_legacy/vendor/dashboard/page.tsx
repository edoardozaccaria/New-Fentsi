'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, CheckCircle2, ExternalLink } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

export default function VendorDashboardPage() {
  const [vendorName, setVendorName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVendor() {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('vendors')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .select('name' as any)
        .eq('owner_user_id' as any, user.id)
        .single()

      if (data) setVendorName((data as { name: string }).name)
    }
    fetchVendor()
  }, [])

  return (
    <div className="min-h-screen bg-[#09090F] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-xl shadow-rose-500/30">
            <Sparkles size={26} className="text-white" />
          </div>
        </div>

        {/* Success badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">Profile published</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome{vendorName ? `, ${vendorName}` : ''}! 🎉
        </h1>
        <p className="text-white/50 mb-8 text-sm leading-relaxed">
          Your vendor profile is live on Fentsi. Couples looking for your services
          will now be able to discover and contact you.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold text-base shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-shadow"
          >
            <ExternalLink size={18} />
            Explore Fentsi
          </Link>
          <Link
            href="/vendor-onboarding"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/20 font-semibold text-base transition-colors"
          >
            Edit my profile
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
