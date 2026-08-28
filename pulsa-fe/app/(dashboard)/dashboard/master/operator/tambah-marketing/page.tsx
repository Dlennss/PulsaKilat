"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleCheck, Mail, RefreshCw, Search, ShieldCheck, UserPlus, UsersRound, UserX } from "lucide-react";
import RegisterMemberModal from "@/components/dashboard/RegisterMemberModal";

type MarketingAccount = {
  id: number;
  nama?: string;
  email?: string;
  phone?: string;
  role?: string;
  aktif?: boolean;
  dibuat_pada?: string;
};

export default function OperatorTambahMarketingPage() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<MarketingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/members?scope=retail&role=marketing&limit=200", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { rows?: MarketingAccount[]; items?: MarketingAccount[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Akun marketing tidak dapat dimuat");
      setAccounts(Array.isArray(body.rows) ? body.rows : Array.isArray(body.items) ? body.items : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Akun marketing tidak dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter((account) => [account.nama, account.email, account.phone].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [accounts, search]);

  const activeCount = accounts.filter((account) => account.aktif).length;
  const inactiveCount = accounts.length - activeCount;

  const formatCreatedAt = (value?: string) => value
    ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "-";

  return (
    <main className="min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="overflow-hidden rounded-lg bg-[#075c46] text-white shadow-[0_16px_36px_rgba(4,80,62,0.18)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-emerald-800"><UsersRound className="h-6 w-6" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">Manajemen Tim</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">Akun Marketing</h1>
                <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-emerald-50 sm:text-sm">Kelola tim yang memantau agent binaan dan dokumen kredit tanpa akses keputusan operator.</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-lime-300 px-5 text-sm font-black text-emerald-950 shadow-sm transition hover:bg-lime-200">
              <UserPlus className="h-5 w-5" /> Tambah Marketing
            </button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary icon={<UsersRound className="h-5 w-5" />} label="Total Marketing" value={accounts.length} tone="emerald" />
          <Summary icon={<ShieldCheck className="h-5 w-5" />} label="Akun Aktif" value={activeCount} tone="blue" />
          <Summary icon={<UserX className="h-5 w-5" />} label="Akun Nonaktif" value={inactiveCount} tone="amber" />
        </section>

        <section className="mt-4 overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-lg font-black text-slate-950">Daftar Marketing</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{visibleAccounts.length} akun ditampilkan</p>
            </div>
            <div className="flex gap-2">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:w-72">
                <Search className="h-4 w-4 shrink-0 text-emerald-700" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, atau nomor" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-slate-400" />
              </label>
              <button type="button" onClick={() => void loadAccounts()} disabled={loading} title="Muat ulang daftar" aria-label="Muat ulang daftar" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 disabled:opacity-60">
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </button>
            </div>
          </div>

          {error ? <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 sm:m-5">{error}</div> : null}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#e8f7f0] text-[10px] font-black uppercase tracking-[0.12em] text-emerald-900">
                <tr><th className="px-5 py-3">Marketing</th><th className="px-4 py-3">Kontak</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Terdaftar</th></tr>
              </thead>
              <tbody>
                {visibleAccounts.map((account) => (
                  <tr key={account.id} className="border-t border-slate-100 transition hover:bg-emerald-50/50">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 font-black text-emerald-800">{(account.nama || "M").slice(0, 1).toUpperCase()}</span><div><p className="font-black text-slate-950">{account.nama || "Marketing"}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-400">ID #{account.id}</p></div></div></td>
                    <td className="px-4 py-4"><p className="inline-flex items-center gap-2 font-semibold text-slate-700"><Mail className="h-3.5 w-3.5 text-emerald-600" />{account.email || "-"}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{account.phone || "Nomor belum tersedia"}</p></td>
                    <td className="px-4 py-4"><StatusBadge active={Boolean(account.aktif)} /></td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-500">{formatCreatedAt(account.dibuat_pada)}</td>
                  </tr>
                ))}
                {!loading && visibleAccounts.length === 0 ? <tr><td colSpan={4} className="px-5 py-14 text-center font-semibold text-slate-400">Akun marketing tidak ditemukan.</td></tr> : null}
                {loading ? <tr><td colSpan={4} className="px-5 py-14 text-center font-semibold text-slate-400">Memuat akun marketing...</td></tr> : null}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {visibleAccounts.map((account) => (
              <article key={account.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 font-black text-emerald-800">{(account.nama || "M").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950">{account.nama || "Marketing"}</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-400">ID #{account.id} · {formatCreatedAt(account.dibuat_pada)}</p></div><StatusBadge active={Boolean(account.aktif)} /></div><p className="mt-3 truncate text-xs font-semibold text-slate-600">{account.email || "-"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{account.phone || "Nomor belum tersedia"}</p></div>
                </div>
              </article>
            ))}
            {!loading && visibleAccounts.length === 0 ? <p className="px-4 py-14 text-center text-xs font-semibold text-slate-400">Akun marketing tidak ditemukan.</p> : null}
            {loading ? <p className="px-4 py-14 text-center text-xs font-semibold text-slate-400">Memuat akun marketing...</p> : null}
          </div>
        </section>
      </div>

      <RegisterMemberModal
        open={open}
        onClose={() => setOpen(false)}
        fixedRole="marketing"
        title="Tambah Marketing"
        subtitle="Buat akun marketing PulsaKilat untuk memantau agent binaan."
        theme="retail"
        createEndpoint="/api/operator/marketing/create"
        onSuccess={async () => { await loadAccounts(); }}
      />
    </main>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}><CircleCheck className="h-3.5 w-3.5" />{active ? "Aktif" : "Nonaktif"}</span>;
}

function Summary({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "blue" | "amber" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-800",
    blue: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <div className="flex min-h-24 items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]"><div><p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span></div>;
}
