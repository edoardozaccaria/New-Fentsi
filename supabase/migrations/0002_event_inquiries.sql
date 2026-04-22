create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  title text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  email text not null,
  full_name text,
  phone text,
  event_type text not null,
  guest_count integer not null check (guest_count > 0),
  event_date date,
  location text not null,
  budget_range text not null check (budget_range in ('budget_friendly', 'mid_range', 'luxury')),
  services_needed text[] not null default '{}',
  special_requests text,
  consent boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'in_review', 'qualified', 'completed', 'archived')),
  source text not null default 'marketing_form',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  plan_id uuid references public.plans(id) on delete set null,
  last_n8n_execution_id text,
  n8n_workflow_id text,
  last_contacted_at timestamptz,
  notes jsonb,
  raw_submission jsonb
);

create index if not exists projects_email_idx on public.projects (lower(email));
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_created_at_idx on public.projects (created_at desc);
create index if not exists projects_assigned_profile_idx on public.projects (assigned_profile_id);
create index if not exists projects_profile_idx on public.projects (profile_id);

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "Owners manage own projects"
  on public.projects
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Planners manage assigned projects"
  on public.projects
  using (
    assigned_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'planner'
    )
  )
  with check (
    assigned_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'planner'
    )
  );

create policy "Partners view assigned projects"
  on public.projects
  for select
  using (
    assigned_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'partner'
    )
  );

create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists project_activities_project_idx
  on public.project_activities (project_id, created_at desc);

alter table public.project_activities enable row level security;

create policy "Owners view project activities"
  on public.project_activities
  for select
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.profile_id = auth.uid()
    )
  );

create policy "Planners manage project activities"
  on public.project_activities
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.assigned_profile_id = auth.uid()
        and exists (
          select 1
          from public.profiles planner
          where planner.id = auth.uid()
            and planner.role = 'planner'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles planner
      where planner.id = auth.uid()
        and planner.role = 'planner'
    )
  );

create policy "Partners insert notes on assigned projects"
  on public.project_activities
  for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.assigned_profile_id = auth.uid()
    )
    and exists (
      select 1
      from public.profiles partner
      where partner.id = auth.uid()
        and partner.role = 'partner'
    )
  );
