# Asasa Gold

A single-user demo for buying and selling 24K gold in PKR at a live market rate, with a 75 second server-locked quote and once-only settlement. Built for the Asasa founding engineer assessment.

**Live:** https://asasa-assessment.vercel.app (opens without credentials, phone first)

- What I understood, decided and left out: [WhatIDid.md](./WhatIDid.md)
- Build plan: [PLAN.md](./PLAN.md)
- Build record: [logs/](./logs) (narrative devlog, hook logs, exported Claude Code transcripts)

## Stack

Next.js 16 (App Router, TypeScript, Tailwind 4) on Vercel, Neon Postgres via node-postgres. No auth by design. All database access is server side.

## Run it locally

Requirements: Node 22+, npm, a Postgres database (Neon is what the deployment uses).

```bash
git clone https://github.com/samiemirza/asasa-assessment.git
cd asasa-assessment
npm install
cp .env.example .env        # fill in DATABASE_URL and DATABASE_URL_UNPOOLED
npm run db:migrate          # creates tables, functions, and the seed row
npm run dev                 # http://localhost:3000
```

Seed balances: PKR 500,000 in the wallet, 5.0000 g customer gold, 10.0000 g platform inventory.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (money math, adapters, freshness rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply `db/migrations/*.sql` against `DATABASE_URL_UNPOOLED` |
| `npm run db:reset` | Restore seed balances, clear trades and quotes, default demo settings |
| `npm run smoke -- <url>` | End-to-end checks against a running deployment (36 checks, includes a parallel double confirm) |
| `node scripts/shots.mjs <dir> <url> <paths...>` | Phone-viewport screenshots through headless Chrome |

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon connection string, used by the app |
| `DATABASE_URL_UNPOOLED` | Direct connection string, used by migrations |
| `PRICE_REFRESH_SECONDS` | Upstream refresh window, default 300 |
| `PRICE_STALE_CAP_SECONDS` | Age after which the last good price stops being tradable, default 900 |
| `BUY_MARKUP` / `SELL_MARKDOWN` | Spread multipliers, default 1.10 and 0.90 |

The guardrail floor and the quote lock duration live in the database (`demo_settings`). There is no admin panel in the product, but reviewers can drive the stress cases from the deployed link with a few curl commands:

```bash
BASE=https://asasa-assessment.vercel.app
curl -X POST $BASE/api/demo -H 'content-type: application/json' -d '{"primaryDown":true}'    # PakGold stops answering, GoldPrice.org takes over
curl -X POST $BASE/api/demo -H 'content-type: application/json' -d '{"primaryDown":true,"fallbackDown":true}'   # both down, last good price served then paused after 15 min
curl -X POST $BASE/api/demo -H 'content-type: application/json' -d '{"forceStale":true}'    # pause trading immediately
curl -X POST $BASE/api/demo -H 'content-type: application/json' -d '{"buyFloorPkrPerG":60000}'   # guardrail binds, quotes show the badge
curl -X POST $BASE/api/demo -H 'content-type: application/json' -d '{"quoteTtlSeconds":10}'   # watch a quote expire quickly
curl -X POST $BASE/api/demo/reset    # seed balances, clear history, default settings
```

Expired quotes, double confirms and every balance shortfall need no flags at all.

## How it is put together

```
app/(tabs)/            Trade, History, Status, Profile screens
app/quote/[id]         Review a locked quote (countdown, confirm, expiry)
app/trade/[id]         Receipt with before and after balances
app/api/*              JSON route handlers (see below)
lib/pricing/           adapters (PakGold, GoldPrice.org), refresh engine, freshness rules
lib/quotes/            quote creation and confirmation service
lib/money.ts           rounding, spread, PKR to gram conversion (unit tested)
db/migrations/         schema, invariants, seed, confirm_quote() and reset_demo()
scripts/               migrate, smoke test, screenshots, devlog harness
```

### API

| Method and path | Purpose |
|---|---|
| `GET /api/price` | Normalised market rate, buy and sell prices, source, freshness, next refresh |
| `GET /api/balances` | Wallet, customer gold, platform inventory |
| `POST /api/quotes` | `{side, mode, amount}` creates a locked quote, expiry computed by Postgres |
| `GET /api/quotes/:id` | Quote with server-computed seconds left |
| `POST /api/quotes/:id/confirm` | Settles once; repeat calls return the same trade |
| `GET /api/trades`, `GET /api/trades/:id` | History and receipts |
| `GET/POST /api/demo`, `POST /api/demo/reset` | Reviewer scenario flags and reset (no UI, see above) |

Errors come back as `{ error: { code, message, details } }` with codes such as `QUOTE_EXPIRED`, `INSUFFICIENT_CASH`, `INSUFFICIENT_GOLD`, `INSUFFICIENT_INVENTORY`, `PRICING_UNAVAILABLE`.

## Deploy

The production deployment is driven from the CLI in the personal Vercel scope:

```bash
vercel link --project asasa-assessment
vercel env add DATABASE_URL production
vercel env add DATABASE_URL_UNPOOLED production
vercel deploy --prod
npm run smoke -- https://asasa-assessment.vercel.app
```

Deployment protection is left off for production so the link opens without a Vercel login.
