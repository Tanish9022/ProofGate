# DATA_MODEL (PostgreSQL)

All tables have `workspace_id` and are always queried with it.

```sql
create extension if not exists pgcrypto;

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- A source is a thing that can be approved and versioned
create table sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('fact','term','guideline','asset')),
  key text not null,                 -- e.g. pro_price, banned_guaranteed
  title text not null,
  owner text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  workspace_id uuid not null,
  version int not null,
  value jsonb not null,              -- see value shapes below
  status text not null check (status in ('current','superseded','expired','withdrawn')),
  effective_from date not null default current_date,
  valid_until date,
  change_note text,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (source_id, version)
);
-- only one current version per source
create unique index one_current_version on source_versions(source_id) where status = 'current';

create table contents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table content_versions (
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

create table claims (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references content_versions(id) on delete cascade,
  workspace_id uuid not null,
  quote text not null,
  start_idx int, end_idx int,
  fact_key text,
  value jsonb,                        -- {number, unit, raw}
  context text not null check (context in ('current','historical','quoted','hypothetical'))
);

create table findings (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references content_versions(id) on delete cascade,
  workspace_id uuid not null,
  claim_id uuid references claims(id) on delete set null,
  kind text not null check (kind in ('claim','term','guideline','injection','asset')),
  status text not null check (status in ('supported','contradicted','expired_or_superseded','unverifiable','conflicting_evidence','review_needed')),
  severity text not null check (severity in ('info','warning','blocker')),
  source_version_id uuid references source_versions(id),
  quote text,
  start_idx int, end_idx int,
  explanation text not null,
  suggested_fix text,
  creator_action text check (creator_action in ('accepted','edited','dismissed')),
  dismiss_reason text,
  link_status text check (link_status in ('confirmed','probable'))
);

create table clearances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  content_version_id uuid not null references content_versions(id) on delete cascade,
  decision text not null check (decision in ('approved','rejected')),
  state text not null check (state in ('current','revalidation_required','review_needed','rejected')),
  reviewer text not null,
  comment text,
  decided_at timestamptz not null default now()
);

create table clearance_dependencies (
  id uuid primary key default gen_random_uuid(),
  clearance_id uuid not null references clearances(id) on delete cascade,
  workspace_id uuid not null,
  source_version_id uuid not null references source_versions(id),
  claim_id uuid references claims(id),
  link_status text not null check (link_status in ('confirmed','probable'))
);
create index on clearance_dependencies(source_version_id) where link_status = 'confirmed';

create table revalidation_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  clearance_id uuid not null references clearances(id) on delete cascade,
  trigger_source_version_id uuid not null references source_versions(id),
  new_source_version_id uuid references source_versions(id),
  reason text not null,               -- "Price changed Rs. 499 -> Rs. 699"
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  content_version_id uuid not null references content_versions(id) on delete cascade,
  finding_id uuid references findings(id) on delete set null,
  author_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  workspace_id uuid not null,
  actor_role text not null,
  action text not null,               -- source.superseded, content.submitted, clearance.approved ...
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
```

## `source_versions.value` shapes
```jsonc
// fact
{ "number": 499, "unit": "INR_per_user_month", "display": "Rs. 499 per user per month" }
{ "number": 14, "unit": "days", "display": "14-day free trial" }
{ "number": 99.9, "unit": "percent", "display": "99.9% uptime" }
// term
{ "type": "banned", "pattern": "guaranteed", "message": "Avoid absolute guarantees" }
{ "type": "spelling", "preferred": "BrightDesk", "wrong": ["Bright Desk","Brightdesk"] }
// guideline
{ "text": "Keep a friendly, professional tone. No exaggerated superlatives." }
// asset (Round 3 uses this)
{ "name": "Primary logo", "colors": ["#0B5FFF"], "min_contrast": 4.5 }
```

## Key queries (write these as tested functions)
- `currentVersions(workspaceId)` returns all sources with their current version.
- `dependentClearances(sourceVersionId)` returns clearances in state `current` with a `confirmed` dependency on that source version.
- `supersede(sourceId, newValue, note, actor)`: transaction that marks old `superseded`, inserts new `current`, then runs revalidation.
