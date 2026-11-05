# ARCHITECTURE

## Overview
Single Next.js (App Router, TypeScript) app on Vercel. API route handlers talk to Postgres and Gemini. No separate backend server.

```
Browser (role switcher, cookie pg_ws)
   -> Next.js pages (React, Tailwind)
   -> /api/* route handlers (thin)
        -> services/ (logic)
             -> db/ (SQL)
             -> checker/ (deterministic comparison)
             -> ai/ (Gemini: extract claims, explain, read images)
        -> Postgres
```

## Why this stack
- One deployment on Vercel gives a fast, always-on link. A second free-tier server (e.g. Render) can sleep and make a judge wait or see an error.
- Postgres fits versioned records and dependency links that must stay consistent (transactions).
- Gemini is used only for reading and explaining; comparison is code, so a wrong model answer cannot silently approve or invalidate content.

## Folder layout
```
/AGENTS.md  /MEMORY.md  /.env.example
/docs/*.md
/src
  /app
    page.tsx                 # landing + demo steps
    /library/page.tsx        # source library
    /content/new/page.tsx    # submit
    /content/[id]/page.tsx   # findings + versions
    /review/page.tsx         # reviewer queue
    /clearances/[id]/page.tsx
    /revalidation/page.tsx
    /audit/page.tsx
    /api/...                 # see API_SPEC.md
  /components                # UI kit (Khushi)
  /server
    /db       client.ts, queries.ts, schema.sql, seed.ts
    /services workspace.ts, sources.ts, content.ts, analyze.ts, clearance.ts, revalidate.ts
    /checker  normalize.ts, compare.ts, terms.ts
    /ai       gemini.ts, prompts.ts, schemas.ts
  /mocks                     # JSON for frontend before API is ready
  /lib                       # zod schemas shared by client and server
/tests  checker.test.ts  revalidate.test.ts  e2e.spec.ts
```

## Demo mode (no login)
- First request without cookie `pg_ws`: create a workspace row, clone seed data into it, set the cookie (httpOnly, 30 days).
- Role is a client-side selector stored in `localStorage` and sent as header `x-role`. It only decides which buttons show and which actions the API allows. It is a demo control, not security. Say so in the README.
- "Reset demo" deletes the workspace's data and re-clones the seed.
- Cleanup: a daily cron (or a lazy delete on request) removes workspaces older than 7 days.
- Fallback if cloning is slow: one shared workspace plus Reset button. Decide in block A, record it in MEMORY.md.

## Analysis pipeline (per content version)
1. **Extract text**: TXT direct; PDF via pdf-parse; DOCX via mammoth; image via Gemini vision (text only). Store text and file hash (SHA-256).
2. **Claim extraction (Gemini)**: input is the text plus the list of allowed `fact_key`s for this workspace. Output JSON: claims with quote, span, `fact_key` (or null), `value`, `unit`, `context`. Validate with Zod. Drop anything whose quote is not found verbatim in the text.
3. **Deterministic checks** (code):
   - Fact claims: normalize numbers/units/dates; compare to the current source version. Equal -> `supported` and a `confirmed` dependency. Different -> `contradicted`. Source not current -> `expired_or_superseded`. `fact_key` null or no source -> `unverifiable`. Two current sources disagree -> `conflicting_evidence`.
   - Term rules: regex on banned terms and required spellings -> findings with the rule's source version.
   - Prompt-injection heuristic: lines that look like instructions to an AI -> `review_needed`.
4. **Explanation (Gemini, optional)**: turns each code-made finding into a short plain-language sentence and a suggested fix. The explanation never changes status. If the call fails, use the template text in AI_PROMPTS.md.
5. Save claims, findings, and a draft state. Reviewer decision happens separately.

## Clearance and revalidation
- Approve: in one transaction create `clearances` and one `clearance_dependencies` row per confirmed claim-source link (and per term rule/guideline version used).
- Source change (new version, withdraw, expire): in one transaction mark old version status, then select clearances with a dependency on that source_version_id and link_status `confirmed` and clearance state `current`; set them `revalidation_required` and insert `revalidation_items` with a reason and old/new values. Write audit rows.

## Environment variables (.env.example)
```
DATABASE_URL=
GEMINI_API_KEY=
GEMINI_MODEL=            # verify the current Flash model id in AI Studio
APP_BASE_URL=
RATE_LIMIT_ANALYZE_PER_HOUR=20
```

## Deployment
- Vercel project linked to the GitHub repo; set env vars; `maxDuration = 60` on the analyze route.
- Serverless body limit about 4.5 MB: keep uploads at or under 4 MB.
- Use a pooled connection string for the database (serverless).
- After each block: push, open the Vercel URL in incognito, run the 5-step demo.

## Fallbacks
| Failure | Behaviour |
|---------|-----------|
| Gemini error or quota | Deterministic-only findings; banner "AI explanation unavailable"; claims from simple regex extraction for price/percent/day counts |
| DB cloning too slow | Single shared workspace + Reset |
| Image extraction fails | Message "Could not read text from this image. Paste the text instead." |
| PDF has no text layer | Same message as above |
