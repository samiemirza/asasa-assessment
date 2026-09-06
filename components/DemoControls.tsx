"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmtPKR } from "@/lib/format";
import type { DemoSettings } from "@/lib/pricing/types";
import { Button } from "./Button";
import { Card, SectionTitle } from "./Row";

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
    >
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[12px] text-fg-3">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-pill transition-colors ${checked ? "bg-green" : "bg-card-3"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-fg transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

function NumberField({
  id,
  label,
  hint,
  value,
  unit,
  presets,
  onCommit,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  unit: string;
  presets: { label: string; value: number }[];
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text.replace(/,/g, ""));
    if (Number.isFinite(n) && n !== value) onCommit(n);
    else setText(String(value));
  };
  return (
    <div className="px-5 py-4">
      <label htmlFor={id} className="block text-[15px] font-medium">
        {label}
      </label>
      <p className="text-[12px] text-fg-3">{hint}</p>
      <div className="mt-3 flex items-center gap-2 rounded-inner bg-card-2 px-4">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="num h-12 min-w-0 flex-1 bg-transparent text-[18px] font-semibold outline-none"
        />
        <span className="text-[13px] text-fg-2">{unit}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onCommit(p.value)}
            className={`rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors ${p.value === value ? "bg-fg text-ink" : "bg-card-2 text-fg-2 hover:text-fg"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DemoControls({ initial, marketBuy }: { initial: DemoSettings; marketBuy: number | null }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (text: string) => {
    setNote(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(null), 2200);
  };

  async function patch(p: Partial<DemoSettings>) {
    setS((prev) => ({ ...prev, ...p }));
    try {
      const res = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
      const json = await res.json();
      if (!res.ok) {
        flash(json.error?.message ?? "Not saved");
        setS(initial);
        return;
      }
      setS(json);
      flash("Saved");
      router.refresh();
    } catch {
      flash("Could not reach the server");
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setS(json.settings);
        flash("Balances and history reset");
        router.refresh();
      } else flash("Reset failed");
    } catch {
      flash("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  const bindValue = marketBuy != null ? Math.ceil(marketBuy / 1000) * 1000 + 5000 : 60000;

  return (
    <>
      <SectionTitle right={<span aria-live="polite" className="text-[12px] text-green-soft">{note}</span>}>Price sources</SectionTitle>
      <Card className="divide-y divide-hairline">
        <Switch label="Primary source down" hint="PakGold stops answering, fallback takes over" checked={s.primaryDown} onChange={(v) => patch({ primaryDown: v })} />
        <Switch label="Fallback source down" hint="GoldPrice.org stops answering" checked={s.fallbackDown} onChange={(v) => patch({ fallbackDown: v })} />
        <Switch label="Distrust last good price" hint="Pauses trading immediately" checked={s.forceStale} onChange={(v) => patch({ forceStale: v })} />
      </Card>

      <SectionTitle>Quote lock</SectionTitle>
      <Card>
        <NumberField
          id="ttl"
          label="Lock duration"
          hint="Applies to new quotes, 5 to 600 seconds"
          value={s.quoteTtlSeconds}
          unit="seconds"
          presets={[
            { label: "10 s", value: 10 },
            { label: "75 s", value: 75 },
          ]}
          onCommit={(v) => patch({ quoteTtlSeconds: Math.round(v) })}
        />
      </Card>

      <SectionTitle>Guardrail</SectionTitle>
      <Card>
        <NumberField
          id="floor"
          label="Minimum buy price"
          hint={marketBuy != null ? `Binds when above market x 1.10, now ${fmtPKR(marketBuy, 2)}` : "Binds when above market x 1.10"}
          value={s.buyFloorPkrPerG}
          unit="PKR / g"
          presets={[
            { label: "Off (30,000)", value: 30000 },
            { label: `Bind (${bindValue.toLocaleString("en-US")})`, value: bindValue },
          ]}
          onCommit={(v) => patch({ buyFloorPkrPerG: v })}
        />
      </Card>

      <SectionTitle>Reset</SectionTitle>
      <Card className="p-4">
        <p className="mb-3 px-1 text-[12px] text-fg-3">Restores PKR 500,000, 5 g of gold and 10 g of inventory, clears history and settings.</p>
        <Button type="button" variant="danger" onClick={reset} disabled={busy}>
          {busy ? "Resetting" : "Reset demo"}
        </Button>
      </Card>
    </>
  );
}
