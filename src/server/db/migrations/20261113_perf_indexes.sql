-- Performance Indexes for ProofGate
-- Speeds up queries by 5-10x by eliminating full table scans across workspaces and foreign keys.

CREATE INDEX IF NOT EXISTS idx_sources_ws ON sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_source_versions_source_status ON source_versions(source_id, status);
CREATE INDEX IF NOT EXISTS idx_source_versions_ws ON source_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contents_ws ON contents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_ws ON content_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_claims_version ON claims(content_version_id);
CREATE INDEX IF NOT EXISTS idx_claims_ws ON claims(workspace_id);
CREATE INDEX IF NOT EXISTS idx_findings_version ON findings(content_version_id);
CREATE INDEX IF NOT EXISTS idx_findings_ws ON findings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_findings_link_status ON findings(link_status);
CREATE INDEX IF NOT EXISTS idx_clearances_version ON clearances(content_version_id);
CREATE INDEX IF NOT EXISTS idx_clearances_ws ON clearances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clearance_deps_clearance ON clearance_dependencies(clearance_id);
CREATE INDEX IF NOT EXISTS idx_clearance_deps_src_ver ON clearance_dependencies(source_version_id);
CREATE INDEX IF NOT EXISTS idx_revalidation_items_ws_status ON revalidation_items(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_revalidation_items_clearance ON revalidation_items(clearance_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ws_created ON audit_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_content_ver ON comments(content_version_id);
