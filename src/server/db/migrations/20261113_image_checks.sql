-- Add image_findings table for storing per-region analysis results
CREATE TABLE IF NOT EXISTS image_findings (
  id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references content_versions(id) on delete cascade,
  workspace_id uuid not null,
  kind text not null check (kind in ('palette_off_brand','contrast_below_aa','logo_missing','text_unreadable')),
  severity text not null check (severity in ('info','warning','blocker')),
  region_x real,
  region_y real,
  region_w real,
  region_h real,
  explanation text not null,
  hex_found text,
  hex_expected text,
  contrast_ratio real,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS image_findings_version
  ON image_findings(content_version_id);

