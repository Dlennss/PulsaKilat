"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type Props = {
  href: string;
  label: string;
  onClick?: () => void;
  variant?: "light" | "dark";
};

export function NavItem({ href, label, onClick, variant = "light" }: Props) {
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
  const isDark = variant === "dark";

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "group flex items-center justify-between rounded-2xl border px-3 py-2.5 text-[13px] font-black uppercase tracking-[0.08em] outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-200",
        active
          ? isDark
            ? "border-white bg-white !text-[#052e26] shadow-[0_14px_28px_rgba(0,0,0,0.16)]"
            : "border-[#052e26] bg-white text-[#052e26] shadow-[0_10px_20px_rgba(6,78,59,0.10)]"
          : isDark
            ? "border-transparent bg-white/0 !text-white hover:border-white/25 hover:bg-white/12 hover:!text-white"
            : "border-transparent text-slate-800 hover:border-slate-300 hover:bg-white hover:text-slate-950",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span className={isDark && !active ? "!text-white" : undefined}>{label}</span>
      {active ? (
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isDark ? "bg-[#052e26] text-white" : "bg-[#052e26] text-white"}`}>
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
    </Link>
  );
}
