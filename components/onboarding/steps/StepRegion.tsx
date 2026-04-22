'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store'
import { MapPin, Globe, Loader2, CheckCircle2 } from 'lucide-react'
import StepButton from '@/components/ui/StepButton'

// ── Nominatim (OpenStreetMap) types ───────────────────────────────────────────
interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    region?: string
    country?: string
  }
}

interface Prediction {
  place_id: number
  mainText: string
  secondaryText: string
  lat: number
  lng: number
}

// ── Free Nominatim geocoding (no API key needed) ──────────────────────────────
async function searchNominatim(query: string): Promise<Prediction[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '6',
      addressdetails: '1',
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return []
    const data: NominatimResult[] = await res.json()

    return data.map((item) => {
      const city =
        item.address.city ||
        item.address.town ||
        item.address.village ||
        item.address.municipality ||
        item.display_name.split(',')[0]
      const secondary = [item.address.state || item.address.region, item.address.country]
        .filter(Boolean)
        .join(', ')
      return {
        place_id:      item.place_id,
        mainText:      city,
        secondaryText: secondary,
        lat:           parseFloat(item.lat),
        lng:           parseFloat(item.lon),
      }
    })
  } catch {
    return []
  }
}

// ── Popular destinations (hardcoded lat/lng → instant, no API call) ───────────
const POPULAR_DESTINATIONS = [
  { label: 'Florence, Italy',     emoji: '🌿', desc: 'Hills & vineyards',   lat: 43.7696,  lng: 11.2558  },
  { label: 'Amalfi Coast, Italy', emoji: '⛵', desc: 'Sea & cliffs',         lat: 40.6340,  lng: 14.6026  },
  { label: 'Santorini, Greece',   emoji: '🏛️', desc: 'Iconic white views',  lat: 36.3932,  lng: 25.4615  },
  { label: 'Paris, France',       emoji: '🗼', desc: 'City of light',        lat: 48.8566,  lng: 2.3522   },
  { label: 'Lake Como, Italy',    emoji: '🏔️', desc: 'Alpine elegance',     lat: 45.9764,  lng: 9.2708   },
  { label: 'Barcelona, Spain',    emoji: '🎨', desc: 'Art & architecture',   lat: 41.3851,  lng: 2.1734   },
  { label: 'Tuscany, Italy',      emoji: '🍷', desc: 'Countryside romance',  lat: 43.7711,  lng: 11.2486  },
  { label: 'Rome, Italy',         emoji: '🏟️', desc: 'Eternal city',        lat: 41.9028,  lng: 12.4964  },
  { label: 'Bali, Indonesia',     emoji: '🌺', desc: 'Tropical paradise',    lat: -8.4095,  lng: 115.1889 },
  { label: 'Dubai, UAE',          emoji: '✨', desc: 'Luxury & skyline',      lat: 25.2048,  lng: 55.2708  },
]

export default function StepRegion() {
  const { data, updateData, nextStep } = useOnboardingStore()
  const [inputValue, setInputValue]   = useState(data.region || '')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading]         = useState(false)
  const [confirmed, setConfirmed]     = useState(!!data.region)
  const timer = useRef<NodeJS.Timeout>()

  const search = useCallback(async (query: string) => {
    setLoading(true)
    const results = await searchNominatim(query)
    setPredictions(results)
    setLoading(false)
  }, [])

  const handleInput = (val: string) => {
    setInputValue(val)
    setConfirmed(false)
    updateData({ region: val.trim() || null, locationLat: null, locationLng: null, locationPlaceId: null })
    clearTimeout(timer.current)
    if (val.length > 2) timer.current = setTimeout(() => search(val), 400)
    else setPredictions([])
  }

  const selectPrediction = (pred: Prediction) => {
    const label = pred.secondaryText
      ? `${pred.mainText}, ${pred.secondaryText}`
      : pred.mainText
    updateData({
      region:          label,
      locationLat:     pred.lat,
      locationLng:     pred.lng,
      locationPlaceId: String(pred.place_id),
    })
    setInputValue(label)
    setPredictions([])
    setConfirmed(true)
  }

  const handlePopular = (d: typeof POPULAR_DESTINATIONS[number]) => {
    setInputValue(d.label)
    setPredictions([])
    setConfirmed(true)
    updateData({ region: d.label, locationLat: d.lat, locationLng: d.lng, locationPlaceId: null })
    setTimeout(() => nextStep(), 320)
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        {loading
          ? <Loader2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" />
          : confirmed
            ? <CheckCircle2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400" />
            : <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        }
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Type any city, region, or country…"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 pl-11 text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 transition-colors"
          autoComplete="off"
        />

        {/* Predictions dropdown */}
        <AnimatePresence>
          {predictions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A2E] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
            >
              {predictions.map((pred) => (
                <button
                  key={pred.place_id}
                  onClick={() => selectPrediction(pred)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <MapPin size={14} className="text-rose-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-white">{pred.mainText}</div>
                    <div className="text-xs text-white/40">{pred.secondaryText}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Coordinates confirmed badge */}
      <AnimatePresence>
        {data.locationLat && data.locationLng && (
          <motion.p
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-green-400/70 px-1"
          >
            <CheckCircle2 size={11} />
            Location confirmed · real vendors will be searched near this area
          </motion.p>
        )}
      </AnimatePresence>

      {/* Popular destinations */}
      <div className="flex items-center gap-2 text-xs text-white/30 mt-2 mb-1">
        <MapPin size={11} /><span>Popular destinations</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {POPULAR_DESTINATIONS.map((d, i) => {
          const sel = data.region === d.label
          return (
            <motion.button
              key={d.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => handlePopular(d)}
              className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all border-2 ${
                sel ? 'border-rose-500 bg-rose-500/10' : 'border-white/8 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <span className="text-lg">{d.emoji}</span>
              <div className="min-w-0">
                <div className={`font-semibold text-xs truncate ${sel ? 'text-white' : 'text-white/80'}`}>{d.label}</div>
                <div className="text-xs text-white/40">{d.desc}</div>
              </div>
              {sel && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="ml-auto w-5 h-5 rounded-full bg-rose-500 flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="none" className="w-full h-full p-1">
                    <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      <StepButton onClick={nextStep} disabled={!data.region} />
    </div>
  )
}
