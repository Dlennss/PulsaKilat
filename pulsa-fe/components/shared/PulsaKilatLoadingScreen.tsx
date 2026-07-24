"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gamepad2, Smartphone, WalletCards, Wifi, Zap } from "lucide-react";

const serviceIcons = [
  { label: "Pulsa", icon: Smartphone, className: "left-[71%] top-[18%]" },
  { label: "Data", icon: Wifi, className: "left-[13%] top-[22%]" },
  { label: "PLN", icon: Zap, className: "left-[9%] top-[55%]" },
  { label: "E-Wallet", icon: WalletCards, className: "left-[70%] top-[58%]" },
  { label: "Game", icon: Gamepad2, className: "left-[38%] top-[72%]" },
];

export function PulsaKilatLoadingScreen() {
  const pathname = usePathname();
  const firstRender = useRef(true);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(12);
  const [message, setMessage] = useState("Memuat aplikasi...");

  useEffect(() => {
    const first = firstRender.current;
    firstRender.current = false;
    const total = first ? 1850 : 980;
    const startedAt = window.performance.now();
    const resetTimer = window.setTimeout(() => {
      setVisible(true);
      setProgress(12);
      setMessage(first ? "Memuat aplikasi..." : "Menyiapkan halaman...");
    }, 0);
    const progressTimer = window.setInterval(() => {
      const elapsed = window.performance.now() - startedAt;
      const next = Math.min(96, 12 + Math.round((elapsed / total) * 84));
      setProgress(next);
      if (next > 45) setMessage("Menghubungkan layanan...");
      if (next > 78) setMessage("Hampir selesai...");
    }, 70);

    const finishTimer = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => setVisible(false), 240);
    }, total);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(progressTimer);
      window.clearTimeout(finishTimer);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-[#eef8f3] text-slate-950">
      <div className="relative min-h-dvh w-full max-w-md overflow-hidden bg-[radial-gradient(circle_at_75%_8%,#bbf7d0_0%,transparent_32%),linear-gradient(180deg,#ffffff_0%,#f0fbf5_48%,#dcfce7_100%)] px-7 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.18)] md:min-h-[820px] md:rounded-[34px] md:border md:border-white/80">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full border border-emerald-400/25" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(180deg,transparent,#052e26)] opacity-[0.07]" />

        <div className="relative flex h-full min-h-[calc(100dvh-4rem)] flex-col md:min-h-[756px]">
          <div className="flex items-center justify-between text-[12px] font-black text-emerald-950">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full border border-emerald-950/70" />
              <span className="h-2 w-2 rounded-full bg-emerald-950/80" />
            </span>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center">
            <div className="relative grid h-64 w-64 place-items-center">
              <div className="pk-loader-ring absolute inset-5 rounded-full" />
              <div className="pk-loader-orbit absolute inset-0">
                {serviceIcons.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span
                      key={item.label}
                      className={`absolute ${item.className} grid h-[70px] w-[70px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[24px] border border-emerald-100 bg-white/92 text-[#047857] shadow-[0_16px_32px_rgba(4,120,87,0.14)] backdrop-blur`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.5} />
                      <span className="mt-1 text-[9px] font-black text-slate-800">{item.label}</span>
                    </span>
                  );
                })}
              </div>

              <div className="relative grid h-32 w-32 place-items-center rounded-full bg-white shadow-[0_20px_50px_rgba(4,120,87,0.16)] ring-8 ring-emerald-50">
                <Image
                  src="/images/logo-pulsakilat-header.svg"
                  alt="PulsaKilat"
                  width={170}
                  height={39}
                  priority
                  className="w-28"
                />
              </div>
            </div>

            <div className="mt-8 text-center">
              <h1 className="text-2xl font-black tracking-tight text-slate-950">PulsaKilat</h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
            </div>

            <div className="mt-7 w-full max-w-[270px]">
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#047857,#22c55e,#a3e635)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 flex justify-center gap-2">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2.5 w-2.5 rounded-full ${progress / 34 >= dot + 1 ? "bg-[#047857]" : "bg-emerald-100"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="relative pb-2 text-center text-[11px] font-bold text-emerald-900/60">
            Top up cepat, aman, dan hemat.
          </p>
        </div>
      </div>
    </div>
  );
}
