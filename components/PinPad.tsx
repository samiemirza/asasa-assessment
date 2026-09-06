"use client";
import { useEffect, useState } from "react";
import { biometricsAvailable, verifyWithBiometrics } from "@/lib/webauthn";
import { ShieldIcon } from "./Icons";

export const DEMO_PIN = "1234";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({ onVerified, disabled }: { onVerified: () => void; disabled: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [bio, setBio] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    void biometricsAvailable().then(setBio);
  }, []);

  useEffect(() => {
    if (pin.length < 4) return;
    if (pin === DEMO_PIN) {
      onVerified();
      return;
    }
    setError("Incorrect PIN");
    setShake(true);
    const t = setTimeout(() => {
      setPin("");
      setShake(false);
    }, 420);
    return () => clearTimeout(t);
  }, [pin, onVerified]);

  const press = (k: string) => {
    if (disabled) return;
    setError(null);
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k && pin.length < 4) setPin((p) => p + k);
  };

  const useBiometrics = async () => {
    if (disabled || bioBusy) return;
    setBioBusy(true);
    setError(null);
    const ok = await verifyWithBiometrics();
    setBioBusy(false);
    if (ok) onVerified();
    else setError("Biometric check did not complete");
  };

  return (
    <div className="mt-5">
      <div className={`flex justify-center gap-4 ${shake ? "shake" : ""}`} aria-label="PIN" role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full transition-colors ${i < pin.length ? (error ? "bg-red" : "bg-green") : "bg-card-3"}`} />
        ))}
      </div>
      <p className="mt-3 min-h-[18px] text-center text-[13px] text-rose" aria-live="polite">
        {error ?? ""}
      </p>
      <div className="mx-auto mt-3 grid max-w-[280px] grid-cols-3 gap-2">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Delete" : k}
              className="num h-14 rounded-inner bg-card text-[22px] font-medium transition-colors hover:bg-card-2 active:bg-card-3 disabled:opacity-40"
            >
              {k}
            </button>
          ),
        )}
      </div>
      {bio ? (
        <button
          type="button"
          onClick={useBiometrics}
          disabled={disabled || bioBusy}
          className="mx-auto mt-4 flex items-center gap-2 rounded-pill bg-card px-4 py-2.5 text-[13px] font-medium text-fg-2 transition-colors hover:text-fg disabled:opacity-40"
        >
          <ShieldIcon size={16} />
          {bioBusy ? "Waiting for device" : "Use Face ID or Touch ID"}
        </button>
      ) : null}
      <p className="mt-4 text-center text-[12px] text-fg-3">Demo PIN {DEMO_PIN}</p>
    </div>
  );
}
