-- Migration: Add unique index on clearances(content_version_id) for idempotent approvals
CREATE UNIQUE INDEX IF NOT EXISTS one_clearance_per_version
  ON clearances(content_version_id);
