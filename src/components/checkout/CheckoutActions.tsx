'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS, ONE_TIME_PRODUCTS, type PlanType } from '@/lib/stripe';

type Mode =
  | { kind: 'subscription'; plan: PlanType }
  | {
      kind: 'booking';
      product: keyof typeof ONE_TIME_PRODUCTS;
      planId?: string;
    };

type Props = {
  /** What the button charges for. */
  mode: Mode;
  /** Optional label override. */
  label?: string;
  className?: string;
};

/**
 * Client-side action button that opens a Stripe Checkout Session.
 *
 * Ported (and simplified) from legacy Fentsi (components/checkout/checkout-actions.tsx).
 * Theme adapted to the new dark-cream palette.
 */
export function CheckoutActions({ mode, label, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        mode.kind === 'subscription'
          ? '/api/checkout'
          : '/api/checkout/booking';

      const body =
        mode.kind === 'subscription'
          ? { plan: mode.plan }
          : { product: mode.product, planId: mode.planId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        if (res.status === 401) {
          router.push(
            `/login?next=${encodeURIComponent(window.location.pathname)}`
          );
          return;
        }
        throw new Error(data.error ?? 'Checkout failed');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  }

  const defaultLabel =
    mode.kind === 'subscription'
      ? `Abbonati a ${PLANS[mode.plan].name}`
      : `Acquista ${ONE_TIME_PRODUCTS[mode.product].name}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={
          className ??
          'h-12 rounded-md bg-[#f5ecdc] text-[#0b0a09] font-medium hover:bg-[#f5ecdc]/90 disabled:opacity-60 transition'
        }
      >
        {loading ? 'Redirecting…' : (label ?? defaultLabel)}
      </button>
      {error && (
        <p role="alert" className="text-sm text-[#e8816b]">
          {error}
        </p>
      )}
    </div>
  );
}
