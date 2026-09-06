# What I did

## How I read the assignment

The brief asks for a small, finished, trustworthy product rather than a big one: a reviewer opens a public link, understands three balances, sees a live 24K PKR per gram rate with its source and freshness, enters PKR or grams, gets a 75 second locked quote owned by the server, confirms exactly once, and lands on a receipt with updated balances. Around that core it lists the ways the world goes wrong (a source stops answering, a quote expires, a balance runs short, confirm is pressed twice) and asks the product to keep telling the truth in each case, with every case reproducible from the deployed link without touching code.

I treated the safety cases as the real deliverable and the screens as the way to make them legible. Anything the brief left open I resolved in favour of the reviewer's journey.

The hint "seek and you shall find" led me to `api.myasasa.com/api/v1/market/retail-gold-rate`, the endpoint the real Asasa app uses for its market reference rate. I did not use it as a price source, but I borrowed its shape (per gram, source, `source_updated_at`, a stale flag) and its trust copy for the normalised price object here.

## Assumptions

- **Responsive web app, phone first, not a native app.** The brief wants a URL that opens with no credentials and calls mobile a first-class surface. Designed at 390 px; on wider screens the same app renders as a phone-width frame on a pale ground, echoing the UI direction I was given.
- **One customer, one platform, PKR only, 24K only.** Seed: PKR 500,000, 5.0000 g customer gold, 10.0000 g platform inventory. Units: PKR to 2 dp, grams to 4 dp, troy ounce = 31.1035 g, tola shown only as information.
- **PakGold has no API.** Its site renders "Rs. --" server side and computes rates in the browser from `api.gold-api.com` (XAU/USD) and `open.er-api.com` (USD/PKR) divided by 31.1035. The primary adapter reproduces that published formula server side and is labelled PakGold. This is stated as a known gap below.
- **GoldPrice.org's data host blocks non-browser clients.** It returns 403 unless the request carries browser-style Referer, Origin and Sec-Fetch headers (verified from Vercel, not just from my laptop). The fallback adapter sends them.
- **A failed check counts as a check.** "No more than once every five minutes" is applied to attempts, not successes, so an outage cannot turn into a retry storm. The one documented exception is a scenario change through the reviewer endpoint, which refreshes at once so the effect is visible immediately.
- **Guardrail default PKR 30,000 per gram**, deliberately below market x 1.10 so it does not bind until a reviewer raises it.

## What I built

**Trade.** Price hero (rate, buy and sell prices, source, refreshed and next check), three balance cards, buy or sell toggle, one amount field with a PKR or grams unit switch, live conversion line with the maximum you can do, one button: "Get 75 second quote". When pricing is paused the hero says why and the button is disabled.

**Review.** Countdown ring driven by the server's `expires_at` and a server clock offset, so a wrong device clock cannot extend a lock. Locked price, market rate and source, spread, quote id. One button: confirm. On expiry the ring hits zero, the card shows the old locked price beside the price now, and the only button becomes "Get a new quote". Nothing is ever re-priced silently.

**Receipt.** Amount, price, market rate and source at execution, receipt and quote ids, and the three balances after the trade with their deltas. Receipts are immutable and reopenable from History.

**Status.** Selected source, refreshed and next check, both source readings or their errors, cross-source deviation, the pricing rule with the guardrail state, and the last ten refresh attempts.

**Profile.** A dummy account screen in the same visual system: identity card, live portfolio value (gold at today's sell price plus cash), personal details, payout bank account, notification and security preferences.

**Reviewer endpoint, no admin panel.** The brief puts admin panels out of scope but asks that reviewers can try the stress cases, including the guardrail, without changing code. I first built a Demo tab for this, then removed it on the product owner's direction; the scenario flags stayed as a small `POST /api/demo` endpoint documented in the README with curl commands. Fallbacks need no flags to work, they are automatic.

**Server.** Postgres owns the invariants: balances have `>= 0` checks, `trades.quote_id` is unique, `confirm_quote(uuid)` does the whole settlement in one transaction with row locks and returns the existing trade on a repeat call, and a ledger records every balance movement so before and after always reconcile. Upstream refresh is guarded by a transaction-scoped advisory lock so concurrent requests wait for one fetch rather than each calling upstream.

**Tests.** 20 unit tests for money math, adapter parsing and freshness rules. A 36 check end-to-end smoke script that runs against local or production and covers a parallel double confirm, an overlapping-sell race, expiry, all three shortfalls, guardrail binding, primary outage, both sources down, forced stale, and reset.

## Key decisions

1. **Server owns the quote, the client only carries its id.** Confirm takes nothing price related from the browser. Double clicks, double tabs and retries after a timeout all resolve to the same trade because the SQL function is idempotent and the unique constraint is the backstop.
2. **Transaction-scoped advisory lock, not session-scoped.** The Neon connection string points at the pooled endpoint (PgBouncer, transaction mode). A session-scoped `pg_try_advisory_lock` there can leak onto an unrelated client. `pg_advisory_xact_lock` releases with the transaction.
3. **Three freshness tiers.** Live (latest attempt succeeded inside the window), last good price (latest attempt failed, the last good price is under 15 minutes old and stays tradable with its age shown), paused (nothing trustworthy, no quotes issued). The status pill, the hero and the Status tab all show the same tier.
4. **PKR entry rounds grams down.** When a user types PKR, grams are floored to 4 dp and the PKR actually charged is re-derived, so nobody is charged more than they typed. Grams entry rounds PKR to 2 dp.
5. **Report the tightest constraint.** With the seed numbers, 10 g of inventory costs about PKR 435,000, so cash can never be the only thing blocking a buy. The quote pre-check reports whichever constraint binds first and tells the user the maximum they can do, and the same checks run again atomically at confirm. Cash-first shortfalls become reachable when the guardrail raises the buy price.
6. **Both sources are polled each refresh, primary wins.** That costs one extra request every five minutes and buys a cross-source deviation check (over 5% shows a notice) and an honest fallback reading on the Status tab even when it is not in use.
7. **One font, one action per screen.** Geist only. Every screen has at most one primary button; navigation is the header back control and the tab bar. No dead links.

## Known gaps

- "PakGold" is PakGold's published spot formula reproduced server side, not a feed from pakgold.pk, because the site has no API and its HTML carries no numbers.
- The reviewer endpoint is unauthenticated by requirement. A real system would gate it, and a real system would not let a client change the guardrail.
- Single user, single currency, no auth, no fees or taxes, no partial fills, no price chart beyond a small sparkline once enough history exists.
- Upstream feeds are third parties with no SLA. If both are unreachable for 15 minutes the product pauses, which is the intended behaviour, but a production system would want more than two sources and alerting.
- Times are shown in Pakistan time regardless of the viewer's location, a deliberate choice for a PKR product and to keep server and client rendering identical.
- The refresh window is enforced per database, which is correct for one deployment. Multiple regions sharing one database would still refresh at most once per window because the lock and the snapshot live in Postgres.

## Build record

- `logs/DEVLOG.md`: the narrative, including dead ends (ports and CLIs that were not installed, the pooler lock caveat, the unquoted `&` in `.env`, the vitest ESM config, wrong hand-computed test constants, headless Chrome's minimum window width, GoldPrice.org's 403s and what finally unlocked them).
- `logs/agent/*.jsonl`: every prompt, tool call and result, captured by Claude Code hooks with secrets redacted.
- `logs/transcripts/`: exported Claude Code session transcripts.
