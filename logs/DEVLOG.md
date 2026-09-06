# DEVLOG — Asasa gold trading assessment

Chronological engineering log. Newest at the bottom. Entries are appended with `scripts/devlog/note.sh`.
Companion machine logs live in `logs/agent/` and full transcripts in `logs/transcripts/` (see `logs/README.md`).

### 2026-09-06 17:00 PKT — Session 1: read brief, research, plan
- Read the one-page brief (PDF → text with pypdf in a throwaway venv; `pdftoppm`/`pdftotext` aren't installed on this Mac — dead end #1).
- **Price sources.** `www.pakgold.pk` has no API and its server HTML contains only "Rs. --" placeholders; the numbers are computed in-browser from `api.gold-api.com/price/XAU` × `open.er-api.com/v6/latest/USD` ÷ 31.1035 (plus cosmetic random jitter). Both upstreams are keyless and fast. Decision: reproduce PakGold's formula server-side as the primary adapter and label it as spot-derived.
- `data-asg.goldprice.org/dbXRates/PKR` returns 403 to plain curl/Node user agents (dead end #2) but 200 with browser-like `User-Agent`/`Accept` headers. Returns PKR per troy ounce (`xauPrice`). Fallback adapter.
- **"Seek and you shall find."** myasasa.com is a Vite/React app; its gold-rates page calls `https://api.myasasa.com/api/v1/market/retail-gold-rate` (no auth, 60/min) which returns per-gram/per-tola 24K rates with `source_updated_at` and `is_stale` — a ready-made model for our normalized price object and trust copy. Its source is `gold.pk` (Karachi Sarafa rate, server-rendered with timestamp). Today: sarafa 39,138 vs spot ≈39,539 PKR/g.
- Pulled Asasa's design tokens from their CSS (Geist + Inter, forest `#0D4A46`, green `#8CCB50`, grey `#F9FAFA`, ink `#0F1410`, radii, shadows) → `docs/asasa-design-tokens.md`.
- **Accounts.** Vercel CLI has a personal scope (`samie-ahmads-projects`). Supabase CLI only sees 8x orgs → need a personal Supabase project before phase 0. `gh` not installed; no pnpm/bun → npm.
- Wrote `PLAN.md` and installed this logging harness (`.claude/settings.json` hooks → `logs/agent/*.jsonl`, `scripts/devlog/*`). No app code yet; waiting on UI direction and a personal Supabase project.

### 2026-09-06 17:42 PKT
**Stack change: Neon, not Supabase.** Samie supplied a Neon connection string in `.env` as `DB_CONNECTION` instead of creating a personal Supabase project. Verified: Postgres 18.6, db `neondb`, role `neondb_owner` with CREATE privilege, ap-southeast-1. Plan updated — data layer moves from supabase-js/service-role to node-postgres over `DATABASE_URL`; schema, functions and every invariant carry over unchanged since it was plain Postgres anyway.
- **Pooler caveat caught early:** the string points at the `-pooler` endpoint (PgBouncer transaction mode), where session-scoped `pg_try_advisory_lock` can leak across unrelated clients. Switched the price-refresh guard to transaction-scoped `pg_advisory_xact_lock`, and migrations will run against the direct (non-pooled) host.
- `.env` confirmed gitignored. Sourcing it with `set -a; . ./.env` failed silently because the URL contains an unquoted `&` (dead end #3) — parsing the key explicitly instead.
- Repo confirmed live at github.com/samiemirza/asasa-assessment. `gh` still not installed.
- **Answered the platform question: responsive web app, mobile-first — not a native app.** The brief wants a public URL that opens with no credentials, and lists mobile as a first-class surface, which is a phone-shaped web build. Recorded as decision #1 in PLAN.md.
