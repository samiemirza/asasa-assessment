"use client";
import { useEffect, useState } from "react";
import { relTime } from "@/lib/format";

/** Relative time that ticks on the client. Server renders the same string for the initial paint. */
export function RelTime({ iso, serverNow }: { iso: string | null; serverNow: string }) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);
  return <span suppressHydrationWarning>{relTime(iso, now)}</span>;
}
