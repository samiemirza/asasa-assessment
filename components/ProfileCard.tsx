import { ShieldIcon } from "./Icons";

export const PROFILE = {
  name: "Samie Ahmad",
  email: "samie.ahmad2003@gmail.com",
  phone: "+92 300 123 4567",
  cnic: "42101-*******-1",
  dob: "12 Mar 2003",
  city: "Karachi, Pakistan",
  memberSince: "Sep 2026",
  customerId: "AS-104-2291",
  bank: "Meezan Bank",
  iban: "PK36 MEZN **** **** **** 4821",
  accountTitle: "Samie Ahmad",
  lastLogin: "Today, 19:05 PKT",
};

export function ProfileCard() {
  const initials = PROFILE.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <section className="hero rise rounded-card p-5">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-forest text-[22px] font-semibold tracking-tight text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[20px] font-semibold tracking-[-0.03em]">{PROFILE.name}</p>
          <p className="truncate text-[13px] text-ink/70">{PROFILE.email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-ink/8 px-2.5 py-1 text-[12px] font-medium text-ink">
            <ShieldIcon size={14} />
            Verified
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[12px] text-ink/65">
        <span>Customer {PROFILE.customerId}</span>
        <span>Member since {PROFILE.memberSince}</span>
      </div>
    </section>
  );
}
