'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Star } from 'lucide-react'

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    nav: { how: 'How it works', pricing: 'Pricing', cta: 'Get started' },
    badge: 'AI-Powered Event Planning',
    h1a: 'Your perfect event.',
    h1b: '10 questions away.',
    sub: 'No more chaotic spreadsheets, endless vendor calls, or WhatsApp estimates. Fentsi builds your complete event plan — venue, budget, vendors, timeline — powered by AI. In minutes, not months.',
    cta1: 'Start for free',
    cta2: 'How it works',
    trust: ['100% free to start', 'Complete plan in under 10 min', 'No credit card required'],
    stats: [
      { value: '< 10 min', label: 'To a complete plan' },
      { value: 'Free', label: 'First plan' },
      { value: '98%', label: 'Client satisfaction' },
      { value: '500+', label: 'Partner vendors' },
    ],
    howLabel: 'The process',
    howTitle: 'Simpler than you think.',
    howSub: 'Three steps. Zero stress.',
    steps: [
      { n: '01', title: 'Answer 10 questions', desc: 'Event type, date, guests, budget, style, priorities. Ten focused questions — designed so that nothing important gets missed.' },
      { n: '02', title: 'AI builds your plan', desc: 'Fentsi\'s AI processes your inputs and generates a complete, structured event plan in under 60 seconds. Every detail considered.' },
      { n: '03', title: 'Receive everything', desc: 'Optimized budget breakdown, curated local vendors, detailed timeline. Ready to execute from day one.' },
    ],
    featLabel: 'What you get',
    featTitle: 'Everything in one plan.',
    featSub: 'Not a chatbot. Not a generic template. A real, actionable event plan built around your specific needs.',
    features: [
      { title: 'Smart budget allocation', desc: 'AI distributes your budget across catering, photography, venue, décor, and more — optimized for your priorities.' },
      { title: 'Local vendor matching', desc: 'Real vendors near your location, filtered by style, budget, and availability. No more cold-calling strangers.' },
      { title: 'Detailed timeline', desc: 'A month-by-month planning timeline so nothing falls through the cracks. From booking vendors to the day-of schedule.' },
      { title: 'Style-first approach', desc: 'Rustic, luxury, bohemian, modern — every recommendation adapts to your aesthetic vision from the first question.' },
      { title: 'For professionals too', desc: 'Wedding planners, agencies, and venues use Fentsi to save hours per client and deliver better proposals, faster.' },
      { title: 'Built to feel premium', desc: 'An interface that feels like Apple — clean, fast, and intentional. Because planning your event should feel as good as the event itself.' },
    ],
    testimonialLabel: 'What people say',
    testimonialTitle: 'Trusted by planners and couples.',
    testimonials: [
      { name: 'Sofia & Marco', role: 'Newlyweds, Milan', text: 'We were overwhelmed with planning. Fentsi gave us a complete plan in 10 minutes. Our wedding was exactly what we imagined.', stars: 5 },
      { name: 'Valentina Rossi', role: 'Wedding Planner, Rome', text: 'I use Fentsi for every client. It saves me hours of work and the AI estimates are surprisingly accurate. My clients love the output.', stars: 5 },
      { name: 'Villa Belvedere', role: 'Event Venue, Tuscany', text: 'Since we started using Fentsi for our guests, bookings are up 40%. It sets the right expectations before they even call us.', stars: 5 },
    ],
    pricingLabel: 'Pricing',
    pricingTitle: 'Simple. Transparent.',
    pricingSub: 'Start for free. Upgrade when you need more.',
    plans: [
      {
        name: 'Free', price: '0', period: 'forever',
        desc: 'Everything you need for your first event.',
        features: ['1 complete AI plan', 'Real local vendors', '3 options per category', 'Budget & style filter', 'PDF export'],
        cta: 'Start for free', highlighted: false,
      },
      {
        name: 'Pro', price: '29', period: 'month',
        desc: 'For couples and planners who plan often.',
        features: ['Up to 30 plans/month', 'Premium vendor filtering', 'Unlimited quote requests', 'PDF export', 'Priority email support'],
        cta: 'Start Pro', highlighted: true,
      },
      {
        name: 'Agency', price: '249', period: 'month',
        desc: 'For wedding planners and agencies.',
        features: ['200 plans/month', '10 team seats', 'White-label (custom domain)', 'API access', 'Advanced analytics', 'Dedicated account manager'],
        cta: 'Contact us', highlighted: false,
      },
    ],
    mostPopular: 'Most popular',
    ctaTitle: 'The best event you\'ve ever planned',
    ctaSub: 'starts with 10 questions.',
    ctaBtn: 'Start for free',
    footerRights: '© 2025 Fentsi. All rights reserved.',
    footerLinks: ['Privacy Policy', 'Terms of Service', 'Contact'],
    cardStep: 'Step 3 of 10',
    cardQ: 'What\'s your event style?',
    cardOpts: ['🌿 Rustic & Natural', '✨ Elegant & Luxury', '🎨 Modern & Creative', '🌊 Bohemian & Free'],
  },
  it: {
    nav: { how: 'Come funziona', pricing: 'Prezzi', cta: 'Inizia' },
    badge: 'Pianificazione eventi con AI',
    h1a: 'Il tuo evento perfetto.',
    h1b: 'In 10 domande.',
    sub: 'Stop ai preventivi su WhatsApp, agli Excel infiniti e alle telefonate confuse. Fentsi costruisce il tuo piano evento completo — location, budget, fornitori, timeline — con l\'AI. In minuti, non mesi.',
    cta1: 'Inizia gratis',
    cta2: 'Come funziona',
    trust: ['100% gratuito per iniziare', 'Piano completo in meno di 10 min', 'Nessuna carta di credito richiesta'],
    stats: [
      { value: '< 10 min', label: 'Per un piano completo' },
      { value: 'Gratis', label: 'Primo piano' },
      { value: '98%', label: 'Clienti soddisfatti' },
      { value: '500+', label: 'Fornitori partner' },
    ],
    howLabel: 'Il processo',
    howTitle: 'Più semplice di quanto pensi.',
    howSub: 'Tre passi. Zero stress.',
    steps: [
      { n: '01', title: 'Rispondi a 10 domande', desc: 'Tipo di evento, data, ospiti, budget, stile, priorità. Dieci domande mirate — progettate perché niente di importante venga tralasciato.' },
      { n: '02', title: 'L\'AI costruisce il tuo piano', desc: 'Fentsi elabora i tuoi input e genera un piano evento completo e strutturato in meno di 60 secondi. Ogni dettaglio considerato.' },
      { n: '03', title: 'Ricevi tutto', desc: 'Ripartizione del budget ottimizzata, fornitori locali selezionati, timeline dettagliata. Pronto per partire dal primo giorno.' },
    ],
    featLabel: 'Cosa ottieni',
    featTitle: 'Tutto in un solo piano.',
    featSub: 'Non un chatbot. Non un template generico. Un piano evento reale e pratico costruito attorno alle tue esigenze specifiche.',
    features: [
      { title: 'Budget intelligente', desc: 'L\'AI distribuisce il budget tra catering, fotografia, location, decorazioni e altro — ottimizzato per le tue priorità.' },
      { title: 'Fornitori locali', desc: 'Fornitori reali vicino alla tua location, filtrati per stile, budget e disponibilità. Niente più chiamate a freddo.' },
      { title: 'Timeline dettagliata', desc: 'Una timeline mese per mese così niente sfugge. Dalla prenotazione dei fornitori al programma del giorno.' },
      { title: 'Prima lo stile', desc: 'Rustico, lusso, boho, moderno — ogni suggerimento si adatta alla tua visione estetica dalla prima domanda.' },
      { title: 'Anche per professionisti', desc: 'Wedding planner, agenzie e location usano Fentsi per risparmiare ore per cliente e offrire proposte migliori, più velocemente.' },
      { title: 'Progettato per essere premium', desc: 'Un\'interfaccia che ricorda Apple — pulita, veloce, essenziale. Perché pianificare il tuo evento deve essere bello quanto l\'evento stesso.' },
    ],
    testimonialLabel: 'Cosa dicono',
    testimonialTitle: 'Amato da planner e coppie.',
    testimonials: [
      { name: 'Sofia & Marco', role: 'Sposi, Milano', text: 'Eravamo sopraffatti dalla pianificazione. Fentsi ci ha dato un piano completo in 10 minuti. Il nostro matrimonio era esattamente come lo immaginavamo.', stars: 5 },
      { name: 'Valentina Rossi', role: 'Wedding Planner, Roma', text: 'Uso Fentsi per ogni cliente. Mi risparmia ore di lavoro e le stime dell\'AI sono sorprendentemente accurate. I miei clienti adorano il risultato.', stars: 5 },
      { name: 'Villa Belvedere', role: 'Location, Toscana', text: 'Da quando usiamo Fentsi per i nostri ospiti, le prenotazioni sono aumentate del 40%. Stabilisce le aspettative giuste ancora prima che ci chiamino.', stars: 5 },
    ],
    pricingLabel: 'Prezzi',
    pricingTitle: 'Semplice. Trasparente.',
    pricingSub: 'Inizia gratis. Passa al piano superiore quando ne hai bisogno.',
    plans: [
      {
        name: 'Gratis', price: '0', period: 'per sempre',
        desc: 'Tutto quello che ti serve per il tuo primo evento.',
        features: ['1 piano AI completo', 'Fornitori reali locali', '3 opzioni per categoria', 'Filtro budget e stile', 'Export PDF'],
        cta: 'Inizia gratis', highlighted: false,
      },
      {
        name: 'Pro', price: '29', period: 'mese',
        desc: 'Per coppie e planner che pianificano spesso.',
        features: ['Fino a 30 piani/mese', 'Fornitori premium filtrati', 'Richieste preventivi illimitate', 'Export PDF', 'Supporto prioritario email'],
        cta: 'Inizia Pro', highlighted: true,
      },
      {
        name: 'Agency', price: '249', period: 'mese',
        desc: 'Per wedding planner e agenzie.',
        features: ['200 piani/mese', '10 posti nel team', 'White-label (dominio custom)', 'Accesso API', 'Analytics avanzati', 'Account manager dedicato'],
        cta: 'Contattaci', highlighted: false,
      },
    ],
    mostPopular: 'Più popolare',
    ctaTitle: 'Il miglior evento che tu abbia mai pianificato',
    ctaSub: 'inizia con 10 domande.',
    ctaBtn: 'Inizia gratis',
    footerRights: '© 2025 Fentsi. Tutti i diritti riservati.',
    footerLinks: ['Privacy Policy', 'Termini di Servizio', 'Contatti'],
    cardStep: 'Domanda 3 di 10',
    cardQ: 'Qual è il tuo stile?',
    cardOpts: ['🌿 Rustico & Naturale', '✨ Elegante & Lusso', '🎨 Moderno & Creativo', '🌊 Bohemian & Libero'],
  },
} as const satisfies Record<string, Record<string, unknown>>

type Lang = 'en' | 'it'
type Translations = (typeof T)['en']

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }

// ── Wizard card mockup ────────────────────────────────────────────────────────
function WizardCard({ t }: { t: (typeof T)[keyof typeof T] }) {
  const [selected, setSelected] = useState(0)
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-3xl scale-75 translate-y-4" />
      <div className="relative bg-[#111118] border border-white/10 rounded-3xl p-6 shadow-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-mono text-white/30 tracking-wider">{t.cardStep}</span>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < 2 ? 'w-4 bg-rose-500' : i === 2 ? 'w-4 bg-rose-500/60' : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
        {/* Question */}
        <p className="text-lg font-semibold mb-4 leading-snug">{t.cardQ}</p>
        {/* Options */}
        <div className="grid grid-cols-2 gap-2">
          {t.cardOpts.map((opt, i) => (
            <button
              key={opt}
              onClick={() => setSelected(i)}
              className={`p-3 rounded-2xl text-sm text-left leading-snug transition-all border ${
                selected === i
                  ? 'bg-rose-500/15 border-rose-500/50 text-white'
                  : 'bg-white/[0.03] border-white/8 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {/* Next button */}
        <button className="mt-4 w-full py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
          Continue <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const t = T[lang] as Translations

  return (
    <main className="min-h-screen bg-[#09090F] text-white overflow-x-hidden">

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#09090F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-rose-500 flex items-center justify-center text-white font-bold text-xs">f</div>
            <span className="font-semibold tracking-tight text-white">fentsi</span>
          </Link>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#how" className="hover:text-white transition-colors">{t.nav.how}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t.nav.pricing}</a>
          </div>

          {/* Right: lang switch + Login + CTA */}
          <div className="flex items-center gap-3">
            {/* Language switch */}
            <div className="flex items-center bg-white/5 border border-white/8 rounded-full p-0.5 text-xs font-medium">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full transition-all ${lang === 'en' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
              >EN</button>
              <button
                onClick={() => setLang('it')}
                className={`px-3 py-1 rounded-full transition-all ${lang === 'it' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
              >IT</button>
            </div>
            <Link
              href="/login"
              className="hidden sm:flex items-center px-4 py-2 rounded-full border border-white/15 text-white/70 text-sm font-medium hover:text-white hover:border-white/30 transition-colors"
            >
              {lang === 'it' ? 'Accedi' : 'Login'}
            </Link>
            <Link
              href="/onboarding"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              {t.nav.cta} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-orange-400/6 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-rose-400 tracking-widest uppercase mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  {t.badge}
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04] mb-6">
                {t.h1a}<br />
                <span className="text-white/40">{t.h1b}</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base md:text-lg text-white/45 leading-relaxed mb-10 max-w-xl">
                {t.sub}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-12">
                <Link
                  href="/onboarding"
                  className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t.cta1}
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#how"
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/10 text-white/60 font-medium text-sm hover:text-white hover:border-white/20 transition-colors"
                >
                  {t.cta2}
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-5 text-xs text-white/30">
                {t.trust.map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-rose-400/70" />
                    {item}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: wizard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <WizardCard t={t} />
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-24 pt-12 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {t.stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/30 tracking-wide">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mb-20"
          >
            <motion.span variants={fadeUp} className="text-xs font-medium text-rose-400 tracking-widest uppercase">
              {t.howLabel}
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tight mt-3 mb-4">
              {t.howTitle}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 text-lg">{t.howSub}</motion.p>
          </motion.div>

          <div className="space-y-0">
            {t.steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-8 py-10 border-b border-white/5 group"
              >
                <div className="text-6xl md:text-8xl font-bold text-white/5 leading-none select-none group-hover:text-white/8 transition-colors">
                  {step.n}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl md:text-2xl font-semibold mb-3 text-white">{step.title}</h3>
                  <p className="text-white/40 leading-relaxed max-w-xl">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mb-16"
          >
            <motion.span variants={fadeUp} className="text-xs font-medium text-rose-400 tracking-widest uppercase">
              {t.featLabel}
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tight mt-3 mb-4">
              {t.featTitle}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 text-lg max-w-xl">
              {t.featSub}
            </motion.p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Large card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}
              className="md:col-span-2 bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:bg-rose-500/15 transition-colors">
                <div className="w-4 h-4 rounded-full bg-rose-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features[0].title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{t.features[0].desc}</p>
            </motion.div>

            {/* Tall card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 group-hover:bg-rose-500/15 transition-colors">
                <div className="w-4 h-4 rounded-full bg-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features[1].title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{t.features[1].desc}</p>
            </motion.div>

            {/* 3 equal cards */}
            {t.features.slice(2).map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: (i + 2) * 0.07, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="bg-white/[0.03] border border-white/8 rounded-3xl p-8 hover:bg-white/[0.05] transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-white/8 transition-colors">
                  <div className="text-xs font-bold text-white/30">{String(i + 3).padStart(2, '0')}</div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mb-16"
          >
            <motion.span variants={fadeUp} className="text-xs font-medium text-rose-400 tracking-widest uppercase">
              {t.testimonialLabel}
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight mt-3">
              {t.testimonialTitle}
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {t.testimonials.map((test, i) => (
              <motion.div
                key={test.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="bg-white/[0.03] border border-white/8 rounded-3xl p-8"
              >
                <div className="flex gap-0.5 mb-6">
                  {Array.from({ length: test.stars }).map((_, j) => (
                    <Star key={j} size={13} fill="currentColor" className="text-rose-400" />
                  ))}
                </div>
                <p className="text-white/60 text-sm leading-relaxed mb-8 italic">{'"'}{test.text}{'"'}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm flex-shrink-0">
                    {test.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{test.name}</div>
                    <div className="text-xs text-white/30">{test.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} className="text-xs font-medium text-rose-400 tracking-widest uppercase">
              {t.pricingLabel}
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-3">
              {t.pricingTitle}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40">{t.pricingSub}</motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {t.plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className={`relative rounded-3xl p-7 ${
                  plan.highlighted
                    ? 'bg-white text-black'
                    : 'bg-white/[0.03] border border-white/8'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold">
                    {t.mostPopular}
                  </div>
                )}
                <div className="mb-6">
                  <div className={`text-xs font-medium tracking-widest uppercase mb-3 ${plan.highlighted ? 'text-black/40' : 'text-white/30'}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-black' : 'text-white'}`}>€{plan.price}</span>
                    <span className={`text-sm ${plan.highlighted ? 'text-black/40' : 'text-white/30'}`}>/{plan.period}</span>
                  </div>
                  <p className={`text-sm ${plan.highlighted ? 'text-black/50' : 'text-white/35'}`}>{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2.5 text-sm ${plan.highlighted ? 'text-black/70' : 'text-white/50'}`}>
                      <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-black' : 'text-rose-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/onboarding"
                  className={`block w-full text-center py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.highlighted
                      ? 'bg-black text-white hover:bg-black/80'
                      : 'border border-white/10 text-white/70 hover:text-white hover:border-white/20'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-40 px-6 border-t border-white/5 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-rose-500/10 via-transparent to-transparent" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.04] mb-6">
            {t.ctaTitle}<br />
            <span className="text-white/30">{t.ctaSub}</span>
          </h2>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-white text-black font-semibold text-base hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            {t.ctaBtn} <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-rose-500 flex items-center justify-center text-white font-bold text-xs">f</div>
            <span className="font-medium text-white/40">fentsi</span>
          </div>
          <p>{t.footerRights}</p>
          <div className="flex gap-6">
            {t.footerLinks.map((link) => (
              <a key={link} href="#" className="hover:text-white transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>

    </main>
  )
}
