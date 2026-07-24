"use client";

import type { ReactNode } from "react";

type OverviewStatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  tone?: "sky" | "emerald" | "amber" | "violet";
};

function toneClass(tone: OverviewStatCardProps["tone"]): string {
  if (tone === "emerald") {
    return "from-emerald-500/20 via-emerald-500/10 to-cyan-500/15 border-emerald-300/25";
  }
  if (tone === "amber") {
    return "from-amber-500/20 via-amber-500/10 to-orange-500/15 border-amber-300/25";
  }
  if (tone === "violet") {
    return "from-violet-500/20 via-violet-500/10 to-indigo-500/15 border-violet-300/25";
  }
  return "from-sky-500/20 via-sky-500/10 to-cyan-500/15 border-sky-300/25";
}

export default function OverviewStatCard(props: OverviewStatCardProps) {
  const { title, value, subtitle, icon, tone = "sky" } = props;

  return (
    <div
      className={`rounded-2xl border bg-linear-to-br p-4 shadow-[0_18px_42px_-28px_rgba(56,189,248,0.55)] ${toneClass(tone)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-slate-300">{title}</div>
        {icon ? <div className="text-slate-200">{icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-300">{subtitle}</div> : null}
    </div>
  );
}
