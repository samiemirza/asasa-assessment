"use client";
import { useEffect, useState } from "react";
import { PROFILE } from "./ProfileCard";
import { BankIcon, PlusIcon } from "./Icons";
import { Button } from "./Button";

interface Account {
  id: string;
  bank: string;
  iban: string;
  title: string;
  primary?: boolean;
}

const SEEDED: Account = { id: "seed", bank: PROFILE.bank, iban: PROFILE.iban, title: PROFILE.accountTitle, primary: true };
const KEY = "asasa.accounts";

function maskIban(raw: string): string {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  if (s.length < 8) return s;
  return `${s.slice(0, 4)} ${s.slice(4, 8)} **** **** **** ${s.slice(-4)}`;
}

export function Accounts() {
  const [extra, setExtra] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState("");
  const [iban, setIban] = useState("");
  const [title, setTitle] = useState(PROFILE.name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setExtra(JSON.parse(raw));
    } catch {
      /* start empty */
    }
  }, []);

  const accounts = [SEEDED, ...extra];

  function save() {
    const clean = iban.replace(/\s+/g, "").toUpperCase();
    if (bank.trim().length < 2) return setError("Enter the bank name");
    if (!/^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(clean)) return setError("Enter a valid Pakistani IBAN (24 characters starting with PK)");
    if (title.trim().length < 2) return setError("Enter the account title");
    const next = [...extra, { id: String(Date.now()), bank: bank.trim(), iban: maskIban(clean), title: title.trim() }];
    setExtra(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* not persisted */
    }
    setOpen(false);
    setBank("");
    setIban("");
    setError(null);
  }

  const rowClass = "flex h-[72px] w-full items-center gap-3 rounded-card px-4 text-left";

  return (
    <div className="space-y-2">
      {accounts.map((a) => (
        <div key={a.id} className={`${rowClass} bg-card`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-tint text-green-soft">
            <BankIcon size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{a.bank}</span>
            <span className="num block truncate text-[12px] text-fg-3">{a.iban}</span>
          </span>
          {a.primary ? <span className="rounded-pill bg-card-2 px-2.5 py-1 text-[11px] font-medium text-fg-2">Primary</span> : null}
        </div>
      ))}

      {open ? (
        <div className="rounded-card bg-card p-4">
          <p className="text-[15px] font-medium">New account</p>
          <div className="mt-3 space-y-2">
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank name" aria-label="Bank name" className="h-12 w-full rounded-inner bg-card-2 px-4 text-[15px] outline-none placeholder:text-fg-3 focus:ring-2 focus:ring-green/40" />
            <input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IBAN, PK36MEZN0000000000004821" aria-label="IBAN" autoCapitalize="characters" className="num h-12 w-full rounded-inner bg-card-2 px-4 text-[15px] outline-none placeholder:text-fg-3 focus:ring-2 focus:ring-green/40" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Account title" aria-label="Account title" className="h-12 w-full rounded-inner bg-card-2 px-4 text-[15px] outline-none placeholder:text-fg-3 focus:ring-2 focus:ring-green/40" />
          </div>
          {error ? <p className="mt-2 text-[13px] text-rose">{error}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" variant="neutral" onClick={() => { setOpen(false); setError(null); }}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save account
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`${rowClass} border border-dashed border-hairline-2 text-fg-2 transition-colors hover:border-green/50 hover:text-fg`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card-2">
            <PlusIcon size={18} />
          </span>
          <span className="text-[15px] font-medium">Add Account</span>
        </button>
      )}
    </div>
  );
}
