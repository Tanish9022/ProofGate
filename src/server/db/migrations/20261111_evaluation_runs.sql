-- Migration: Add evaluation_runs table for Improvement 1 precision reports
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('deterministic', 'gemini')),
  as_of_date timestamptz NOT NULL DEFAULT now(),
  dataset text NOT NULL DEFAULT 'detection',
  cases_count integer NOT NULL,
  passed_count integer NOT NULL,
  failed_count integer NOT NULL,
  metrics jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluation_runs_ws_created
  ON evaluation_runs(workspace_id, created_at DESC);

