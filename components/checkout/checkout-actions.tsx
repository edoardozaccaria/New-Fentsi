"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type CheckoutActionsProps = {
  planId: string;
  vendorId: string;
  vendorName: string;
  defaultAmount: number;
  currency: "eur";
};

export function CheckoutActions({ planId, vendorId, vendorName, defaultAmount, currency }: CheckoutActionsProps) {
  const [amount, setAmount] = useState<number>(Math.max(100, Math.round(defaultAmount)));
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      toast({
        title: "Importo non valido",
        description: "Inserisci un importo positivo prima di procedere.",
        variant: "error",
      });
      return;
    }

    const normalizedAmount = Math.max(100, Math.round(amount));

    setIsProcessing(true);
    try {
      const origin = window.location.origin;
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          vendorId,
          amount: normalizedAmount,
          currency,
          successUrl: `${origin}/plan/${planId}?checkout=success`,
          cancelUrl: `${origin}/checkout?plan=${planId}&vendor=${vendorId}&amount=${normalizedAmount}`,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error ?? "Impossibile avviare il checkout");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }

      toast({
        title: "Sessione creata",
        description: "Reindirizzamento a Stripe in corso...",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile avviare il pagamento.",
        variant: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
      <div className="space-y-2">
        <h2 className="font-display text-lg text-slate-900">Importo deposito</h2>
        <p className="text-sm text-slate-500">
          L&apos;importo verrà autorizzato su Stripe a favore di <span className="font-medium">{vendorName}</span>.
          Puoi modificare il valore prima di procedere.
        </p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-600" htmlFor="deposit-amount">
          Importo in € (IVA inclusa)
        </label>
        <Input
          id="deposit-amount"
          type="number"
          min={100}
          step={100}
          value={amount}
          onChange={(e) => {
            const next = Number(e.target.value);
            setAmount(Number.isNaN(next) ? amount : Math.max(100, next));
          }}
        />
      </div>
      <Button size="lg" className="w-full shadow-soft" onClick={handleCheckout} disabled={isProcessing}>
        {isProcessing ? "Reindirizzamento..." : "Procedi al pagamento Stripe"}
      </Button>
    </div>
  );
}
