import { cache } from "react";
import { getBalances } from "./balances";
import { getDemoSettings, getPriceView, listSnapshots } from "./pricing/engine";

// Per-request memoisation so a page and its header pill share one query.
export const cachedPrice = cache(() => getPriceView());
export const cachedBalances = cache(() => getBalances());
export const cachedSettings = cache(() => getDemoSettings());
export const cachedSnapshots = cache((n: number) => listSnapshots(n));
