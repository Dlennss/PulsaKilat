"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, CircleCheck, Mail, RefreshCw, UserPlus } from "lucide-react";
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
  const [open, setOpen] = useState(true);
  const [accounts, setAccounts] = useState<MarketingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/members?scope=retail&role=marketing&limit=200", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { rows?: MarketingAccount[]; items?: MarketingAccount[] };
      setAccounts(Array.isArray(body.rows) ? body.rows : Array.isArray(body.items) ? body.items : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  return (
    <main className="min-h-screen bg-[#eef7f2] p-4 text-slate-950 sm:p-6 lg:p-8">
      <section className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#063b2f,#087b51_58%,#42c94a)] p-6 text-white shadow-[0_20px_50px_rgba(4,120,87,0.2)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.24em] text-lime-100">Operator Kredit</p>
          <h1 className="relative mt-3 text-3xl font-black sm:text-4xl">Tambah Marketing</h1>
          <p className="relative mt-3 max-w-xl text-sm font-semibold leading-6 text-emerald-50/90">
            Buat akun marketing baru untuk membantu memantau agent dan aktivitas kredit di lapangan.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-emerald-900 shadow-lg transition hover:bg-lime-100"
          >
            <UserPlus className="h-5 w-5" />
            Buat Akun Marketing
          </button>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <BriefcaseBusiness className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-black">Akses Marketing</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Marketing dapat memantau agent binaan dan dokumen, tanpa mengambil keputusan kredit.</p>
          <div className="mt-5 grid gap-3">
            {[
              "Memantau agent binaan",
              "Melihat dokumen pengajuan",
              "Tidak dapat menyetujui atau menolak kredit",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 w-full max-w-5xl overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-emerald-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Daftar Akun</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Akun Marketing PulsaKilat</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Kelola akun marketing yang membantu memantau agent binaan.</p>
          </div>
          <button type="button" onClick={() => void loadAccounts()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800 disabled:opacity-60">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Muat Ulang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-emerald-50 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">
              <tr><th className="px-5 py-3">Nama</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Kontak</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Dibuat</th></tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-slate-100 hover:bg-emerald-50/40">
                  <td className="px-5 py-4"><p className="font-black text-slate-950">{account.nama || "Marketing"}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">ID #{account.id}</p></td>
                  <td className="px-4 py-4 font-semibold text-slate-600"><span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-emerald-600" />{account.email || "-"}</span></td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{account.phone || "-"}</td>
                  <td className="px-4 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${account.aktif ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}><CircleCheck className="h-3.5 w-3.5" />{account.aktif ? "Aktif" : "Nonaktif"}</span></td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{account.dibuat_pada ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(account.dibuat_pada)) : "-"}</td>
                </tr>
              ))}
              {!loading && accounts.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center font-semibold text-slate-400">Belum ada akun marketing.</td></tr> : null}
              {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center font-semibold text-slate-400">Memuat akun marketing...</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

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
