import { cache } from "react";
import { getBalances } from "./balances";
import { getDayOpen, getDemoSettings, getPriceView, listSnapshots } from "./pricing/engine";
import { listTrades } from "./quotes/service";

// Per-request memoisation so a page and its header pill share one query.
export const cachedPrice = cache(() => getPriceView());
export const cachedBalances = cache(() => getBalances());
export const cachedSettings = cache(() => getDemoSettings());
export const cachedSnapshots = cache((n: number) => listSnapshots(n));
export const cachedDayOpen = cache(() => getDayOpen());
export const cachedTrades = cache((n: number) => listTrades(n));
