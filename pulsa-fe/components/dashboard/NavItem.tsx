"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

type Props = {
  href: string;
  label: string;
  onClick?: () => void;
  variant?: "light" | "dark";
};

const iconByHref = {
  "/dashboard/master": LayoutDashboard,
  "/dashboard/master/analis": ShieldCheck,
  "/dashboard/master/analis/antrean": ClipboardList,
  "/dashboard/master/analis/kredit-diterima": BadgeCheck,
  "/dashboard/master/analis/monitor-pelunasan": WalletCards,
  "/dashboard/master/analis/bukti-pelunasan": FileCheck2,
  "/dashboard/master/analis/penolakan-catatan": XCircle,
  "/dashboard/master/analis/arsip-keputusan": Archive,
  "/dashboard/master/riwayat-acc-analis": FileText,
} as const;

export function NavItem({ href, label, onClick, variant = "light" }: Props) {
  const pathname = usePathname();
  const hrefPath = href.split("?")[0] || href;
  const Icon = iconByHref[hrefPath as keyof typeof iconByHref];
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
        "group flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-[13px] font-black uppercase tracking-[0.08em] outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-200",
        active
          ? isDark
            ? "border-white bg-white !text-[#052e26] shadow-[0_14px_28px_rgba(0,0,0,0.16)]"
            : "border-[#052e26] bg-white text-[#052e26] shadow-[0_10px_20px_rgba(6,78,59,0.10)]"
          : isDark
            ? "border-white/12 bg-white/8 !text-emerald-50 hover:border-lime-200/55 hover:bg-white/16 hover:!text-white"
            : "border-transparent text-slate-800 hover:border-slate-300 hover:bg-white hover:text-slate-950",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span
            className={[
              "grid h-8 w-8 shrink-0 place-items-center rounded-xl border transition",
              active
                ? isDark
                  ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isDark
                  ? "border-lime-200/25 bg-emerald-950/35 text-lime-200 group-hover:border-lime-100/55 group-hover:bg-emerald-900/45"
                  : "border-slate-200 bg-white text-emerald-700",
            ].join(" ")}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2.4} />
          </span>
        ) : null}
        <span className={`min-w-0 truncate ${isDark && !active ? "!text-emerald-50" : ""}`}>{label}</span>
      </span>
      {active ? (
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isDark ? "bg-[#052e26] text-white" : "bg-[#052e26] text-white"}`}>
          <CheckCircle2 className="h-4 w-4" />
        </span>
      ) : null}
    </Link>
  );
}
