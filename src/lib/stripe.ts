// ── Subscription plans ───────────────────────────────────────────────────────

export const PLANS = {
  single: {
    name: 'Fentsi Piano',
    price: 4.99,
    priceId: process.env.STRIPE_SINGLE_PRICE_ID ?? null,
    features: [
      '1 evento completo al mese',
      'Fornitori AI personalizzati',
      '3 opzioni selezionate per te',
      'Link prodotti Amazon inclusi',
      'Export PDF del piano',
    ],
    eventsLimit: 1,
    oneTime: false,
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      'Fino a 30 piani/mese',
      'Fornitori premium filtrati per budget',
      'Richiesta preventivi illimitata',
      'Export PDF del piano',
      'Supporto prioritario via email',
    ],
    eventsLimit: 30,
    oneTime: false,
  },
  agency: {
    name: 'Agency',
    price: 249,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? null,
    features: [
      'Piani illimitati (fair use 200/mese)',
      'Multi-utente fino a 10 seats',
      'White-label (logo e dominio custom)',
      'API access per integrazioni',
      'Dashboard analytics avanzata',
      'Account manager dedicato',
      'SLA 99.9% uptime',
    ],
    eventsLimit: 200,
    oneTime: false,
  },
} as const;

// ── One-time add-ons ─────────────────────────────────────────────────────────

export const ONE_TIME_PRODUCTS = {
  coordination: {
    name: 'Pacchetto Coordinamento',
    price: 99,
    priceId: process.env.STRIPE_COORDINATION_PRICE_ID ?? null,
    description:
      'Il team Fentsi gestisce trattative, contratti e conferme con tutti i fornitori selezionati',
  },
} as const;

export type PlanType = keyof typeof PLANS;
export type OneTimeProduct = keyof typeof ONE_TIME_PRODUCTS;
