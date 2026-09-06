-- Asasa assessment: schema, invariants, seed, and settlement function.
-- Idempotent: safe to re-run.

create table if not exists balances (
  id                smallint primary key check (id = 1),
  pkr               numeric(14,2) not null check (pkr >= 0),
  customer_gold_g   numeric(14,4) not null check (customer_gold_g >= 0),
  inventory_gold_g  numeric(14,4) not null check (inventory_gold_g >= 0),
  updated_at        timestamptz not null default now()
);

create table if not exists demo_settings (
  id                    smallint primary key check (id = 1),
  primary_down          boolean not null default false,
  fallback_down         boolean not null default false,
  force_stale           boolean not null default false,
  quote_ttl_seconds     integer not null default 75 check (quote_ttl_seconds between 5 and 600),
  buy_floor_pkr_per_g   numeric(14,2) not null default 30000 check (buy_floor_pkr_per_g >= 0),
  refresh_requested_at  timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists price_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  fetched_at          timestamptz not null default now(),
  ok                  boolean not null,
  source              text check (source in ('pakgold','goldprice')),
  market_pkr_per_g    numeric(14,2) check (market_pkr_per_g > 0),
  upstream_ts         timestamptz,
  fallback_used       boolean not null default false,
  primary_pkr_per_g   numeric(14,2),
  fallback_pkr_per_g  numeric(14,2),
  deviation_pct       numeric(8,3),
  primary_error       text,
  fallback_error      text,
  raw                 jsonb not null default '{}'::jsonb,
  check (ok = false or (source is not null and market_pkr_per_g is not null))
);
create index if not exists price_snapshots_fetched_at_idx on price_snapshots (fetched_at desc);

create table if not exists quotes (
  id                 uuid primary key default gen_random_uuid(),
  side               text not null check (side in ('buy','sell')),
  input_mode         text not null check (input_mode in ('pkr','gold')),
  input_amount       numeric(14,4) not null check (input_amount > 0),
  pkr                numeric(14,2) not null check (pkr > 0),
  gold_g             numeric(14,4) not null check (gold_g > 0),
  unit_price         numeric(14,2) not null check (unit_price > 0),
  market_price       numeric(14,2) not null check (market_price > 0),
  guardrail_applied  boolean not null default false,
  source             text not null,
  snapshot_id        uuid references price_snapshots(id),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  status             text not null default 'locked' check (status in ('locked','filled')),
  trade_id           uuid
);
create index if not exists quotes_created_at_idx on quotes (created_at desc);

create table if not exists trades (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null unique references quotes(id),
  side             text not null check (side in ('buy','sell')),
  pkr              numeric(14,2) not null check (pkr > 0),
  gold_g           numeric(14,4) not null check (gold_g > 0),
  unit_price       numeric(14,2) not null,
  market_price     numeric(14,2) not null,
  source           text not null,
  executed_at      timestamptz not null default now(),
  balances_before  jsonb not null,
  balances_after   jsonb not null
);
create index if not exists trades_executed_at_idx on trades (executed_at desc);

create table if not exists ledger_entries (
  id             bigserial primary key,
  trade_id       uuid not null references trades(id),
  account        text not null check (account in ('wallet','customer_gold','inventory_gold')),
  delta          numeric(14,4) not null,
  balance_after  numeric(14,4) not null check (balance_after >= 0),
  created_at     timestamptz not null default now()
);

-- Seed (no-op if rows exist)
insert into balances (id, pkr, customer_gold_g, inventory_gold_g)
values (1, 500000.00, 5.0000, 10.0000)
on conflict (id) do nothing;

insert into demo_settings (id) values (1) on conflict (id) do nothing;

-- Settlement: one transaction, one trade per quote, safe to call repeatedly.
create or replace function confirm_quote(p_quote_id uuid) returns jsonb
language plpgsql as $$
declare
  q       quotes%rowtype;
  b       balances%rowtype;
  t       trades%rowtype;
  before  jsonb;
  after   jsonb;
begin
  select * into q from quotes where id = p_quote_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'QUOTE_NOT_FOUND');
  end if;

  if q.status = 'filled' then
    select * into t from trades where id = q.trade_id;
    return jsonb_build_object('ok', true, 'repeated', true, 'trade', to_jsonb(t));
  end if;

  if now() > q.expires_at then
    return jsonb_build_object('ok', false, 'code', 'QUOTE_EXPIRED', 'expires_at', q.expires_at);
  end if;

  select * into b from balances where id = 1 for update;

  if q.side = 'buy' then
    if b.inventory_gold_g < q.gold_g then
      return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_INVENTORY', 'available', b.inventory_gold_g, 'required', q.gold_g);
    end if;
    if b.pkr < q.pkr then
      return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_CASH', 'available', b.pkr, 'required', q.pkr);
    end if;
  else
    if b.customer_gold_g < q.gold_g then
      return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_GOLD', 'available', b.customer_gold_g, 'required', q.gold_g);
    end if;
  end if;

  before := jsonb_build_object('pkr', b.pkr, 'customer_gold_g', b.customer_gold_g, 'inventory_gold_g', b.inventory_gold_g);

  if q.side = 'buy' then
    update balances
       set pkr = pkr - q.pkr,
           customer_gold_g = customer_gold_g + q.gold_g,
           inventory_gold_g = inventory_gold_g - q.gold_g,
           updated_at = now()
     where id = 1
     returning * into b;
  else
    update balances
       set pkr = pkr + q.pkr,
           customer_gold_g = customer_gold_g - q.gold_g,
           inventory_gold_g = inventory_gold_g + q.gold_g,
           updated_at = now()
     where id = 1
     returning * into b;
  end if;

  after := jsonb_build_object('pkr', b.pkr, 'customer_gold_g', b.customer_gold_g, 'inventory_gold_g', b.inventory_gold_g);

  insert into trades (quote_id, side, pkr, gold_g, unit_price, market_price, source, balances_before, balances_after)
  values (q.id, q.side, q.pkr, q.gold_g, q.unit_price, q.market_price, q.source, before, after)
  returning * into t;

  insert into ledger_entries (trade_id, account, delta, balance_after) values
    (t.id, 'wallet',         case when q.side = 'buy' then -q.pkr    else  q.pkr    end, b.pkr),
    (t.id, 'customer_gold',  case when q.side = 'buy' then  q.gold_g else -q.gold_g end, b.customer_gold_g),
    (t.id, 'inventory_gold', case when q.side = 'buy' then -q.gold_g else  q.gold_g end, b.inventory_gold_g);

  update quotes set status = 'filled', trade_id = t.id where id = q.id;

  return jsonb_build_object('ok', true, 'repeated', false, 'trade', to_jsonb(t));
end
$$;

-- Reviewer reset: seed balances, clear trades and quotes, default demo settings.
create or replace function reset_demo() returns void
language plpgsql as $$
begin
  delete from ledger_entries;
  update quotes set trade_id = null, status = 'locked' where status = 'filled';
  delete from trades;
  delete from quotes;
  update balances set pkr = 500000.00, customer_gold_g = 5.0000, inventory_gold_g = 10.0000, updated_at = now() where id = 1;
  update demo_settings
     set primary_down = false, fallback_down = false, force_stale = false,
         quote_ttl_seconds = 75, buy_floor_pkr_per_g = 30000,
         refresh_requested_at = now(), updated_at = now()
   where id = 1;
end
$$;
