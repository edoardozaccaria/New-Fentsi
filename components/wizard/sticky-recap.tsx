"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculateAllocationAmounts, getRemainingBudgetPercent } from "@/lib/wizard/budget";
import { getGuestTierById } from "@/lib/data/guest-tiers";
import { getEventTypeById, usePlanWizard } from "@/stores/plan-wizard";
import type { AllocationCategory } from "@/types/plans";

const categoryLabels: Record<AllocationCategory, string> = {
  venue: "Venue",
  catering: "Catering",
  decor: "Decor",
  entertainment: "Entertainment",
  av: "AV",
  photo_video: "Photo / Video",
  misc: "Misc",
};

const chartColors: Record<AllocationCategory, string> = {
  venue: "#7f9cff",
  catering: "#ffcfa8",
  decor: "#e9c5ff",
  entertainment: "#9de7d0",
  av: "#96b5ff",
  photo_video: "#ffd1e3",
  misc: "#d5e4f7",
};

const MIN_SAFE_BUDGET = 300;

export function StickyRecap() {
  const { draft } = usePlanWizard();
  const eventType = draft.eventTypeId ? getEventTypeById(draft.eventTypeId) : undefined;
  const guestTier = draft.guestTierId ? getGuestTierById(draft.guestTierId) : undefined;

  const totalBudget = draft.totalBudget ?? MIN_SAFE_BUDGET;

  const { pieData, remainingPercent, allocationList } = useMemo(() => {
    const remaining = getRemainingBudgetPercent(draft.allocations);
    const allocations = Object.entries(draft.allocations) as [AllocationCategory, number][];
    const amounts = calculateAllocationAmounts(totalBudget, draft.allocations);
    const pie = allocations
      .filter(([, percent]) => percent > 0)
      .map(([category, percent]) => ({
        name: categoryLabels[category],
        value: percent,
        category,
      }));

    const list = allocations.map(([category, percent]) => ({
      category,
      percent,
      amount: amounts[category],
    }));

    return {
      pieData: pie,
      remainingPercent: remaining,
      allocationList: list,
    };
  }, [draft.allocations, totalBudget]);

  return (
    <div className="sticky top-24 space-y-4">
      <Card className="border-slate-100">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Recap</p>
              <h3 className="font-display text-h3 text-slate-900">{eventType?.name ?? "Evento"}</h3>
            </div>
            {eventType && <Badge variant="outline">Min € {eventType.minBudget.toLocaleString("it-IT")}</Badge>}
          </div>
          <Separator />
          <div className="space-y-2 text-sm text-slate-500">
            <p>
              <span className="font-semibold text-slate-900">Guest tier:</span> {guestTier?.label ?? "Da selezionare"}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Budget:</span> € {totalBudget.toLocaleString("it-IT")}
            </p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={pieData} innerRadius={60} outerRadius={80}>
                  {pieData.map((entry) => (
                    <Cell key={entry.category} fill={chartColors[entry.category as AllocationCategory]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#e2e8f0",
                    boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm font-medium text-slate-600">
            Budget rimanente: <span className="text-emerald-600">{remainingPercent}%</span>
          </p>
          <div className="rounded-2xl bg-slate-50 p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={allocationList} layout="vertical" barSize={18}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tickFormatter={(value) => categoryLabels[value as AllocationCategory]}
                  width={100}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: "#e2e8f0",
                    boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name: string, payload) => [
                    `${value}% — € ${payload.payload.amount.toLocaleString("it-IT")}`,
                    categoryLabels[payload.payload.category as AllocationCategory],
                  ]}
                />
                <Bar dataKey="percent" radius={[0, 12, 12, 0]}>
                  {allocationList.map((item) => (
                    <Cell key={item.category} fill={chartColors[item.category]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
