import Link from "next/link";

const styles = {
  primary: "bg-green text-ink hover:bg-green-soft",
  neutral: "bg-card-2 text-fg hover:bg-card-3",
  danger: "bg-rose-tint text-rose hover:bg-red/25",
} as const;

const shared = "flex h-14 w-full items-center justify-center rounded-pill text-[16px] font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-card-3 disabled:text-fg-3";

export function Button({
  children,
  variant = "primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof styles }) {
  return (
    <button {...rest} className={`${shared} ${styles[variant]} ${rest.className ?? ""}`}>
      {children}
    </button>
  );
}

export function LinkButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: keyof typeof styles }) {
  return (
    <Link href={href} className={`${shared} ${styles[variant]}`}>
      {children}
    </Link>
  );
}
