# Asasa Founding Engineer Assessment — Build Plan

**Status:** original plan, kept as written for the build record. The product evolved after the UI direction arrived (read-only dashboard, Buy and Sell sheet with PIN or biometric confirm, Wallet tab, no Demo tab); [WhatIDid.md](./WhatIDid.md) describes what shipped. · **Owner:** Samie Ahmad (personal accounts) · **Written:** 2026-09-06
**Brief:** [Asasa - Founding Engineer Assessment.pdf](./Asasa%20-%20Founding%20Engineer%20Assessment.pdf) · extracted text in [docs/brief.txt](./docs/brief.txt)

---

## 1. What we are building

A deployable, single-user demo for buying and selling 24K gold in PKR using live market data. A reviewer opens the URL with no credentials, sees three balances (PKR wallet, customer gold, platform inventory), sees the live 24K rate with its source and freshness, enters an amount in PKR or grams, gets a **75-second server-owned locked quote**, confirms **exactly once**, and lands on a receipt with updated balances.

Reviewer journey the brief draws: **See price + freshness → Enter PKR or gold → Review 75-sec lock → Confirm (settle once) → Complete (balances + receipt).**

Evaluation axes: completion of brief · technical judgment & safety · correctness & detail · product thinking & visual craft.

---

## 2. Research findings (what I actually verified today)

### 2.1 Price sources

| Source | What I found | Verdict |
|---|---|---|
| **PakGold** (`www.pakgold.pk`) | WordPress site. Server HTML has **no numbers** ("Rs. --" placeholders). Rates are computed in the browser as `gold-api.com XAU/USD × open.er-api.com USD→PKR ÷ 31.1035` (I read the inline scripts; it even adds random ±0.1% "tick" jitter for effect). Both upstreams are keyless, JSON, and answered instantly (XAU $4,431.10 · USD/PKR 277.55). | Primary adapter = **PakGold's published formula run server-side** from the same two feeds. Labeled honestly as "PakGold (spot-derived)". |
| **GoldPrice.org** | `https://data-asg.goldprice.org/dbXRates/PKR` returns `{items:[{curr:"PKR", xauPrice: <PKR per troy oz>, ...}], ts}`. **403 for plain/Node user agents**; 200 with browser-style `User-Agent` + `Accept`. Today: 1,229,792 PKR/oz → 39,539 PKR/g. | Fallback adapter. Must send browser-like headers; treat 403 as "source down". |
| **gold.pk** (Karachi Sarafa rate) | Server-rendered, carries its own timestamp ("As on Sun, Sep 06 2026, 13:00 PST", source "Karachi Saraf Jewellers Association"). 24K = 39,138 PKR/g today. | Optional third adapter / cross-check only. Not in core scope. |
| **Asasa's own API** (the "seek and you shall find" hint) | `GET https://api.myasasa.com/api/v1/market/retail-gold-rate` → `{source:"gold.pk", per_gram:{"24k":39138,...}, per_tola:{...}, source_updated_at, fetched_at, is_stale}`. No auth, 60 req/min rate limit. This is the shape Asasa itself uses for a "market reference rate" with freshness + stale flag. | Use its **response shape and copy** as the model for our normalized price object. Mention in WhatIDid.md. |

Sanity band across sources today: sarafa 39,138 vs spot 39,539 PKR/g (≈1% apart). I will use a ±5% cross-source deviation check as an extra trust signal when both sources respond.

### 2.2 Asasa design system (pulled from `myasasa.com` CSS/JS, saved to [docs/asasa-design-tokens.md](./docs/asasa-design-tokens.md))

- Stack they use: React + Radix + Tailwind. Fonts: **Geist** (display/numbers) + **Inter** (body).
- Palette: forest `#0D4A46`, forest-darker `#0A2E2B`, green `#8CCB50`, green-deep `#4B8C22`, green-on-dark `#ACDF6F`, grey `#F9FAFA`, stone `#F5F3F2`, ink `#0F1410`, hairline `#E8E8E6`, muted `#9A9A9A`, red `#E05555`. Matches the four hex codes in the brief.
- Radii 6/8/10/14/18/24/pill; soft forest-tinted shadows; tight tracking on headings.
- Copy pattern worth echoing: *"This is the live market reference rate. Asasa's in-app buy and sell prices could be different and are always shown before you confirm."* and Live / Indicative / Fetching states with a pulse dot.

### 2.3 Accounts and tooling (your machine)

| Item | State | Action needed |
|---|---|---|
| Vercel CLI | logged in as `samiemirza`; personal scope **`samie-ahmads-projects`** exists (plus `8x-plays`) | Deploy to the personal scope only. Upgrade CLI (`npm i -g vercel@latest`, currently 58.9.1). |
| **Neon Postgres** | ✅ provided by you in `.env` as `DB_CONNECTION`. Verified 2026-09-06: Postgres **18.6**, db `neondb`, role `neondb_owner` (can create schema), region `ap-southeast-1`, **pooled** endpoint (`-pooler`). Direct (unpooled) host also reachable. | None. `.env` is already gitignored. See the pooler caveat in the decisions below. |
| GitHub | repo created: **github.com/samiemirza/asasa-assessment** (reachable) | `gh` CLI not installed. Either `brew install gh && gh auth login`, or confirm HTTPS push works with your stored credentials. |
| Node / npm | v22.9 / 10.8 (no pnpm, no bun) | Use npm. |
| Git | identity is `26100083@lums.edu.pk` globally | I will set a repo-local identity if you want a different email on this project. |
| Docker, psql 18 | present | `psql` is how I'll run migrations and verify invariants against Neon directly. Docker not needed. |

---

## 3. Decisions and assumptions

1. **Platform: a responsive web app, mobile-first — not a native mobile app.** The brief asks for a *public deployed product that opens without reviewer credentials*, and separately says to *treat mobile as a first-class surface*. That is a phone-shaped web experience, not TestFlight or an APK. Build at 390px first, scale up to desktop.
2. **Stack:** Next.js (App Router, TypeScript) on Vercel + **Neon Postgres** (your `DB_CONNECTION`). No auth (out of scope). All DB access is **server-side only** inside route handlers; the connection string is never exposed to the client and no `NEXT_PUBLIC_` database variable exists. Vercel Fluid Compute (default Node runtime), no edge runtime.
3. **One customer, one platform.** Seed rows: wallet **PKR 500,000**, holdings **5.0000 g**, inventory **10.0000 g**. Chosen so every shortfall is reachable without an admin panel: spending all cash buys ≈11.6 g > 10 g inventory (inventory short); buying with > 500,000 (cash short); selling > 5 g (gold short).
4. **Units & rounding:** market reference is **PKR per gram, 24K**. Gold stored as `numeric(14,4)` grams, PKR as `numeric(14,2)`. Troy oz = 31.1035 g. Tola (11.6638 g) shown as secondary info only. When the user enters PKR we compute grams rounded **down** to 4 dp and re-derive the PKR they actually pay (never more than entered). When the user enters grams we compute PKR rounded to 2 dp.
5. **Pricing (from the brief):** customer buy = `max(market × 1.10, guardrail)`; customer sell = `market × 0.90`. Guardrail is a configured floor (`BUY_FLOOR_PKR_PER_GRAM`) that the reviewer can raise from the Demo controls to see it bind. The quote displays a "Guardrail applied" badge when it does.
6. **Refresh rule:** the server fetches upstream **at most once per 5 minutes**, lazily on request, guarded by a **transaction-scoped** advisory lock (`pg_advisory_xact_lock`) so concurrent requests don't stampede. Transaction-scoped matters here: the supplied endpoint is Neon's **pooled** one (PgBouncer transaction mode), where a session-scoped `pg_try_advisory_lock` can outlive the request and leak onto an unrelated client. Migrations run against the **direct** endpoint (same host without `-pooler`), which I verified is reachable. No Vercel cron needed.
7. **Freshness tiers:** `fresh` (≤5 min) → `aging` (5–15 min, last good price still served and clearly labeled "last good price, N min ago") → `paused` (>15 min or no snapshot at all): trading disabled with an explanation. Quotes can only be issued in `fresh`/`aging`.
8. **The server owns the quote.** `expires_at = created_at + 75s` computed in Postgres. The client countdown is derived from `expires_at` minus a server-time offset returned with the quote, so clock skew can't lie. Expired means expired: no grace, no silent re-price. The expiry screen shows the new price next to the old one and a one-tap "Get a new quote".
9. **Confirm is idempotent.** A single Postgres function `confirm_quote(quote_id)` runs in one transaction: `SELECT … FOR UPDATE` on the quote and the three balance rows → if already filled, return the existing trade (success, not error) → check expiry → check cash/gold/inventory → write trade + ledger → mark filled. `trades.quote_id` is UNIQUE as a belt-and-braces guarantee. Double-click, double-tab, and retry-after-timeout all yield one trade.
10. **Demo controls, not an admin panel.** A small "Demo controls" sheet (reviewer-facing, documented) toggles server-side scenario flags stored in a `demo_settings` row: simulate primary down, simulate fallback down, simulate stale pricing, override quote TTL (e.g. 10 s to watch expiry quickly), set the buy guardrail, reset balances. Changing a scenario invalidates the current snapshot so the effect is visible immediately; this is the only path that can trigger an upstream fetch inside the 5-minute window, and it is documented as such.
11. **Truth over polish.** Every price surface shows: selected source, `fetched_at` relative time, next refresh, and status pill (Live / Last good price / Paused). If the fallback is in use, say so.
12. **Effort budget:** brief expects ~3 h with AI. I plan ~4 h including polish and docs; anything beyond goes to "known gaps".

---

## 4. Architecture

```
Browser (Next.js RSC + small client islands)
   │  fetch /api/*  (JSON, typed error codes)
   ▼
Next.js route handlers on Vercel (Node, Fluid Compute)
   ├─ lib/pricing/   adapters: pakgold.ts, goldprice.ts (+ optional goldpk.ts)
   │                 normalize → PKR/gram 24K; select primary→fallback; sanity band
   ├─ lib/quotes/    create quote (server computes everything), confirm via SQL function
   └─ lib/db.ts      node-postgres Pool over DATABASE_URL (server only, never bundled client-side)
   ▼
Neon Postgres 18.6
   balances · price_snapshots · quotes · trades · ledger_entries · demo_settings
   fn: refresh_lock(), confirm_quote(uuid), reset_demo()
```

Why this shape: the brief's hard parts are all server-side invariants (rate limiting, locked quotes, once-only settlement, consistent balances). Putting them in Postgres transactions/functions makes them provable and lets me test them with `psql`/curl independent of the UI.

---

## 5. Data model (SQL migrations in `db/migrations/`)

```sql
balances        (id smallint pk = 1, pkr numeric(14,2), customer_gold_g numeric(14,4), inventory_gold_g numeric(14,4), updated_at)
price_snapshots (id uuid, source text, market_pkr_per_g numeric(14,2), raw jsonb, fetched_at timestamptz,
                 upstream_ts timestamptz null, fallback_used bool, deviation_pct numeric null, ok bool, error text null)
quotes          (id uuid, side buy|sell, input_mode pkr|gold, pkr numeric(14,2), gold_g numeric(14,4),
                 unit_price numeric(14,2), market_price numeric(14,2), guardrail_applied bool,
                 snapshot_id uuid fk, created_at, expires_at, status locked|filled|expired, filled_trade_id uuid null)
trades          (id uuid, quote_id uuid UNIQUE fk, side, pkr, gold_g, unit_price, market_price, source, executed_at,
                 balances_after jsonb)
ledger_entries  (id bigserial, trade_id fk, account wallet|customer_gold|inventory_gold, delta numeric, balance_after numeric)
demo_settings   (id smallint pk = 1, primary_down bool, fallback_down bool, force_stale bool,
                 quote_ttl_seconds int default 75, buy_floor_pkr_per_g numeric(14,2), updated_at)
```
Invariants enforced in DB: all balances `>= 0` (CHECK), one trade per quote (UNIQUE), quote status transitions only via `confirm_quote`. Ledger lets the receipt show "before → after" for all three balances and lets a reviewer verify consistency: `wallet + Σdeltas` always reconciles.

---

## 6. Pricing engine (`lib/pricing`)

- `PriceAdapter { name, fetch(): Promise<{ pkrPerGram24k, upstreamTs?, raw }> }` with a 4 s timeout each.
- `getMarketPrice()`:
  1. Read latest snapshot. If `fetched_at` < 5 min ago → return it.
  2. Try `pg_try_advisory_lock`; if another request is refreshing, return the last snapshot.
  3. Try primary (unless `primary_down`), then fallback (unless `fallback_down`). Record a snapshot either way (including failures, so the UI can say *why* it paused).
  4. If both responded, compute deviation; if > 5%, flag `deviation_pct` and show an "sources disagree" notice (still serve primary).
- `derivePrices(market, settings)` → `{ buy: max(market*1.10, floor), sell: market*0.90, guardrailApplied }`.
- `freshness(snapshot)` → `fresh | aging | paused` with human strings ("Refreshed 2 min ago · next check in 3 min").
- Unit tests (vitest): normalization from oz→g for both feeds, spread math, guardrail binding, rounding both directions, freshness tiers, adapter failure paths (403, timeout, malformed JSON).

---

## 7. Quote and trade flow

```
POST /api/quotes {side, mode, amount}
  → price = getMarketPrice(); reject if paused (PRICING_UNAVAILABLE)
  → compute pkr/gold both ways; pre-check balances (soft, for a friendly early error)
  → insert quote(status=locked, expires_at = now()+ttl) ; return {quote, server_now}

GET  /api/quotes/:id            → status + seconds_left (server-computed)
POST /api/quotes/:id/confirm    → rpc confirm_quote(id)
     ok:        {trade, balances}                (idempotent on repeat)
     errors:    QUOTE_EXPIRED | INSUFFICIENT_CASH | INSUFFICIENT_GOLD | INSUFFICIENT_INVENTORY | QUOTE_NOT_FOUND
GET  /api/trades/:id            → receipt (immutable)
GET  /api/price                 → normalized price + freshness + derived buy/sell + status
GET  /api/balances
GET/POST /api/demo              → demo_settings + actions {reset}
```
Client state machine for the trade screen: `idle → quoting → reviewing(countdown) → confirming → complete | expired | error`. Confirm button disables on first click and the request carries the quote id only (nothing price-related comes from the client).

---

## 8. Safety matrix (what the reviewer will try)

| Case | Behaviour |
|---|---|
| Primary source stops answering | Fallback used; UI shows "Using GoldPrice.org (fallback)" with its own timestamp. Snapshot records the primary error. |
| Both sources fail, recent snapshot exists | Serve last good price, labeled with age; trading allowed until 15 min. |
| Both fail, nothing trustworthy | Status **Paused**: price area explains, inputs disabled, no quotes issued; auto-retries on next request after the window. |
| Quote expires (75 s) | Countdown hits 0 → review screen locks, shows old vs new price, "Get new quote" CTA. Server rejects confirm with `QUOTE_EXPIRED` even if the client tried. |
| Insufficient cash / gold / inventory | Caught at quote time (friendly, with the max you *can* do) **and** re-checked atomically at confirm. |
| Confirm pressed twice / double tab / retry | One trade. Second call returns the same trade. Receipt URL is stable. |
| Guardrail | Reviewer raises the floor in Demo controls above market×1.10 → next quote shows guardrail price + badge. |
| Bad input | Non-numeric, zero, negative, > 4 dp grams, absurd amounts → inline validation, server re-validates. |
| Sources disagree | Deviation notice; primary still used. |

---

## 9. UI surfaces (to be styled per your UI direction)

1. **Home / Trade** — balances strip (PKR · your gold · platform inventory), price card (rate, source, freshness pill, next refresh), buy/sell toggle, PKR ⇄ gold input with live conversion, "Get quote".
2. **Review** — locked price, exact grams and PKR, spread explanation line, 75 s ring/countdown, Confirm. Expired state inline.
3. **Complete / Receipt** — trade id, time, side, unit price, market price + source at execution, before → after for all three balances, "Trade again".
4. **History** (cheap, useful) — list of trades; receipts reopenable.
5. **Demo controls** — sheet/drawer with scenario toggles, guardrail input, TTL override, reset. Clearly labeled as reviewer tooling.
6. **States**: paused pricing, fallback in use, aging price, empty history, errors.

**Responsive web, not native.** Mobile is first-class: designed at 390px first, single column, sticky primary action, large numerals in Geist, thumb-reachable confirm, nothing that depends on hover. Desktop is the same layout in a wider container. I will wait for your UI direction before building any of this; the API and DB layers do not depend on it.

---

## 10. Repository layout

```
app/                    Next.js App Router (pages + /api route handlers)
lib/pricing/            adapters, normalize, freshness, tests
lib/quotes/             quote + confirm service
lib/db.ts, lib/env.ts   pg Pool + validated env
db/migrations/          schema, functions, seed (applied by an npm script)
scripts/devlog/         logging harness (already in place, see §12)
logs/                   DEVLOG.md, agent JSONL logs, exported transcripts
docs/                   brief.txt, asasa-design-tokens.md, decisions
PLAN.md · README.md · WhatIDid.md · .env.example · vercel.ts
```

---

## 11. Build phases

| # | Phase | Est. | Exit criteria |
|---|---|---|---|
| 0 | **Foundation** — `git init` ✅, Neon verified ✅, scaffold Next.js (TS, Tailwind v4), migrations + seed against Neon, `.env.example`, push to GitHub, first Vercel preview deploy | 30 m | Hello page live on a `*.vercel.app` URL; `select * from balances` returns seed |
| 1 | **Pricing engine** — adapters, normalize, refresh lock, snapshots, `/api/price`, unit tests | 45 m | `curl /api/price` shows source, freshness, buy/sell; killing primary flips to fallback |
| 2 | **Quotes & settlement** — quotes table, `confirm_quote` RPC, `/api/quotes*`, `/api/trades/:id`, double-confirm test via curl | 45 m | Two parallel confirms → one trade; expired quote rejected; balances reconcile |
| 3 | **UI** — after UI direction: trade, review, receipt, history, states, mobile pass | 75–90 m | Reviewer can complete a trade on a phone without guidance |
| 4 | **Demo controls + safety polish** — scenario flags, guardrail, TTL override, reset, error copy | 30 m | Every row of §8 reproducible from the deployed URL |
| 5 | **Docs & submission** — README (setup), WhatIDid.md, export build record, final prod deploy, smoke script | 25 m | Three links ready |

Total ≈ 4 h. I log each phase in [logs/DEVLOG.md](./logs/DEVLOG.md).

---

## 12. Build record & logging harness (already installed)

- `.claude/settings.json` registers hooks so **every prompt, tool call, tool result, and session start/stop** is appended as JSONL under `logs/agent/` with secrets redacted.
- `logs/DEVLOG.md` is the human narrative; `scripts/devlog/note.sh "…"` appends a timestamped entry.
- `scripts/devlog/export-transcript.sh` copies the full Claude Code transcript(s) for this project into `logs/transcripts/` (redacted JSONL + readable Markdown). Run before the final commit so the repo itself is the build record.
- Dead ends stay in, per the brief.

---

## 13. Deployment & environment

```
DATABASE_URL=                      # Neon pooled endpoint (your .env DB_CONNECTION); server only
DATABASE_URL_UNPOOLED=             # same host without `-pooler`; used to run migrations
PRICE_REFRESH_SECONDS=300
PRICE_STALE_CAP_SECONDS=900
QUOTE_TTL_SECONDS=75
BUY_MARKUP=1.10
SELL_MARKDOWN=0.90
BUY_FLOOR_PKR_PER_GRAM=            # default guardrail (e.g. 30000)
PRICE_SOURCE_ORDER=pakgold,goldprice
```
Vercel project under `samie-ahmads-projects`; env set with `vercel env`; production deploy from `main`. **Deployment Protection must be off** so the reviewer's link opens with no credentials.

---

## 14. Deliverables

1. Public GitHub repo (personal) with README setup + `WhatIDid.md` (understanding, assumptions, what was built, key decisions, known gaps).
2. Public production URL on Vercel.
3. Build record: this repo's `logs/` (hook logs + exported transcript), plus the raw transcript file if they want it separately.

---

## 15. What I need from you

1. **UI direction** (you said it's coming). Until then I can complete phases 0–2 entirely.
2. ~~Database~~ ✅ Neon supplied and verified.
3. ~~Seed balances~~ ✅ confirmed: PKR 500,000 · 5 g customer gold · 10 g platform inventory.
4. ~~Repo~~ ✅ github.com/samiemirza/asasa-assessment. Still need either `gh` installed and authed, or confirmation that HTTPS push works with your stored credentials.
5. Confirm the **default guardrail floor** — proposed PKR 30,000/g, deliberately non-binding at today's ~39k market so the reviewer raises it in Demo controls to watch it bind.
6. Confirm the **git author email** for this repo. Your global identity is currently the LUMS address.

---

## 16. Known gaps I will declare up front (unless time allows)

- Single user, single currency, no auth — by design.
- Price history/chart, partial fills, fees/taxes, KYC: out of scope.
- Demo controls are unauthenticated by requirement; a real system would gate them.
- PakGold has no API; "PakGold" pricing is its published spot formula reproduced server-side, not a feed from pakgold.pk itself.
