"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  label: string;
  onClick?: () => void;
};

export function NavItem({ href, label, onClick }: Props) {
  const pathname = usePathname();
  const hrefPath = href.split("?")[0] || href;
  const exactOnlyHrefs = new Set([
    "/dashboard/admin",
    "/dashboard/member",
    "/dashboard/operator",
    "/dashboard/wallet",
    "/dashboard/master",
  ]);
  const active = exactOnlyHrefs.has(hrefPath) ? pathname === hrefPath : pathname === hrefPath || pathname.startsWith(hrefPath + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "flex items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-medium uppercase tracking-[0.08em] transition",
        active
          ? "border-cyan-400/35 bg-linear-to-r from-cyan-400/18 via-sky-400/12 to-indigo-400/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-transparent text-white/80 hover:border-white/10 hover:bg-white/8 hover:text-white",
      ].join(" ")}
    >
      <span>{label}</span>
      {active ? <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.75)]" /> : null}
    </Link>
  );
}
