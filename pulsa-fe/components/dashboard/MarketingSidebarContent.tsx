"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ClipboardCheck,
  FileSignature,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Store,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { type NavSection } from "./nav";

type Props = {
  sections: NavSection[];
  onLogout: () => void;
  onNavigate?: () => void;
};

const iconByHref: Record<string, typeof LayoutDashboard> = {
  "/dashboard/master": LayoutDashboard,
  "/dashboard/master/tambah-agent": UserRoundPlus,
  "/dashboard/master/input-pinjaman-manual": FileSignature,
  "/dashboard/master/pinjaman": Camera,
  "/dashboard/master/akun-agent": UsersRound,
  "/dashboard/master/profil-agent": Store,
  "/dashboard/master/riwayat-pinjaman": ReceiptText,
};

function isActivePath(pathname: string, href: string) {
  const exactOnly = href === "/dashboard/master";
  return exactOnly ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingSidebarContent({ sections, onLogout, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[#042f27] text-white">
      <header className="border-b border-white/10 px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
            <BrandLogo variant="light" />
          </div>
          {onNavigate ? (
            <button
              type="button"
              onClick={onNavigate}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="relative mt-4 overflow-hidden rounded-lg border border-emerald-300/25 bg-[#073f35] px-3 py-3">
          <div className="absolute -right-5 -top-7 h-20 w-20 rounded-full border border-lime-300/15 bg-emerald-200/5" aria-hidden="true" />
          <p className="relative text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Mode Marketing</p>
          <p className="relative mt-1 text-sm font-black text-white">Validasi lapangan</p>
          <p className="relative mt-1 text-[10px] font-semibold leading-4 text-emerald-100/70">Survei dan dokumen kredit agent</p>
        </div>
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3 [scrollbar-color:rgba(110,231,183,0.45)_transparent] [scrollbar-width:thin]">
        {sections.map((section, sectionIndex) => (
          <div key={section.title || `utama-${sectionIndex}`} className={sectionIndex > 0 ? "mt-5" : ""}>
            {section.title ? (
              <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/65">
                {section.title}
              </p>
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = iconByHref[item.href] || ClipboardCheck;
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group flex min-h-10 items-center gap-3 rounded-lg border px-2.5 py-2 text-[12px] font-black leading-tight outline-none transition",
                      "focus-visible:ring-2 focus-visible:ring-lime-300",
                      active
                        ? "border-cyan-400/70 bg-[#075985] text-white shadow-[0_8px_20px_rgba(2,132,199,0.18)]"
                        : "border-transparent text-emerald-50 hover:border-white/10 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <Icon className={active ? "h-4 w-4 text-cyan-200" : "h-4 w-4 text-emerald-300"} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_9px_3px_rgba(103,232,249,0.45)]" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <footer className="border-t border-white/10 bg-[#03271f] p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-[11px] font-black text-emerald-900">MK</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-black">Marketing PulsaKilat</p>
            <p className="truncate text-[10px] font-semibold text-emerald-200/65">Pendamping agent lapangan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-300/20 bg-rose-950/20 px-3 text-xs font-black text-rose-200 transition hover:bg-rose-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </footer>
    </div>
  );
}
