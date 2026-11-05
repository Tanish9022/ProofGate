# API_SPEC

All routes are under `/api`. Every request resolves the workspace from cookie `pg_ws` (created on first visit). Role comes from header `x-role` (`admin` | `creator` | `reviewer`). Errors: `{ "error": { "code": "string", "message": "string" } }` with a proper HTTP status. Frontend builds against `src/mocks/*.json` until these exist.

## Workspace
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /api/workspace/init | any | Creates and seeds the workspace if no cookie. Returns `{ workspaceId }`. |
| POST | /api/workspace/reset | any | Wipes and re-seeds. |

## Sources
| Method | Path | Who | Body / result |
|---|---|---|---|
| GET | /api/sources | any | `[{ id, kind, key, title, owner, current: { version, value, status, validUntil }, versionCount }]` |
| GET | /api/sources/:id | any | Source plus all versions and the clearances that depend on the current version |
| POST | /api/sources | admin | `{ kind, key, title, owner, value, validUntil? }` creates version 1 |
| POST | /api/sources/:id/versions | admin | `{ value, changeNote, validUntil? }` supersedes the current version, then runs revalidation. Result: `{ newVersion, affected: [{ clearanceId, contentTitle, reason }] }` |
| POST | /api/sources/:id/withdraw | admin | `{ reason }` marks current `withdrawn`, runs revalidation |
| POST | /api/sources/:id/expire | admin | `{}` marks current `expired`, runs revalidation |
| GET | /api/sources/:id/impact | admin | Preview: clearances that would be affected, no changes made |

## Content
| Method | Path | Who | Body / result |
|---|---|---|---|
| POST | /api/content | creator | multipart: `title`, and either `text` or `file`. Creates content + version 1, extracts text. Result: `{ contentId, versionId }` |
| POST | /api/content/:id/analyze | creator | `{ versionId }` runs the pipeline. Result: `{ aiAvailable, claims[], findings[] }`. maxDuration 60 s. |
| GET | /api/content | any | List with latest version state |
| GET | /api/content/:id | any | Content, all versions, latest claims and findings |
| POST | /api/content/:id/versions | creator | `{ text }` creates the next version (after edits), then call analyze again |
| PATCH | /api/findings/:id | creator | `{ action: 'accepted'|'edited'|'dismissed', reason? }` |
| POST | /api/findings/:id/confirm-link | reviewer | Promote a `probable` link to `confirmed` |

| POST | /api/content/:id/comments | any | `{ versionId, findingId?, body }` adds a comment (shown on the content page and in the review queue) |
| GET | /api/content/:id/comments | any | Comments for the content |

## Review and clearance
| Method | Path | Who | Body / result |
|---|---|---|---|
| POST | /api/content/:id/submit-for-review | creator | `{ versionId }` blocked if any `blocker` finding is unresolved |
| GET | /api/review/queue | reviewer | Versions in `in_review` |
| POST | /api/review/:versionId/decision | reviewer | `{ decision: 'approved'|'rejected', comment }` Approve creates clearance and dependencies in one transaction |
| GET | /api/clearances | any | List with state |
| GET | /api/clearances/:id | any | Version, claims, dependencies (source title + version + link status), reviewer, time |

## Revalidation
| Method | Path | Who | Notes |
|---|---|---|---|
| GET | /api/revalidation | reviewer | Open items with reason, old value, new value, content title |
| POST | /api/revalidation/:id/resolve | reviewer | `{ action: 'reapprove'|'send_back', comment }` reapprove creates a new clearance linked to current source versions |

## Audit
| GET | /api/audit | any | Latest 200 rows for the workspace |

## Business rules the API must enforce
1. Only one `current` version per source.
2. `submit-for-review` rejected if the latest version has a finding with severity `blocker` that is not `accepted`, `edited` (and re-analyzed clean) or `dismissed` with a reason.
3. Approve is rejected for roles other than `reviewer`.
4. Revalidation only touches clearances in state `current` with a `confirmed` dependency on the changed source version.
5. Every mutation writes `audit_log`.
6. Upload limit 4 MB; allowed: txt, pdf, docx, png, jpg.
