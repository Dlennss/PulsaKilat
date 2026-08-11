"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type JwtPayload = {
  sub?: number;
  role?: string;
  exp?: number;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = localStorage.getItem("auth_token") || "";
    const p = decodeJwt(t);

    if (!t || !p) {
      router.replace("/login");
      return;
    }

    if ((p.role || "").toLowerCase() !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [router]);

  const nav = [
    { href: "/dashboard/admin", label: "Dashboard" },
    { href: "/dashboard/admin/komisi", label: "Komisi & Laporan" },
    { href: "/dashboard/admin/deposits", label: "Permintaan Deposit" },
    { href: "/dashboard/admin/transaksi/member", label: "Transaksi Member" },
    { href: "/dashboard/admin/transaksi/aplikasi", label: "Transaksi Aplikasi" },
    { href: "/dashboard/admin/transaksi/provider", label: "Transaksi Provider" },
    { href: "/dashboard/admin/master/members", label: "Akun & Jaringan" },
    { href: "/dashboard/admin/master/aktivasi-h2h", label: "Aktivasi H2H" },
  ];

  return (
    <div className="min-h-screen auth-shell">
      <div className="mx-auto w-full max-w-6xl px-2 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-primary/25 bg-primary/15 shadow-sm">
              <span className="font-semibold text-primary">P</span>
            </div>

            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">Admin Panel</div>
              <div className="text-xs text-muted-foreground">PulsaKilat</div>
            </div>
          </div>

          <button
            className="rounded-md border border-border/60 bg-card/60 px-3 py-2 text-sm hover:bg-card/80"
            onClick={() => {
              localStorage.removeItem("auth_token");
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  active
                    ? "border-primary/30 bg-primary/10"
                    : "border-border/60 bg-card/50 hover:bg-card/70"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </div>

        <div className="auth-card rounded-xl p-0">{children}</div>
      </div>
    </div>
  );
}
