'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, FileText, Sparkles, Wand2 } from 'lucide-react';
import { DarkBentoCard } from '@/components/ui/DarkBentoCard';

// ── Animation variants ─────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  // Cubic-bezier satisfies Framer Motion's Easing tuple type
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
} as const;

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
} as const;

// ── Nav ────────────────────────────────────────────────────────────────────
function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const handler = () => setSolid(window.scrollY > 32);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300"
      style={{
        background: solid ? '#0b0a09' : 'transparent',
        borderBottom: `1px solid ${solid ? '#2a2520' : 'transparent'}`,
      }}
    >
      <span
        className="font-serif text-xl tracking-tight"
        style={{ color: '#f0ebe3' }}
      >
        Fentsi
      </span>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium px-4 py-2 rounded-[8px] transition-colors"
          style={{ color: '#6b6258' }}
        >
          Accedi
        </Link>
        <Link
          href="/create-event/wizard"
          className="text-sm font-semibold px-4 py-2 rounded-[8px] transition-opacity hover:opacity-80"
          style={{ background: '#c9975b', color: '#0b0a09' }}
        >
          Inizia gratis
        </Link>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20"
      style={{ background: '#0b0a09' }}
    >
      <motion.div
        className="max-w-3xl mx-auto space-y-8"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.p
          variants={fadeUp}
          className="text-xs tracking-[0.22em] uppercase"
          style={{ color: '#6b6258' }}
        >
          Pianificazione eventi · AI-powered
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-serif leading-[0.95] tracking-tight"
          style={{ fontSize: 'clamp(2.75rem, 7vw, 5rem)', color: '#f0ebe3' }}
        >
          Il tuo piano evento
          <br />
          <span style={{ color: '#c9975b' }}>perfetto in 60 secondi.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg max-w-xl mx-auto"
          style={{ color: '#6b6258', lineHeight: 1.75 }}
        >
          Descrivi il tuo evento, lascia fare all&rsquo;AI. Venue, fornitori,
          budget e timeline &mdash; tutto in un piano professionale.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/create-event/wizard"
            className="inline-flex items-center gap-2 text-base font-semibold px-8 py-4 rounded-[8px] transition-opacity hover:opacity-85"
            style={{ background: '#c9975b', color: '#0b0a09' }}
          >
            Crea il tuo piano →
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-sm"
          style={{ color: '#6b6258' }}
        >
          Già usato da{' '}
          <span style={{ color: '#f0ebe3' }}>500+ organizzatori</span> in Italia
        </motion.p>
      </motion.div>
    </section>
  );
}

// ── Come funziona ──────────────────────────────────────────────────────────
const HOW_STEPS = [
  {
    n: '01',
    Icon: Wand2,
    title: 'Raccontaci il tuo evento',
    desc: 'Tipo, data, ospiti, budget. Bastano 60 secondi di wizard guidato.',
    accent: 'gold' as const,
  },
  {
    n: '02',
    Icon: Sparkles,
    title: "L'AI analizza 1.000+ opzioni",
    desc: 'Il motore AI valuta venue, fornitori e costi per trovare la combinazione ideale.',
    accent: 'warning' as const,
  },
  {
    n: '03',
    Icon: FileText,
    title: 'Ricevi il piano completo',
    desc: 'Un documento professionale con venue, budget breakdown e timeline dettagliata.',
    accent: 'muted' as const,
  },
];

function HowItWorks() {
  return (
    <section className="px-6 py-24" style={{ background: '#0b0a09' }}>
      <div className="max-w-5xl mx-auto space-y-14">
        <motion.div
          className="text-center space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs tracking-[0.22em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Come funziona
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#f0ebe3' }}
          >
            Dal brief al piano in tre passi
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          {HOW_STEPS.map(({ n, Icon, title, desc, accent }) => (
            <motion.div key={n} variants={fadeUp} className="h-full">
              <DarkBentoCard accent={accent} className="p-6 space-y-5 h-full">
                <div className="flex items-start justify-between">
                  <span
                    className="font-serif leading-none"
                    style={{ fontSize: '3rem', color: '#2a2520' }}
                  >
                    {n}
                  </span>
                  <Icon
                    size={20}
                    style={{ color: '#c9975b' }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="space-y-2">
                  <h3
                    className="font-semibold text-base"
                    style={{ color: '#f0ebe3' }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#6b6258' }}
                  >
                    {desc}
                  </p>
                </div>
              </DarkBentoCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ── Thin section divider ───────────────────────────────────────────────────
function Divider() {
  return (
    <div
      className="mx-auto max-w-5xl px-6"
      style={{ height: 1, background: '#2a2520' }}
    />
  );
}

// ── Preview piano ──────────────────────────────────────────────────────────
const BUDGET_LINES = [
  { label: 'Venue', pct: 40, val: '€ 8.500' },
  { label: 'Catering', pct: 35, val: '€ 7.500' },
  { label: 'Fotografia', pct: 12, val: '€ 2.500' },
  { label: 'Fiori', pct: 8, val: '€ 1.700' },
  { label: 'Altro', pct: 5, val: '€ 1.050' },
];

const TIMELINE_ITEMS = [
  { time: '−8 mesi', label: 'Prenota venue' },
  { time: '−6 mesi', label: 'Conferma catering' },
  { time: '−4 mesi', label: 'Invia inviti' },
  { time: '−2 mesi', label: 'Prova abito' },
  { time: '−1 mese', label: 'Briefing fornitori' },
];

function PlanPreview() {
  return (
    <section className="px-6 py-24" style={{ background: '#0b0a09' }}>
      <div className="max-w-5xl mx-auto space-y-14">
        <motion.div
          className="text-center space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs tracking-[0.22em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Esempio di output
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#f0ebe3' }}
          >
            Il piano che ottieni
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
        >
          <DarkBentoCard accent="gold" className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <p
                  className="text-xs tracking-[0.15em] uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Piano generato da AI
                </p>
                <h3
                  className="font-serif"
                  style={{ fontSize: '1.75rem', color: '#f0ebe3' }}
                >
                  Matrimonio — Villa Borghese
                </h3>
                <p className="text-sm" style={{ color: '#6b6258' }}>
                  Milano · 14 Giugno 2026 · 120 ospiti
                </p>
              </div>
              <span
                className="text-xs font-medium px-3 py-1.5 rounded-[8px]"
                style={{
                  background: '#c9975b1a',
                  color: '#c9975b',
                  border: '1px solid #c9975b33',
                }}
              >
                Piano Pro
              </span>
            </div>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t"
              style={{ borderColor: '#2a2520' }}
            >
              {/* Venue */}
              <div className="space-y-4">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Venue consigliata
                </p>
                <div className="space-y-1.5">
                  <p className="font-semibold" style={{ color: '#f0ebe3' }}>
                    Villa Borghese Estate
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#6b6258' }}
                  >
                    Capienza 150 · Parcheggio incluso · Catering in-house
                    disponibile
                  </p>
                </div>
                <p
                  className="font-serif"
                  style={{ fontSize: '1.75rem', color: '#c9975b' }}
                >
                  € 8.500
                </p>
              </div>

              {/* Budget */}
              <div className="space-y-4">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Budget breakdown
                </p>
                <div className="space-y-3">
                  {BUDGET_LINES.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#6b6258' }}>{item.label}</span>
                        <span style={{ color: '#f0ebe3' }}>{item.val}</span>
                      </div>
                      <div
                        className="w-full rounded-full overflow-hidden"
                        style={{ height: 2, background: '#2a2520' }}
                      >
                        <div
                          style={{
                            width: `${item.pct}%`,
                            height: '100%',
                            background: '#c9975b',
                            borderRadius: 9999,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Timeline
                </p>
                <div className="space-y-3">
                  {TIMELINE_ITEMS.map((item) => (
                    <div key={item.time} className="flex items-center gap-3">
                      <span
                        className="text-xs tabular-nums w-16 shrink-0"
                        style={{ color: '#6b6258' }}
                      >
                        {item.time}
                      </span>
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: '#c9975b' }}
                      />
                      <span className="text-sm" style={{ color: '#f0ebe3' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DarkBentoCard>
        </motion.div>
      </div>
    </section>
  );
}

// ── Pricing ────────────────────────────────────────────────────────────────
const FREE_FEATURES = [
  '1 piano evento',
  'Wizard guidato (10 step)',
  'Suggerimenti venue AI',
  'Budget breakdown base',
];

const PRO_FEATURES = [
  'Piani illimitati',
  'Esportazione PDF',
  'Fornitori verificati',
  'Timeline dettagliata',
  'Supporto prioritario',
  'Aggiornamenti AI in tempo reale',
];

function Pricing() {
  return (
    <section className="px-6 py-24" style={{ background: '#0b0a09' }}>
      <div className="max-w-3xl mx-auto space-y-14">
        <motion.div
          className="text-center space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          <motion.p
            variants={fadeUp}
            className="text-xs tracking-[0.22em] uppercase"
            style={{ color: '#6b6258' }}
          >
            Prezzi
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-serif"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#f0ebe3' }}
          >
            Inizia gratis, cresci con Pro
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={staggerContainer}
        >
          {/* Free */}
          <motion.div variants={fadeUp} className="h-full">
            <DarkBentoCard
              accent="muted"
              className="p-6 space-y-6 h-full flex flex-col"
            >
              <div className="space-y-1">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#6b6258' }}
                >
                  Free
                </p>
                <p
                  className="font-serif leading-none"
                  style={{ fontSize: '2.75rem', color: '#f0ebe3' }}
                >
                  € 0
                </p>
                <p className="text-sm" style={{ color: '#6b6258' }}>
                  per sempre
                </p>
              </div>
              <ul className="space-y-3 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: '#6b6258' }}
                  >
                    <Check
                      size={13}
                      style={{ color: '#c9975b', flexShrink: 0 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/create-event/wizard"
                className="block text-center text-sm font-medium py-3 rounded-[8px] transition-colors hover:border-[#3d342b]"
                style={{ border: '1px solid #2a2520', color: '#f0ebe3' }}
              >
                Inizia gratis
              </Link>
            </DarkBentoCard>
          </motion.div>

          {/* Pro */}
          <motion.div variants={fadeUp} className="h-full">
            <DarkBentoCard
              accent="gold"
              className="p-6 space-y-6 h-full flex flex-col"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p
                    className="text-xs tracking-widest uppercase"
                    style={{ color: '#6b6258' }}
                  >
                    Pro
                  </p>
                  <span
                    className="text-xs px-2 py-0.5 rounded-[8px]"
                    style={{
                      background: '#c9975b1a',
                      color: '#c9975b',
                      border: '1px solid #c9975b33',
                    }}
                  >
                    Popolare
                  </span>
                </div>
                <p
                  className="font-serif leading-none"
                  style={{ fontSize: '2.75rem', color: '#f0ebe3' }}
                >
                  € 19
                </p>
                <p className="text-sm" style={{ color: '#6b6258' }}>
                  al mese
                </p>
              </div>
              <ul className="space-y-3 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm"
                    style={{ color: '#f0ebe3' }}
                  >
                    <Check
                      size={13}
                      style={{ color: '#c9975b', flexShrink: 0 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/create-event/wizard"
                className="block text-center text-sm font-semibold py-3 rounded-[8px] transition-opacity hover:opacity-85"
                style={{ background: '#c9975b', color: '#0b0a09' }}
              >
                Prova Pro gratis 14 giorni
              </Link>
            </DarkBentoCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ── CTA finale ─────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section
      className="px-6 py-28 text-center"
      style={{ background: '#0b0a09' }}
    >
      <motion.div
        className="max-w-2xl mx-auto space-y-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        variants={staggerContainer}
      >
        <motion.h2
          variants={fadeUp}
          className="font-serif"
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            color: '#f0ebe3',
            lineHeight: 1.0,
          }}
        >
          Inizia adesso,
          <br />
          <span style={{ color: '#c9975b' }}>è gratis.</span>
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-base"
          style={{ color: '#6b6258' }}
        >
          Il tuo piano evento professionale è a 60 secondi di distanza.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link
            href="/create-event/wizard"
            className="inline-flex items-center gap-2 text-base font-semibold px-10 py-4 rounded-[8px] transition-opacity hover:opacity-85"
            style={{ background: '#c9975b', color: '#0b0a09' }}
          >
            Crea il tuo piano →
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer
      className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t text-sm"
      style={{ borderColor: '#2a2520', color: '#6b6258' }}
    >
      <span className="font-serif text-base" style={{ color: '#f0ebe3' }}>
        Fentsi
      </span>
      <div className="flex items-center gap-6">
        <Link
          href="/privacy"
          className="transition-colors hover:text-[#f0ebe3]"
          style={{ color: '#6b6258' }}
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          className="transition-colors hover:text-[#f0ebe3]"
          style={{ color: '#6b6258' }}
        >
          Terms
        </Link>
      </div>
      <span>© 2026 Fentsi. Tutti i diritti riservati.</span>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  return (
    <div style={{ background: '#0b0a09' }}>
      <Nav />
      <Hero />
      <Divider />
      <HowItWorks />
      <Divider />
      <PlanPreview />
      <Divider />
      <Pricing />
      <Divider />
      <FinalCTA />
      <Footer />
    </div>
  );
}
