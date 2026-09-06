import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "./Icons";

export function Header({
  title,
  subtitle,
  back,
  right,
  logo = false,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
  logo?: boolean;
}) {
  return (
    <header
      className="flex items-center gap-3 px-5 pb-3"
      style={{ paddingTop: "max(env(safe-area-inset-top), 22px)" }}
    >
      {back ? (
        <Link
          href={back}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-fg-2 transition-colors hover:text-fg"
        >
          <ChevronLeft size={20} />
        </Link>
      ) : null}
      {logo ? <Image src="/logo.png" alt="Asasa" width={36} height={36} priority className="h-9 w-9 shrink-0" /> : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-semibold tracking-[-0.03em]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-fg-2">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
