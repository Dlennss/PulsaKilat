"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Landmark, Plus, X } from "lucide-react";

type Summary = {
  total_earned: number;
  total_pending_withdraw: number;
  total_approved_withdraw: number;
  available_saldo: number;
};

type WithdrawRow = {
  id: number;
  ref_id: string;
  amount: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  status: string;
  note?: string;
  reject_reason?: string;
  created_at?: string;
};

type Props = {
  authToken: string;
};

function fmtIDR(v: number) {
  return new Intl.NumberFormat("id-ID").format(Number(v || 0));
}

export function RetailWithdrawClient({ authToken }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        fetch("/api/me/retail/commissions/summary", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" }),
        fetch("/api/me/retail/withdraw-requests?limit=50&offset=0", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" }),
      ]);
      const sumJson = await sumRes.json().catch(() => ({}));
      const listJson = await listRes.json().catch(() => ({}));
      if (!sumRes.ok || !sumJson?.ok) throw new Error(sumJson?.error || "Gagal memuat ringkasan.");
      if (!listRes.ok || !listJson?.ok) throw new Error(listJson?.error || "Gagal memuat withdraw.");
      setSummary(sumJson.item || null);
      setItems(Array.isArray(listJson.items) ? listJson.items : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat withdraw retail.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [authToken]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("Nominal withdraw tidak valid.");
      return;
    }
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      setErr("Data rekening wajib lengkap.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/me/retail/withdraw-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: Math.floor(amt),
          bank_name: bankName.trim(),
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          note: note.trim(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || "Gagal membuat withdraw.");
        return;
      }
      setOk(`Withdraw berhasil diajukan. Ref ID: ${j.item?.ref_id || "-"}`);
      setAmount("");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setNote("");
      setShowCreateModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-md border border-violet-100 bg-[linear-gradient(135deg,#fcfbff_0%,#ffffff_54%,#f5f3ff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_58%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-[linear-gradient(135deg,#8b5cf6,#7c3aed)] text-white shadow-[0_10px_20px_rgba(124,58,237,0.18)]">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-700">Withdraw</div>
            <h1 className="text-xl font-bold text-slate-900">Withdraw Fee Retail</h1>
            <p className="text-sm text-slate-600">Ajukan pencairan komisi retail ke rekening tujuan anda.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-md border border-emerald-200 bg-[linear-gradient(180deg,#ffffff_0%,#effcf6_100%)] p-4 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Saldo Tersedia</div>
          <div className="mt-2 text-lg font-bold text-emerald-700">Rp {fmtIDR(summary?.available_saldo || 0)}</div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-amber-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff8eb_100%)] p-4 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pending Withdraw</div>
          <div className="mt-2 text-lg font-bold text-amber-700">Rp {fmtIDR(summary?.total_pending_withdraw || 0)}</div>
        </div>
      </section>

      {ok ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(90deg,#faf5ff,#f8fafc)] px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Riwayat Withdraw</h2>
            <p className="mt-1 text-sm text-slate-500">Daftar pengajuan withdraw fee retail terbaru.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setErr("");
              setOk("");
              setShowCreateModal(true);
            }}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-violet-600 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(124,58,237,0.18)] transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Ajukan
          </button>
        </div>
        <div className="space-y-3 p-5">
          {loading ? <div className="text-sm text-slate-500">Memuat withdraw...</div> : null}
          {!loading && items.length === 0 ? <div className="text-sm text-slate-500">Belum ada request withdraw.</div> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.ref_id}</div>
                  <div className="text-xs text-slate-500">{item.bank_name} • {item.account_name} • {item.account_number}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.note || item.reject_reason || "-"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-violet-700">Rp {fmtIDR(item.amount)}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]">
          <div className="absolute inset-x-0 bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-md bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.24)] md:w-97.5 md:max-w-none">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Ajukan Withdraw</div>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Withdraw Fee Retail</h3>
                <p className="mt-1 text-sm text-slate-500">Lengkapi data rekening tujuan untuk mencairkan komisi retail.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-5">
              {err ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div> : null}

              <form className="grid gap-3" onSubmit={submit}>
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500" placeholder="Nominal withdraw" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500" placeholder="Nama bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500" placeholder="Nama pemilik rekening" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-violet-500" placeholder="Nomor rekening / akun" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                <textarea className="min-h-[92px] rounded-md border border-slate-200 px-3 py-3 text-sm outline-none focus:border-violet-500" placeholder="Catatan opsional" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70" disabled={saving} type="submit">
                  {saving ? "Mengajukan..." : "Ajukan Withdraw"}
                  {!saving ? <ChevronRight className="h-4 w-4" /> : null}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
