import Link from "next/link";
import { ArrowUpRight, Filter, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createServerSupabase } from "@/lib/supabase/server";

type ProjectRow = {
  id: string;
  title: string | null;
  created_at: string;
  location: string;
  event_type: string;
  budget_range: "budget_friendly" | "mid_range" | "luxury";
  status: "draft" | "submitted" | "in_review" | "qualified" | "completed" | "archived";
  guest_count: number;
};

export default async function ProDashboardPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, created_at, location, event_type, budget_range, status, guest_count")
    .or(`profile_id.eq.${user.id},assigned_profile_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Errore nel recupero dei progetti:", error.message);
  }

  const projects = (data ?? []) as ProjectRow[];
  const activeProjects = projects.filter((project) => project.status !== "archived");
  const qualifiedProjects = projects.filter((project) => project.status === "qualified");
  const completedProjects = projects.filter((project) => project.status === "completed");
  const conversionRate = projects.length ? Math.round((completedProjects.length / projects.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pro dashboard</p>
          <h1 className="font-display text-h2 text-slate-900">Lead qualificati e insight</h1>
          <p className="max-w-2xl text-base text-slate-500">
            Gestisci lead prioritari, monitora conversioni e analizza le performance dei referral con una vista pensata
            per venue, planner e fornitori.
          </p>
        </div>
        <Button variant="outline" className="shadow-subtle" asChild>
          <Link href="/checkout?plan=pro">Gestisci abbonamento</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-100">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm text-slate-500">Lead attivi</p>
            <p className="text-3xl font-semibold text-slate-900">{activeProjects.length}</p>
            <Badge variant="accent">{qualifiedProjects.length} qualificati</Badge>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm text-slate-500">Conversion rate</p>
            <p className="text-3xl font-semibold text-success">{conversionRate}%</p>
            <p className="text-xs text-slate-400">{completedProjects.length} lead chiusi</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="space-y-2 p-6">
            <p className="text-sm text-slate-500">Ticket medio</p>
            <p className="text-3xl font-semibold text-slate-900">
              {formatAverageBudget(projects.map((project) => project.budget_range))}
            </p>
            <p className="text-xs text-slate-400">Distribuzione per range indicato dal lead</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="h-4 w-4" /> Leads
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                <Filter className="h-4 w-4" /> Filtri
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/pro/export">Export</Link>
              </Button>
            </div>
          </div>
          <Separator />
          {projects.length === 0 ? (
            <EmptyProjects />
          ) : (
            <div className="grid gap-3 text-sm text-slate-600">
              <div className="grid grid-cols-6 gap-3 text-xs uppercase tracking-wide text-slate-400">
                <span>ID</span>
                <span>Evento</span>
                <span>Location</span>
                <span>Ospiti</span>
                <span>Budget</span>
                <span>Status</span>
              </div>
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="grid grid-cols-6 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-subtle"
                >
                  <span className="font-medium text-slate-900">{project.id.slice(0, 8).toUpperCase()}</span>
                  <span>{project.title ?? project.event_type}</span>
                  <span>{project.location}</span>
                  <span>{project.guest_count}</span>
                  <span>{formatBudgetRange(project.budget_range)}</span>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{formatProjectStatus(project.status)}</Badge>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/pro/leads/${project.id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyProjects() {
  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center text-sm text-slate-500">
      <p className="font-medium text-slate-900">Ancora nessun lead disponibile</p>
      <p>Attiva campagne referral o assegna progetti ai membri del team per vedere i lead qualificati.</p>
    </div>
  );
}

function formatBudgetRange(range: ProjectRow["budget_range"]) {
  switch (range) {
    case "budget_friendly":
      return "Budget friendly";
    case "mid_range":
      return "Mid range";
    case "luxury":
      return "Luxury";
    default:
      return range;
  }
}

function formatProjectStatus(status: ProjectRow["status"]) {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In review";
    case "qualified":
      return "Qualified";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function formatAverageBudget(ranges: ProjectRow["budget_range"][]) {
  if (ranges.length === 0) return "n/d";
  const weights = ranges.reduce(
    (acc, range) => {
      switch (range) {
        case "budget_friendly":
          acc.total += 1;
          acc.points += 1;
          break;
        case "mid_range":
          acc.total += 1;
          acc.points += 2;
          break;
        case "luxury":
          acc.total += 1;
          acc.points += 3;
          break;
        default:
          break;
      }
      return acc;
    },
    { total: 0, points: 0 },
  );

  if (weights.total === 0) return "n/d";
  const average = weights.points / weights.total;
  if (average < 1.5) return "Budget friendly";
  if (average < 2.5) return "Mid range";
  return "Luxury";
}
