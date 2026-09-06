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

**Home.** A read-only dashboard: the 24K price per gram with the change since the day's first reading, buy and sell prices, when it was updated and from which source; cash and gold balances (gold with its approximate PKR value at the sell price); Buy gold and Sell gold as the two primary actions; and a Market section with the price over recent checks and both source readings (or their errors, so an outage is visible without leaving the page). Platform inventory is not a customer concern, so it stays off the dashboard; the Buy flow shows how much the platform has available, and every receipt shows the inventory movement. When the guardrail binds, the Buy price tile says so. When pricing is paused the card says why and both actions are disabled.

**Buy and Sell.** A near full-screen sheet, visually separate from the dashboard, in three steps. Amount: you pay or you sell with a PKR or grams unit switch, the available balance, Max, the estimated other side, the rate, fees (none, the spread is in the rate) and the total. Review: the 75 second server-locked quote with a countdown ring driven by the server's `expires_at` and a clock offset, amount paid, gold received, rate, fees and final total. Confirm: a PIN pad (demo PIN 1234) or Face ID and Touch ID through WebAuthn platform authenticators, then settlement and the receipt. On expiry the ring hits zero, the sheet shows the old locked price beside the price now, and the only action is "Get a new quote". Nothing is ever re-priced silently.

**Receipt.** Amount, price, market rate and source at execution, receipt and quote ids, and the three balances after the trade with their deltas. Receipts are immutable and reopenable from History.

**Wallet.** Portfolio value (gold at the sell price plus cash) and payout accounts for withdrawals: the seeded Meezan Bank account and an Add Account form (validated Pakistani IBAN, kept in the browser only).

**Transactions.** Every trade grouped by month, newest first, each row opening its receipt.

**Profile.** A dummy account screen in the same visual system: identity card, personal details, notification and security preferences.

**Reviewer endpoint, no admin panel.** The brief puts admin panels out of scope but asks that reviewers can try the stress cases, including the guardrail, without changing code. I first built a Demo tab for this, then removed it on the product owner's direction; the scenario flags stayed as a small `POST /api/demo` endpoint documented in the README with curl commands. Fallbacks need no flags to work, they are automatic.

**Server.** Postgres owns the invariants: balances have `>= 0` checks, `trades.quote_id` is unique, `confirm_quote(uuid)` does the whole settlement in one transaction with row locks and returns the existing trade on a repeat call, and a ledger records every balance movement so before and after always reconcile. Upstream refresh is guarded by a transaction-scoped advisory lock so concurrent requests wait for one fetch rather than each calling upstream.

**Reviewer checklist for the stress cases.** Each can be tried on the deployed link without code changes. Insufficient cash, gold or inventory: type an amount above the balance (or tap Max and add more), the sheet names the binding constraint and the most you can do; the same checks run again atomically at confirm. Quote expiry: wait out the 75 seconds on the review step, or shorten the lock with the reviewer endpoint, then use "Get a new quote". Confirm pressed twice: the PIN step disables itself while settling, and the API returns the same trade on any repeat (the smoke script fires two confirms in parallel). Source outage, both sources down, stale pricing and the guardrail: the curl commands in the README flip server-side flags; the Home card, the Market section and the sheet all reflect the state within one request.

**Tests.** 20 unit tests for money math, adapter parsing and freshness rules. A 36 check end-to-end smoke script that runs against local or production and covers a parallel double confirm, an overlapping-sell race, expiry, all three shortfalls, guardrail binding, primary outage, both sources down, forced stale, and reset.

## Key decisions

1. **Server owns the quote, the client only carries its id.** Confirm takes nothing price related from the browser. Double clicks, double tabs and retries after a timeout all resolve to the same trade because the SQL function is idempotent and the unique constraint is the backstop.
2. **Transaction-scoped advisory lock, not session-scoped.** The Neon connection string points at the pooled endpoint (PgBouncer, transaction mode). A session-scoped `pg_try_advisory_lock` there can leak onto an unrelated client. `pg_advisory_xact_lock` releases with the transaction.
3. **Three freshness tiers.** Live (latest attempt succeeded inside the window), last good price (latest attempt failed, the last good price is under 15 minutes old and stays tradable with its age shown), paused (nothing trustworthy, no quotes issued). The dashboard card and the Market section show the same tier.
4. **PKR entry rounds grams down.** When a user types PKR, grams are floored to 4 dp and the PKR actually charged is re-derived, so nobody is charged more than they typed. Grams entry rounds PKR to 2 dp.
5. **Report the tightest constraint.** With the seed numbers, 10 g of inventory costs about PKR 435,000, so cash can never be the only thing blocking a buy. The quote pre-check reports whichever constraint binds first and tells the user the maximum they can do, and the same checks run again atomically at confirm. Cash-first shortfalls become reachable when the guardrail raises the buy price.
6. **Both sources are polled each refresh, primary wins.** That costs one extra request every five minutes and buys a cross-source deviation check (over 5% shows a notice) and an honest fallback reading in the Market section even when it is not in use.
7. **One font, no dead links.** Geist only. The dashboard has exactly two actions, Buy and Sell; every step inside the sheet has one. Navigation is the header back control, the sheet's close control and the tab bar.
8. **The confirmation gate is real on the device, not on the server.** The PIN is a demo constant and the biometric check is a WebAuthn platform-authenticator gesture whose assertion is not verified server side, because there are no accounts. It shows the intended UX; a real system would verify the assertion against a registered credential before settling.

## Known gaps

- "PakGold" is PakGold's published spot formula reproduced server side, not a feed from pakgold.pk, because the site has no API and its HTML carries no numbers.
- The reviewer endpoint is unauthenticated by requirement. A real system would gate it, and a real system would not let a client change the guardrail.
- Single user, single currency, no auth, no fees or taxes, no partial fills, no withdrawals (the Wallet's payout accounts are illustrative).
- The refresh log lives in the database and the API, not in the UI. The Market section shows the latest check and its errors; earlier checks are visible through `price_snapshots` or the smoke script's output.
- Upstream feeds are third parties with no SLA. If both are unreachable for 15 minutes the product pauses, which is the intended behaviour, but a production system would want more than two sources and alerting.
- The PIN and biometric gate is device-local UX, not server-enforced authorisation (see decision 8).
- Times are shown in Pakistan time regardless of the viewer's location, a deliberate choice for a PKR product and to keep server and client rendering identical.
- The refresh window is enforced per database, which is correct for one deployment. Multiple regions sharing one database would still refresh at most once per window because the lock and the snapshot live in Postgres.

## Build record

- `logs/DEVLOG.md`: the narrative, including dead ends (ports and CLIs that were not installed, the pooler lock caveat, the unquoted `&` in `.env`, the vitest ESM config, wrong hand-computed test constants, headless Chrome's minimum window width, GoldPrice.org's 403s and what finally unlocked them).
- `logs/agent/*.jsonl`: every prompt, tool call and result, captured by Claude Code hooks with secrets redacted.
- `logs/transcripts/`: exported Claude Code session transcripts.
