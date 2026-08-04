"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  ClipboardCheck,
  FileSignature,
  LayoutDashboard,
  LogOut,
  UserRoundPlus,
  UsersRound,
  WalletCards,
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
  "/dashboard/master/akun-agent": UsersRound,
  "/dashboard/master/input-pinjaman-manual": FileSignature,
  "/dashboard/master/pinjaman": Camera,
  "/dashboard/master/riwayat-pinjaman": WalletCards,
};

function isActivePath(pathname: string, href: string) {
  const exactOnly = href === "/dashboard/master";
  return exactOnly ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingSidebarContent({ sections, onLogout, onNavigate }: Props) {
  const pathname = usePathname();
  const items = sections.flatMap((section) => section.items);
  const activeItem = items.find((item) => isActivePath(pathname, item.href));

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#042f27_0%,#07533f_52%,#08764f_100%)] text-[#d8f8e8]">
      <div className="border-b border-white/12 px-5 pb-5 pt-6">
        <div className="flex justify-center">
          <div className="rounded-[22px] bg-white px-4 py-2 shadow-[0_18px_36px_rgba(0,0,0,0.16)] ring-1 ring-white/70">
            <BrandLogo variant="light" />
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.20em] text-[#c7f9d4]">
          Marketing PulsaKilat
        </p>
      </div>

      <div className="mx-5 mt-5 rounded-[24px] border border-white/14 bg-white/9 p-4 shadow-[0_18px_36px_rgba(0,0,0,0.14)] backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 shadow-sm">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#c9f05d]">Mode Lapangan</p>
            <h2 className="mt-1 text-base font-black leading-tight text-[#f0fff7]">Dampingi agent</h2>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-[#cbeede]">
              Daftar akun, lengkapi dokumen, kirim pengajuan, dan pantau pelunasan.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/12 bg-[#053b2f] px-3 py-2 text-[10px] font-black text-[#bdebd7]">
          Bagian aktif: <span className="text-[#d9ff75]">{activeItem?.label || "Ringkasan Kerja"}</span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-color:rgba(255,255,255,0.45)_transparent]">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.20em] text-[#d9ff75]">
          Operasional Kredit
        </p>
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = iconByHref[item.href] || ClipboardCheck;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "group relative flex min-h-12 items-center gap-3 overflow-hidden rounded-[18px] border px-3 py-2.5 text-sm font-black leading-tight outline-none transition focus-visible:ring-4 focus-visible:ring-lime-200/55",
                  active
                    ? "border-white bg-white !text-[#052e26] shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
                    : "border-white/12 bg-white/8 !text-[#f1fff7] hover:border-lime-100/45 hover:bg-white/14",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-8 w-8 shrink-0 place-items-center rounded-2xl border",
                    active ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-white/16 bg-[#063f32] text-[#c9f05d]",
                  ].join(" ")}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className={["min-w-0 flex-1", active ? "text-[#052e26]" : "text-[#f1fff7]"].join(" ")}>
                  {item.label}
                </span>
                {active ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[#84cc16] shadow-[0_0_0_4px_rgba(132,204,22,0.16)]" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/12 bg-[#042f27] p-5">
        <div className="flex items-center gap-3 rounded-[20px] border border-white/12 bg-white px-3 py-3 text-[#053b2f] shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#dcfce7] text-sm font-black text-emerald-800">
            MK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">Marketing</p>
            <p className="truncate text-xs font-semibold text-slate-500">Kredit agent</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            aria-label="Logout"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
