// End-to-end smoke test against a running deployment.
// Usage: node scripts/smoke.mjs [baseUrl]   (default http://localhost:3000)
// Exercises: price, quote, parallel double confirm, expiry, insufficient balances, source outage, guardrail, reset.
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
let failures = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}
function check(name, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
  if (!cond) failures++;
}
const close = (a, b, eps = 0.0001) => Math.abs(a - b) <= eps;

console.log(`smoke: ${base}`);
await call("POST", "/api/demo/reset");

// 1. price
const price = (await call("GET", "/api/price")).json;
check("price is live with a source", price.status === "live" && !!price.source, `${price.sourceLabel} ${price.market} PKR/g`);
check("buy = market x 1.10 (guardrail off)", close(price.buy, Math.round(price.market * 1.1 * 100) / 100, 0.01) && !price.guardrailApplied);
check("sell = market x 0.90", close(price.sell, Math.round(price.market * 0.9 * 100) / 100, 0.01));

// 2. quote in PKR, then confirm twice in parallel
const b0 = (await call("GET", "/api/balances")).json;
const q = await call("POST", "/api/quotes", { side: "buy", mode: "pkr", amount: "50000" });
check("quote created (201)", q.status === 201, `${q.json?.goldG} g for PKR ${q.json?.pkr}`);
check("quote charges no more than typed", q.json.pkr <= 50000 && q.json.pkr > 49990);
check("quote has 75 s lock from server", q.json.ttlSeconds === 75 && q.json.secondsLeft > 70);
const [c1, c2] = await Promise.all([
  call("POST", `/api/quotes/${q.json.id}/confirm`),
  call("POST", `/api/quotes/${q.json.id}/confirm`),
]);
check("both confirms succeed", c1.status === 200 && c2.status === 200);
check("both confirms return the same trade", c1.json.trade.id === c2.json.trade.id);
check("exactly one is marked repeated", [c1.json.repeated, c2.json.repeated].filter(Boolean).length === 1);
const c3 = await call("POST", `/api/quotes/${q.json.id}/confirm`);
check("third confirm is idempotent", c3.status === 200 && c3.json.repeated && c3.json.trade.id === c1.json.trade.id);
const b1 = (await call("GET", "/api/balances")).json;
check("wallet debited once", close(b0.pkr - b1.pkr, q.json.pkr, 0.005), `${b0.pkr} -> ${b1.pkr}`);
check("customer gold credited once", close(b1.customerGoldG - b0.customerGoldG, q.json.goldG));
check("inventory debited once", close(b0.inventoryGoldG - b1.inventoryGoldG, q.json.goldG));
const trades = (await call("GET", "/api/trades")).json.trades;
check("history has exactly one trade", trades.length === 1);
const receipt = (await call("GET", `/api/trades/${c1.json.trade.id}`)).json;
check("receipt before/after reconcile", close(receipt.before.pkr - receipt.after.pkr, receipt.pkr, 0.005));

// 3. sell in grams
const s = await call("POST", "/api/quotes", { side: "sell", mode: "gold", amount: "0.5" });
const sc = await call("POST", `/api/quotes/${s.json.id}/confirm`);
const b2 = (await call("GET", "/api/balances")).json;
check("sell credits wallet at sell price", sc.status === 200 && close(b2.pkr - b1.pkr, Math.round(0.5 * price.sell * 100) / 100, 0.005));
check("sell moves gold back to inventory", close(b1.inventoryGoldG + 0.5, b2.inventoryGoldG) && close(b1.customerGoldG - 0.5, b2.customerGoldG));

// 4. insufficient balances at quote time
const big = await call("POST", "/api/quotes", { side: "buy", mode: "pkr", amount: "900000" });
check("oversized buy rejected by the tightest constraint (inventory)", big.status === 409 && big.json.error.code === "INSUFFICIENT_INVENTORY", big.json.error?.details ? `max ${big.json.error.details.maxGold} g` : "");
const inv = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "11" });
check("insufficient inventory rejected", inv.status === 409 && inv.json.error.code === "INSUFFICIENT_INVENTORY");
const gold = await call("POST", "/api/quotes", { side: "sell", mode: "gold", amount: "50" });
check("insufficient gold rejected", gold.status === 409 && gold.json.error.code === "INSUFFICIENT_GOLD");
const bad = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "1.23456" });
check("too many decimals rejected", bad.status === 400);
const junk = await call("POST", "/api/quotes", { side: "buy", mode: "pkr", amount: "-5" });
check("negative rejected", junk.status === 400);

// 5. insufficient balance at confirm time (race between two quotes)
const qa = await call("POST", "/api/quotes", { side: "sell", mode: "gold", amount: "3" });
const qb = await call("POST", "/api/quotes", { side: "sell", mode: "gold", amount: "3" });
const ra = await call("POST", `/api/quotes/${qa.json.id}/confirm`);
const rb = await call("POST", `/api/quotes/${qb.json.id}/confirm`);
check("second overlapping sell rejected at confirm", ra.status === 200 && rb.status === 409 && rb.json.error.code === "INSUFFICIENT_GOLD");

// 6. expiry with a short TTL
await call("POST", "/api/demo", { quoteTtlSeconds: 5 });
const e = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "0.1" });
check("short TTL applied", e.json.ttlSeconds === 5);
await sleep(6500);
const eg = (await call("GET", `/api/quotes/${e.json.id}`)).json;
const ec = await call("POST", `/api/quotes/${e.json.id}/confirm`);
check("expired quote reports expired", eg.status === "expired" && eg.secondsLeft === 0);
check("expired quote cannot be confirmed", ec.status === 409 && ec.json.error.code === "QUOTE_EXPIRED");
await call("POST", "/api/demo", { quoteTtlSeconds: 75 });

// 7. guardrail
await call("POST", "/api/demo", { buyFloorPkrPerG: 60000 });
const gp = (await call("GET", "/api/price")).json;
check("guardrail binds when floor > market x 1.10", gp.guardrailApplied && gp.buy === 60000);
const gq = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "0.1" });
check("quote carries guardrail price", gq.json.guardrailApplied && gq.json.unitPrice === 60000 && gq.json.pkr === 6000);
const cash = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "12" });
check("insufficient cash rejected when cash binds first", cash.status === 409 && cash.json.error.code === "INSUFFICIENT_CASH", cash.json.error?.details ? `max ${cash.json.error.details.maxGold} g` : "");
await call("POST", "/api/demo", { buyFloorPkrPerG: 30000 });

// 8. primary outage -> fallback, both down -> last good, stale -> paused
await call("POST", "/api/demo", { primaryDown: true });
const p1 = (await call("GET", "/api/price")).json;
check("primary down: still tells the truth", p1.primaryError?.includes("Simulated"), `status=${p1.status} source=${p1.source ?? "none"} fallbackError=${p1.fallbackError ?? "none"}`);
if (p1.status === "live") check("primary down: fallback in use", p1.fallbackUsed && p1.source === "goldprice");
else check("primary down and fallback failing: last good price served", p1.status === "last_good" && p1.market > 0);
await call("POST", "/api/demo", { primaryDown: true, fallbackDown: true });
const p2 = (await call("GET", "/api/price")).json;
check("both down: last good price, still tradable", p2.status === "last_good" && p2.market > 0 && p2.lastAttemptOk === false);
await call("POST", "/api/demo", { forceStale: true });
const p3 = (await call("GET", "/api/price")).json;
check("stale: paused with reason", p3.status === "paused" && !!p3.pausedReason && p3.market === null);
const pq = await call("POST", "/api/quotes", { side: "buy", mode: "gold", amount: "0.1" });
check("paused: quotes refused (503)", pq.status === 503 && pq.json.error.code === "PRICING_UNAVAILABLE");
await call("POST", "/api/demo", { primaryDown: false, fallbackDown: false, forceStale: false });
const p4 = (await call("GET", "/api/price")).json;
check("recovered: live again", p4.status === "live");

// 9. reset
const r = await call("POST", "/api/demo/reset");
check("reset restores seed", r.json.balances.pkr === 500000 && r.json.balances.customerGoldG === 5 && r.json.balances.inventoryGoldG === 10);
check("reset clears history", (await call("GET", "/api/trades")).json.trades.length === 0);

console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
