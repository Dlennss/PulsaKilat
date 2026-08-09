"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, LoaderCircle, QrCode, RefreshCcw, ShieldCheck, Sparkles, X } from "lucide-react";

type DepositRow = {
  ref_id: string;
  metode: string;
  status: string;
};

type QrisItem = {
  ref_id: string;
  amount: number;
  fee_admin: number;
  gross_amount: number;
  status: string;
  payment_type?: string;
  transaction_id?: string;
  qr_url?: string;
  expired_at?: string;
};

type Props = {
  authToken: string;
  initialAmount?: number;
};

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000] as const;

function fmtIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function statusLabel(value: string) {
  switch (String(value || "").toLowerCase()) {
    case "approved": return "Berhasil";
    case "pending": return "Menunggu pembayaran";
    case "rejected": return "Gagal atau kedaluwarsa";
    default: return value || "-";
  }
}

export function RetailTopupClient({ authToken, initialAmount = 0 }: Props) {
  const [amount, setAmount] = useState(initialAmount > 0 ? String(Math.floor(initialAmount)) : "");
  const [activeQris, setActiveQris] = useState<QrisItem | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const nominal = Number(amount || 0);
  const preview = useMemo(() => ({ nominal: Number.isFinite(nominal) ? nominal : 0 }), [nominal]);

  const loadStatus = useCallback(async (refID: string, notify = false) => {
    if (!refID) return;
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ ref_id: refID, refresh: "1" });
      const response = await fetch(`/api/me/deposit/request/qris/status?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.item) throw new Error(json?.error || "Gagal memuat status QRIS.");
      setActiveQris(json.item);
      setShowPayment(true);
      if (notify || ["approved", "rejected"].includes(String(json.item.status).toLowerCase())) {
        setMessage(`Status topup: ${statusLabel(json.item.status)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat status QRIS.");
    } finally {
      setRefreshing(false);
    }
  }, [authToken]);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const response = await fetch("/api/me/history/deposit?limit=25", {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.ok) return;
        const rows = Array.isArray(json.rows) ? json.rows : [];
        const pending = rows.find((row: DepositRow) =>
          String(row.metode).toLowerCase() === "qris" && String(row.status).toLowerCase() === "pending",
        );
        if (pending?.ref_id) await loadStatus(pending.ref_id);
      } catch {}
    };
    void loadPending();
  }, [authToken, loadStatus]);

  useEffect(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    if (!showPayment || !activeQris?.ref_id || String(activeQris.status).toLowerCase() !== "pending") return;
    refreshTimer.current = setInterval(() => void loadStatus(activeQris.ref_id), 5000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [activeQris?.ref_id, activeQris?.status, loadStatus, showPayment]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!Number.isFinite(nominal) || nominal <= 0) return setError("Masukkan nominal isi saldo yang valid.");

    setSaving(true);
    try {
      const response = await fetch("/api/me/deposit/request/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ amount: Math.floor(nominal) }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.item) throw new Error(json?.error || "Gagal membuat QRIS.");
      setActiveQris(json.item);
      setShowPayment(true);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat QRIS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Isi Saldo</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Tambah dana ke dompet</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">Pilih nominal lalu selesaikan pembayaran melalui QRIS.</p>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{message}</div> : null}

      <form className="space-y-4" onSubmit={submit}>
        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 1</p><h2 className="mt-1 text-base font-black text-slate-950">Pilih nominal</h2></div>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime-100 text-[#047857]"><Sparkles className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {QUICK_AMOUNTS.map((value) => (
              <button key={value} type="button" onClick={() => setAmount(String(value))} className={`h-12 rounded-2xl border text-xs font-black ${nominal === value ? "border-[#047857] bg-emerald-50 text-[#047857]" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Rp {fmtIDR(value)}</button>
            ))}
          </div>
          <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fffb] px-4">
            <span className="text-xs font-black text-[#047857]">Rp</span>
            <input className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none" placeholder="Masukkan nominal" inputMode="numeric" value={amount ? fmtIDR(nominal) : ""} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} />
          </label>
        </section>

        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 2</p><h2 className="mt-1 text-base font-black text-slate-950">Metode pembayaran</h2></div><ShieldCheck className="h-5 w-5 text-[#047857]" /></div>
          <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-[#047857] bg-emerald-50 p-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#047857]"><QrCode className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-950">QRIS</span><span className="mt-1 block text-[10px] font-semibold text-slate-500">Scan dari aplikasi bank atau e-wallet</span></span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-white"><Check className="h-4 w-4" /></span>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
          <h2 className="text-base font-black text-slate-950">Ringkasan</h2>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Nominal isi saldo</span><span className="font-black text-slate-950">Rp {fmtIDR(preview.nominal)}</span></div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3"><span className="text-xs font-semibold text-slate-500">Total pembayaran</span><span className="text-lg font-black text-[#047857]">Rp {fmtIDR(preview.nominal)}</span></div>
          <button type="submit" disabled={saving} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#047857] text-xs font-black text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{saving ? "Memproses..." : "Lanjut Bayar"}<ChevronRight className="h-4 w-4" /></button>
        </section>
      </form>

      {activeQris && showPayment ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-8">
          <div className="mx-auto w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#047857]">Pembayaran QRIS</p><h2 className="mt-1 text-lg font-black text-slate-950">Topup Saldo</h2></div><button type="button" onClick={() => setShowPayment(false)} aria-label="Tutup" className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center">
              {activeQris.qr_url ? <img src={activeQris.qr_url} alt="Kode QRIS" className="mx-auto aspect-square w-full max-w-60 rounded-2xl bg-white p-3" /> : <div className="mx-auto grid aspect-square w-full max-w-60 place-items-center rounded-2xl bg-white"><QrCode className="h-12 w-12 text-[#047857]" /></div>}
              <p className="mt-3 text-xl font-black text-slate-950">Rp {fmtIDR(activeQris.gross_amount || activeQris.amount)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{statusLabel(activeQris.status)}</p>
            </div>
            <div className="mt-4 grid gap-2">
              {activeQris.qr_url ? <Link href={activeQris.qr_url} target="_blank" className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#047857] text-xs font-black text-white">Buka QRIS</Link> : null}
              <button type="button" onClick={() => void loadStatus(activeQris.ref_id, true)} disabled={refreshing} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-xs font-black text-slate-700 disabled:opacity-60"><RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />{refreshing ? "Mengecek..." : "Cek Status"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
