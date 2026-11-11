-- ProofGate PostgreSQL schema
-- Run: psql $DATABASE_URL -f src/server/db/schema.sql  OR  npm run db:migrate

create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('fact','term','guideline','asset')),
  key text not null,
  fact_key text,
  title text not null,
  owner text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table if not exists source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  workspace_id uuid not null,
  version int not null,
  value jsonb not null,
  status text not null check (status in ('current','superseded','expired','withdrawn')),
  effective_from date not null default current_date,
  valid_until date,
  change_note text,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (source_id, version)
);

create unique index if not exists one_current_version
  on source_versions(source_id) where status = 'current';

create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  workspace_id uuid not null,
  version int not null,
  text text not null,
  file_name text,
  file_type text,
  file_hash text not null,
  state text not null check (state in ('draft','in_review','cleared','rejected','revalidation_required')),
  ai_available boolean not null default true,
  created_at timestamptz not null default now(),
  unique (content_id, version)
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references content_versions(id) on delete cascade,
  workspace_id uuid not null,
  quote text not null,
  start_idx int,
  end_idx int,
  fact_key text,
  value jsonb,
  context text not null check (context in ('current','historical','quoted','hypothetical'))
);

create table if not exists findings (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references content_versions(id) on delete cascade,
  workspace_id uuid not null,
  claim_id uuid references claims(id) on delete set null,
  kind text not null check (kind in ('claim','term','guideline','injection','asset')),
  status text not null check (status in ('supported','contradicted','expired_or_superseded','unverifiable','conflicting_evidence','review_needed')),
  severity text not null check (severity in ('info','warning','blocker')),
  source_version_id uuid references source_versions(id),
  quote text,
  start_idx int,
  end_idx int,
  explanation text not null,
  suggested_fix text,
  creator_action text check (creator_action in ('accepted','edited','dismissed')),
  dismiss_reason text,
  link_status text check (link_status in ('confirmed','probable'))
);

create table if not exists clearances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  content_version_id uuid not null references content_versions(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')),
  state text not null check (state in ('current','revalidation_required','review_needed','rejected')),
  reviewer text not null,
  comment text,
  decided_at timestamptz not null default now()
);

create unique index if not exists one_clearance_per_version
  on clearances(content_version_id);

create table if not exists clearance_dependencies (
  id uuid primary key default gen_random_uuid(),
  clearance_id uuid not null references clearances(id) on delete cascade,
  workspace_id uuid not null,
  source_version_id uuid not null references source_versions(id),
  claim_id uuid references claims(id),
  link_status text not null check (link_status in ('confirmed','probable'))
);

create index if not exists clearance_deps_confirmed
  on clearance_dependencies(source_version_id) where link_status = 'confirmed';

create table if not exists revalidation_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  clearance_id uuid not null references clearances(id) on delete cascade,
  trigger_source_version_id uuid not null references source_versions(id),
  new_source_version_id uuid references source_versions(id),
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  content_version_id uuid not null references content_versions(id) on delete cascade,
  finding_id uuid references findings(id) on delete set null,
  author_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  workspace_id uuid not null,
  actor_role text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Rate limit: DB counter, safe on Vercel serverless (no shared in-memory state)
create table if not exists rate_limit_log (
  id bigserial primary key,
  workspace_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_log_ws_action_time
  on rate_limit_log(workspace_id, action, created_at);

create table if not exists evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  mode text not null check (mode in ('deterministic', 'gemini')),
  as_of_date timestamptz not null default now(),
  dataset text not null default 'detection',
  cases_count integer not null,
  passed_count integer not null,
  failed_count integer not null,
  metrics jsonb not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists evaluation_runs_ws_created
  on evaluation_runs(workspace_id, created_at desc);
