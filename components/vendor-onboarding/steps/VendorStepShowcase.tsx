'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Upload, X, Euro, MapPin, FileText, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVendorOnboardingStore } from '@/lib/vendor-onboarding-store'
import { getSupabase } from '@/lib/supabase'

const MAX_BIO_CHARS = 300
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileExtension(file: File): string {
  const parts = file.name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VendorStepShowcase() {
  const { data, updateData, setSubmitting, isSubmitting, reset } =
    useVendorOnboardingStore()
  const router = useRouter()

  // The File object lives in component state — File cannot be serialised to localStorage
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Image selection ────────────────────────────────────────────────────────

  const applyFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Only JPEG, PNG, or WebP images are accepted.')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be smaller than 10 MB.')
        return
      }
      setCoverFile(file)
      updateData({ coverImagePreview: URL.createObjectURL(file) })
    },
    [updateData]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) applyFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) applyFile(file)
  }

  const removeImage = () => {
    setCoverFile(null)
    updateData({ coverImagePreview: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Submit orchestration ───────────────────────────────────────────────────

  const handleSubmit = async () => {
    const supabase = getSupabase()

    // ── 1. Verify authentication ─────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in to publish your profile.')
      router.push('/login?next=/vendor-onboarding')
      return
    }

    setSubmitting(true)

    try {
      // ── 2. Upload cover image ──────────────────────────────────────────────
      let coverImageUrl: string | null = null

      if (coverFile) {
        const ext = fileExtension(coverFile)
        const path = `${user.id}/cover-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('vendor_portfolios')
          .upload(path, coverFile, { upsert: true })

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from('vendor_portfolios')
          .getPublicUrl(path)

        coverImageUrl = publicUrlData.publicUrl
      }

      // ── 3. Insert vendor record ────────────────────────────────────────────
      // We cast to `any` here because the local Database type doesn't yet
      // include the new columns added in migration 003. The columns exist at
      // runtime after the migration has been applied.
      const vendorPayload = {
        name:            data.businessName.trim(),
        category:        data.categories[0] ?? 'other', // primary category
        city:            data.locationCity.trim() || null,
        phone:           data.businessPhone.trim() || null,
        email:           data.businessEmail.trim() || null,
        website:         data.website.trim() || null,
        instagram:       data.instagram.trim() || null,
        bio:             data.bio.trim() || null,
        base_price:      data.basePrice ?? null,
        cover_image_url: coverImageUrl,
        owner_user_id:   user.id,
        is_partner:      false,
        is_active:       true,
        country:         'IT',
      }

      const { data: insertedVendor, error: vendorError } = await supabase
        .from('vendors')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(vendorPayload as any)
        .select('id')
        .single()

      if (vendorError || !insertedVendor) {
        // If image was uploaded but vendor insert failed, clean up the orphan file
        if (coverImageUrl) {
          const pathToDelete = coverImageUrl.split('/vendor_portfolios/')[1]
          if (pathToDelete) {
            await supabase.storage.from('vendor_portfolios').remove([pathToDelete])
          }
        }
        throw new Error(vendorError?.message ?? 'Failed to create vendor record.')
      }

      const vendorId: string = insertedVendor.id

      // ── 4. Insert category rows ────────────────────────────────────────────
      if (data.categories.length > 0) {
        const categoryRows = data.categories.map((category) => ({
          vendor_id: vendorId,
          category,
        }))

        const { error: catError } = await supabase
          .from('vendor_categories')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(categoryRows as any)

        if (catError) {
          // Non-fatal: log but don't block the vendor from proceeding
          console.error('[VendorOnboarding] Category insert error:', catError.message)
        }
      }

      // ── 5. Update profile role to 'vendor' ────────────────────────────────
      await supabase
        .from('profiles')
        .update({ role: 'vendor' })
        .eq('id', user.id)

      // ── 6. Success ────────────────────────────────────────────────────────
      toast.success('Your vendor profile is live!')
      reset()
      router.push('/vendor/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived state for the submit button ────────────────────────────────────

  const canSubmit =
    !isSubmitting &&
    data.locationCity.trim().length > 0 &&
    data.bio.trim().length > 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Cover image upload ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <AnimatePresence mode="wait">
          {data.coverImagePreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative rounded-2xl overflow-hidden aspect-video"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.coverImagePreview}
                alt="Cover preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removeImage}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
              <div className="absolute bottom-3 left-3 text-xs text-white/60 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                Cover image
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer aspect-video transition-all ${
                isDragging
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging ? 'bg-rose-500/20' : 'bg-white/5'
              }`}>
                <Upload size={22} className={isDragging ? 'text-rose-400' : 'text-white/40'} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/70">
                  {isDragging ? 'Drop to upload' : 'Upload cover image'}
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  JPEG, PNG or WebP · max 10 MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </motion.div>

      {/* Base price ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="relative">
          <Euro size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="number"
            min={0}
            step={50}
            value={data.basePrice ?? ''}
            onChange={(e) =>
              updateData({
                basePrice: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            placeholder="Starting price (e.g. 1500)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>
        <p className="text-xs text-white/25 mt-1.5 ml-2">
          The minimum price you charge. Displayed as "from €{data.basePrice ?? '—'}".
        </p>
      </motion.div>

      {/* City ────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
      >
        <div className="relative">
          <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={data.locationCity}
            onChange={(e) => updateData({ locationCity: e.target.value })}
            placeholder="City / operating area (e.g. Rome)"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
          />
        </div>
      </motion.div>

      {/* Bio ─────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <div className="relative">
          <FileText
            size={16}
            className="absolute left-4 top-4 text-white/30"
          />
          <textarea
            value={data.bio}
            onChange={(e) => {
              if (e.target.value.length <= MAX_BIO_CHARS) {
                updateData({ bio: e.target.value })
              }
            }}
            placeholder="Describe your services, style, and what makes you unique…"
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors resize-none"
          />
          <div className="absolute bottom-3 right-4 text-xs text-white/25 tabular-nums">
            {data.bio.length}/{MAX_BIO_CHARS}
          </div>
        </div>
      </motion.div>

      {/* Submit button ───────────────────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        whileHover={{ scale: canSubmit ? 1.02 : 1 }}
        whileTap={{ scale: canSubmit ? 0.97 : 1 }}
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full flex items-center justify-center gap-2 py-4 px-8 rounded-2xl font-semibold text-base transition-all ${
          canSubmit
            ? 'bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30'
            : 'bg-gradient-to-r from-rose-500 to-orange-400 text-white opacity-40 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Publishing your profile…
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            Publish my profile
            <ArrowRight size={18} />
          </>
        )}
      </motion.button>

      {/* Helper copy */}
      {!canSubmit && !isSubmitting && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-white/25"
        >
          Add a city and a bio to publish
        </motion.p>
      )}
    </div>
  )
}
