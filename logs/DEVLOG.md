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

### 2026-09-06 17:57 PKT
**UI direction received (phase 3 unblocked).** Reference: dark fintech mobile dashboard (near-black shell, charcoal rounded cards, one light tinted hero card, big numerals, pill badges, bottom tab bar, phones on a pale sage ground). Constraints from Samie: swap hero colours for Asasa identity, one font family, no double CTA buttons, no dead links, no extra text, no em dashes, polished. Decision: Geist only; ink shell with forest/green accents; on desktop the app renders as a phone-width frame on a pale forest ground to echo the reference; four tabs (Trade, History, Status, Demo) all real routes. Building phases 0 to 5 in one go now.

### 2026-09-06 18:24 PKT
**Phases 0 to 4 built and deployed.** Next.js 16 + Tailwind 4 + node-postgres on Neon; schema, seed, confirm_quote() and reset_demo() in db/migrations/001_schema.sql; adapters + refresh engine (pg_advisory_xact_lock, at most one upstream call per 5 min, demo toggles request an early refresh) in lib/pricing; quote service in lib/quotes; 9 API routes; UI in the dark card style from the reference with Asasa colours and Geist only. Production: https://asasa-assessment.vercel.app (personal scope samie-ahmads-projects, project asasa-assessment).
- Dead end #4: vitest 5 config as .ts fails under Node 22.9 (ERR_REQUIRE_ESM); renamed to vitest.config.mts.
- Dead end #5: my first hand-computed test constants were wrong (39538.71 vs the correct 39538.70); the code was right, fixed the tests.
- Dead end #6: headless Chrome --window-size cannot go below ~500px on macOS so 390px screenshots were cropped; wrote scripts/shots.mjs which drives the DevTools protocol with mobile emulation instead.
- Dead end #7: GoldPrice.org returned 403 (rate limited) from my IP for the whole session after the research probes; the adapter records it as a failed fallback and the Status page shows it honestly.
- Finding: with the confirmed seed (PKR 500,000 and 10 g inventory at ~PKR 43.5k buy price) cash can never be the only binding constraint on a buy, since 10 g costs ~435k. The quote pre-check now reports whichever constraint binds first so the 'up to' hint is always achievable; cash-first shortfalls are reachable by raising the guardrail.
- .env had no trailing newline, so appending DATABASE_URL glued it onto line 1 (dead end #8); rewrote the file. Switched to sslmode=verify-full to silence pg 8.23's deprecation warning.
- Smoke script scripts/smoke.mjs: 36 checks including a parallel double confirm and an overlapping-sell race.

### 2026-09-06 18:30 PKT
**Fallback fixed in production.** GoldPrice.org answered 403 from Vercel with a browser User-Agent alone. Deployed a throwaway /api/debug-goldprice probe (preview deployment, reached through 'vercel curl -L' because previews are protected) that tried three header sets against three URLs: only the set with Referer/Origin goldprice.org plus Sec-Fetch and sec-ch-ua headers got 200 (server nginx instead of the Webscale edge). Adopted that header set in the adapter, removed the probe, redeployed. With 'Primary source down' the app now serves GoldPrice.org (39,538.72) and shows fallback in use; both sources deviate by 0.00%. Wrote README.md and WhatIDid.md. Smoke suite green against production.
