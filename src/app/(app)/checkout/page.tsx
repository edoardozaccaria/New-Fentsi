import { PLANS } from '@/lib/stripe';
import { CheckoutActions } from '@/components/checkout/CheckoutActions';

/**
 * Pricing / checkout page.
 *
 * Shows the three subscription tiers (single / pro / agency) with
 * a Stripe Checkout button per plan.
 *
 * Protected by proxy.ts (only authenticated users can reach /checkout).
 */
export default function CheckoutPage() {
  const tiers = (Object.keys(PLANS) as Array<keyof typeof PLANS>).map((k) => ({
    key: k,
    ...PLANS[k],
  }));

  return (
    <main className="min-h-screen bg-[#0b0a09] text-[#f5ecdc] px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-center mb-3">
          Scegli il tuo piano
        </h1>
        <p className="text-center text-[#c9bca6] mb-12 max-w-xl mx-auto">
          Un pagamento, nessuna sorpresa. Cambia o cancella quando vuoi.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <article
              key={tier.key}
              className="rounded-2xl border border-[#f5ecdc]/10 bg-[#11100e] p-6 flex flex-col"
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl mb-1">
                {tier.name}
              </h2>
              <p className="text-[#c9bca6] text-sm mb-4">
                {tier.key === 'agency'
                  ? 'Per team e wedding planner professionali.'
                  : tier.key === 'pro'
                    ? 'Per chi pianifica molti eventi.'
                    : 'Per il tuo singolo evento.'}
              </p>
              <div className="mb-6">
                <span className="font-[family-name:var(--font-display)] text-4xl">
                  €{tier.price}
                </span>
                <span className="text-[#c9bca6] text-sm ml-1">/ mese</span>
              </div>
              <ul className="flex-1 space-y-2 mb-6 text-sm text-[#e8dfcd]">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-[#e8816b]">
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <CheckoutActions
                mode={{ kind: 'subscription', plan: tier.key }}
              />
            </article>
          ))}
        </div>

        <p className="text-xs text-[#c9bca6]/70 text-center mt-10">
          Pagamenti gestiti da Stripe. IVA inclusa dove applicabile.
        </p>
      </div>
    </main>
  );
}
