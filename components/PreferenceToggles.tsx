"use client";
import { useState } from "react";

function Toggle({ label, hint, initial }: { label: string; hint: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => setOn(!on)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[12px] text-fg-3">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-pill transition-colors ${on ? "bg-green" : "bg-card-3"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-fg transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
      </span>
    </button>
  );
}

export function PreferenceToggles() {
  return (
    <>
      <Toggle label="Price alerts" hint="When 24K moves more than 2% in a day" initial />
      <Toggle label="Trade receipts by email" hint="Sent after every confirmed trade" initial />
      <Toggle label="Two-factor sign in" hint="Code by SMS on new devices" initial />
    </>
  );
}
