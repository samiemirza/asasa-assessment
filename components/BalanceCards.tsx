import type { Balances } from "@/lib/balances";
import { fmtG, fmtPKR } from "@/lib/format";
import { GoldIcon, VaultIcon, WalletIcon } from "./Icons";

export function BalanceCards({ balances }: { balances: Balances }) {
  return (
    <section className="mt-3 grid grid-cols-2 gap-3" aria-label="Balances">
      <div className="col-span-2 rounded-card bg-card p-5">
        <div className="flex items-center gap-2 text-[13px] text-fg-2">
          <WalletIcon size={18} />
          Wallet
        </div>
        <p className="display num mt-2 text-[32px] font-semibold">{fmtPKR(balances.pkr, 2)}</p>
      </div>
      <div className="rounded-card bg-card p-4">
        <div className="flex items-center gap-2 text-[13px] text-fg-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-tint text-gold">
            <GoldIcon size={16} />
          </span>
          Your gold
        </div>
        <p className="num mt-3 text-[22px] font-semibold">{fmtG(balances.customerGoldG)}</p>
      </div>
      <div className="rounded-card bg-card p-4">
        <div className="flex items-center gap-2 text-[13px] text-fg-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-green-tint text-green-soft">
            <VaultIcon size={16} />
          </span>
          Inventory
        </div>
        <p className="num mt-3 text-[22px] font-semibold">{fmtG(balances.inventoryGoldG)}</p>
      </div>
    </section>
  );
}
