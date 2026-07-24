"use client";

import Link from "next/link";
import {
  BadgePlus,
  Flame,
  Gamepad2,
  Grid2x2,
  HeartHandshake,
  MonitorPlay,
  PhoneCall,
  Smartphone,
  TimerReset,
  Wallet,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

type CategoryVisual = {
  icon: LucideIcon;
  secondaryIcon?: LucideIcon;
  accent: string;
  glow: string;
};

type CategoryShortcutLinkProps = {
  href: string;
  label: string;
  visualName: string;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getCategoryVisual(name: string): CategoryVisual {
  const value = normalizeName(name);

  switch (value) {
    case "pulsa":
    case "pulsa data":
    case "pulsa & data":
      return { icon: Smartphone, secondaryIcon: Wifi, accent: "from-[#052e26] via-[#047857] to-[#a3e635]", glow: "shadow-[0_12px_26px_rgba(6,78,59,0.26)]" };
    case "e-money":
    case "e-wallet":
      return { icon: Wallet, accent: "from-[#a3e635] via-[#22c55e] to-[#047857]", glow: "shadow-[0_10px_22px_rgba(34,197,94,0.24)]" };
    case "paket data":
      return { icon: Wifi, accent: "from-teal-400 via-[#10b981] to-[#064e3b]", glow: "shadow-[0_10px_22px_rgba(16,185,129,0.20)]" };
    case "listrik":
    case "pln":
      return { icon: Zap, accent: "from-[#d9f99d] via-[#a3e635] to-[#22c55e]", glow: "shadow-[0_10px_22px_rgba(132,204,22,0.24)]" };
    case "game":
      return { icon: Gamepad2, accent: "from-[#064e3b] via-[#10b981] to-[#84cc16]", glow: "shadow-[0_10px_22px_rgba(16,185,129,0.20)]" };
    case "tv":
      return { icon: MonitorPlay, accent: "from-[#052e26] via-slate-700 to-[#047857]", glow: "shadow-[0_10px_22px_rgba(6,78,59,0.18)]" };
    case "pdam":
      return { icon: Waves, accent: "from-cyan-400 via-teal-500 to-[#047857]", glow: "shadow-[0_10px_22px_rgba(20,184,166,0.20)]" };
    case "bpjs":
      return { icon: HeartHandshake, accent: "from-[#047857] via-[#10b981] to-[#a3e635]", glow: "shadow-[0_10px_22px_rgba(16,185,129,0.18)]" };
    case "internet pascabayar":
      return { icon: Wifi, accent: "from-emerald-600 via-teal-600 to-[#052e26]", glow: "shadow-[0_10px_22px_rgba(6,78,59,0.18)]" };
    case "hp pascabayar":
      return { icon: Smartphone, accent: "from-zinc-700 via-slate-700 to-[#047857]", glow: "shadow-[0_10px_22px_rgba(51,65,85,0.18)]" };
    case "masa aktif":
      return { icon: TimerReset, accent: "from-lime-400 via-green-500 to-emerald-700", glow: "shadow-[0_10px_22px_rgba(34,197,94,0.20)]" };
    case "paket telepon":
      return { icon: PhoneCall, accent: "from-[#10b981] via-teal-500 to-[#052e26]", glow: "shadow-[0_10px_22px_rgba(16,185,129,0.18)]" };
    case "aktivasi perdana":
      return { icon: BadgePlus, accent: "from-emerald-500 via-green-500 to-lime-500", glow: "shadow-[0_10px_22px_rgba(34,197,94,0.20)]" };
    case "gas negara":
      return { icon: Flame, accent: "from-lime-500 via-emerald-500 to-[#064e3b]", glow: "shadow-[0_10px_22px_rgba(132,204,22,0.18)]" };
    default:
      return { icon: Grid2x2, accent: "from-slate-600 via-[#047857] to-[#052e26]", glow: "shadow-[0_10px_22px_rgba(6,78,59,0.18)]" };
  }
}

export function CategoryShortcutLink({ href, label, visualName }: CategoryShortcutLinkProps) {
  const visual = getCategoryVisual(visualName);
  const Icon = visual.icon;
  const SecondaryIcon = visual.secondaryIcon;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/72 px-1.5 py-2 text-center shadow-[0_8px_22px_rgba(15,23,42,0.06)] ring-1 ring-emerald-950/[0.03] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(6,78,59,0.13)]"
    >
      <div className={`relative grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br ${visual.accent} text-white ${visual.glow} ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-105`}>
        <Icon className={SecondaryIcon ? "h-5 w-5 -translate-x-0.5" : "h-4.5 w-4.5"} strokeWidth={2.15} />
        {SecondaryIcon ? (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[#047857] shadow-[0_5px_12px_rgba(5,46,38,0.18)] ring-1 ring-emerald-100">
            <SecondaryIcon className="h-3 w-3" strokeWidth={2.4} />
          </span>
        ) : null}
      </div>
      <span className="line-clamp-2 px-1 text-[10px] font-black leading-tight text-[#052e26]">
        {label}
      </span>
    </Link>
  );
}
