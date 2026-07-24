"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Coins, Landmark, ReceiptText, Users, Wallet } from "lucide-react";
import OverviewStatCard from "@/components/dashboard/OverviewStatCard";
import DashboardProfileCard from "@/components/dashboard/DashboardProfileCard";

type MembersResp = {
  ok?: boolean;
  items?: Array<{ id: number }>;
  total_count?: number;
  total_saldo?: number;
};

type BankResp = {
  ok?: boolean;
  items?: Array<{ saldo?: number }>;
};

type ProviderWalletResp = {
  ok?: boolean;
  data?: Array<{
    provider: string;
    saldo_internal?: number;
    saldo_provider?: number;
    selisih?: number;
    snapshot_at?: string;
  }>;
};

type OverviewData = {
  h2hCount: number;
  retailCount: number;
  h2hSaldo: number;
  retailSaldo: number;
  totalMemberSaldo: number;
  totalBankSaldo: number;
  totalProviderSaldo: number;
  totalProvider: number;
  profit: number;
};

function authHeader(): Record<string, string> {
  const t = localStorage.getItem("auth_token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(n) ? n : 0);
}

function fmtCurrency(n: number): string {
  return `Rp ${fmtNumber(n)}`;
}

export default function AdminHome() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverviewData>({
    h2hCount: 0,
    retailCount: 0,
    h2hSaldo: 0,
    retailSaldo: 0,
    totalMemberSaldo: 0,
    totalBankSaldo: 0,
    totalProviderSaldo: 0,
    totalProvider: 0,
    profit: 0,
  });

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      try {
        const [h2hRes, retailRes, bankRes, providerWalletRes] = await Promise.all([
          fetch("/api/admin/members?scope=h2h&limit=1&offset=0", {
            headers: authHeader(),
            cache: "no-store",
          }),
          fetch("/api/admin/members?scope=retail&limit=1&offset=0", {
            headers: authHeader(),
            cache: "no-store",
          }),
          fetch("/api/admin/master/bank", {
            headers: authHeader(),
            cache: "no-store",
          }),
          fetch("/api/admin/provider/wallets", {
            headers: authHeader(),
            cache: "no-store",
          }),
        ]);

        const [h2hJson, retailJson, bankJson, providerWalletJson] = await Promise.all([
          h2hRes.json().catch(() => ({} as MembersResp)),
          retailRes.json().catch(() => ({} as MembersResp)),
          bankRes.json().catch(() => ({} as BankResp)),
          providerWalletRes.json().catch(() => ({} as ProviderWalletResp)),
        ]);

        const h2hCount = h2hRes.ok && h2hJson.ok ? Number(h2hJson.total_count || 0) : 0;
        const retailCount = retailRes.ok && retailJson.ok ? Number(retailJson.total_count || 0) : 0;
        const h2hSaldo = h2hRes.ok && h2hJson.ok ? Number(h2hJson.total_saldo || 0) : 0;
        const retailSaldo = retailRes.ok && retailJson.ok ? Number(retailJson.total_saldo || 0) : 0;
        const totalMemberSaldo = h2hSaldo + retailSaldo;
        const totalBankSaldo =
          bankRes.ok && bankJson.ok
            ? (Array.isArray(bankJson.items) ? bankJson.items : []).reduce(
                (sum: number, item: { saldo?: number }) => sum + Number(item.saldo || 0),
                0
              )
            : 0;
        const totalProviderSaldo =
          providerWalletRes.ok && providerWalletJson.ok
            ? (Array.isArray(providerWalletJson.data) ? providerWalletJson.data : []).reduce(
                (sum: number, item: { saldo_provider?: number }) => sum + Number(item.saldo_provider || 0),
                0
              )
            : 0;
        const totalProvider =
          providerWalletRes.ok && providerWalletJson.ok ? (Array.isArray(providerWalletJson.data) ? providerWalletJson.data.length : 0) : 0;
        const profit = totalProviderSaldo + totalBankSaldo - totalMemberSaldo;

        setData({
          h2hCount,
          retailCount,
          h2hSaldo,
          retailSaldo,
          totalMemberSaldo,
          totalBankSaldo,
          totalProviderSaldo,
          totalProvider,
          profit,
        });
      } finally {
        setLoading(false);
      }
    }

    void loadOverview();
  }, []);

  return (
    <div className="space-y-4 p-2">
      <DashboardProfileCard
        role="admin"
        description="Akun admin aktif dengan akses penuh ke operasional, audit, wallet, dan master data."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewStatCard
          title="Jumlah Akun H2H"
          value={loading ? "..." : fmtNumber(data.h2hCount)}
          icon={<Users className="h-4 w-4" />}
          tone="sky"
        />
        <OverviewStatCard
          title="Jumlah Akun Retail"
          value={loading ? "..." : fmtNumber(data.retailCount)}
          icon={<Users className="h-4 w-4" />}
          tone="emerald"
        />
        <OverviewStatCard
          title="Provider Aktif"
          value={loading ? "..." : fmtNumber(data.totalProvider)}
          icon={<Building2 className="h-4 w-4" />}
          tone="violet"
        />
        <OverviewStatCard
          title="Jumlah Saldo H2H"
          value={loading ? "..." : fmtCurrency(data.h2hSaldo)}
          icon={<Wallet className="h-4 w-4" />}
          tone="sky"
        />
        <OverviewStatCard
          title="Jumlah Saldo Retail"
          value={loading ? "..." : fmtCurrency(data.retailSaldo)}
          icon={<Wallet className="h-4 w-4" />}
          tone="emerald"
        />
        <OverviewStatCard
          title="Total Saldo Member"
          value={loading ? "..." : fmtCurrency(data.totalMemberSaldo)}
          icon={<Wallet className="h-4 w-4" />}
          tone="amber"
        />
        <OverviewStatCard
          title="Total Saldo Bank"
          value={loading ? "..." : fmtCurrency(data.totalBankSaldo)}
          icon={<Landmark className="h-4 w-4" />}
          tone="sky"
        />
        <OverviewStatCard
          title="Total Saldo Provider"
          value={loading ? "..." : fmtCurrency(data.totalProviderSaldo)}
          icon={<Building2 className="h-4 w-4" />}
          tone="violet"
        />
        <OverviewStatCard
          title="Profit"
          value={loading ? "..." : fmtCurrency(data.profit)}
          icon={<Coins className="h-4 w-4" />}
          tone={data.profit >= 0 ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/dashboard/admin/komisi"
          className="rounded-2xl border border-white/12 bg-linear-to-br from-slate-900/85 via-slate-900/65 to-violet-950/25 p-5 shadow-[0_22px_48px_-34px_rgba(168,85,247,0.55)] transition hover:border-violet-400/35"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-white">Komisi & Laporan</div>
              <div className="mt-1 text-sm text-white/65">Pantau komisi agent/master dan ringkasan transaksi harian 3 bulan terakhir.</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-300">
              <Coins className="h-5 w-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/wallet-activity"
          className="rounded-2xl border border-white/12 bg-linear-to-br from-slate-900/85 via-slate-900/65 to-emerald-950/25 p-5 shadow-[0_22px_48px_-34px_rgba(16,185,129,0.55)] transition hover:border-emerald-400/35"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-white">Aktivitas Wallet</div>
              <div className="mt-1 text-sm text-white/65">Pantau koreksi saldo member dan provider oleh admin atau operator wallet.</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/admin/transaksi/member-status-logs"
          className="rounded-2xl border border-white/12 bg-linear-to-br from-slate-900/85 via-slate-900/65 to-cyan-950/25 p-5 shadow-[0_22px_48px_-34px_rgba(56,189,248,0.75)] transition hover:border-cyan-400/35"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-white">Log Status Member</div>
              <div className="mt-1 text-sm text-white/65">Lihat histori perubahan status transaksi member untuk monitoring operasional.</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
