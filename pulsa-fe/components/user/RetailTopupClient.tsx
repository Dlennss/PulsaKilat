"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronRight, Copy, Landmark, LoaderCircle, RefreshCcw, ShieldCheck, X } from "lucide-react";

type BankOption = {
  id: number;
  nama: string;
  nomor_rekening: string;
  atas_nama: string;
  aktif: boolean;
};

type DepositRow = {
  id: number;
  ref_id: string;
  bank_nama: string;
  bank_nomor_rekening: string;
  bank_atas_nama: string;
  amount: number;
  requested_amount?: number;
  unique_code?: number;
  metode: string;
  status: string;
  dibuat_pada: string;
};

type Props = { authToken: string; initialAmount?: number };

const MIN_TOPUP = 100_000;
const QUICK_AMOUNTS = [100_000, 200_000, 500_000, 1_000_000] as const;

function fmtIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function statusLabel(value: string) {
  switch (String(value || "").toLowerCase()) {
    case "ticket": return "Menunggu transfer";
    case "pending": return "Menunggu persetujuan admin";
    case "approved": return "Saldo sudah masuk";
    case "rejected": return "Ditolak";
    case "cancelled": return "Dibatalkan";
    default: return value || "-";
  }
}

export function RetailTopupClient({ authToken, initialAmount = 0 }: Props) {
  const suggestedAmount = initialAmount > 0 ? Math.max(Math.ceil(initialAmount), MIN_TOPUP) : 0;
  const [amount, setAmount] = useState(suggestedAmount ? String(suggestedAmount) : "");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankID, setBankID] = useState("");
  const [ticket, setTicket] = useState<DepositRow | null>(null);
  const [history, setHistory] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"confirm" | "cancel" | "">("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const nominal = Number(amount || 0);
  const selectedBank = useMemo(() => banks.find((bank) => String(bank.id) === bankID) || null, [bankID, banks]);

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${authToken}`,
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.ok) throw new Error(json?.error || "Permintaan gagal diproses.");
    return json;
  }, [authToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bankData, historyData] = await Promise.all([
        request("/api/me/deposit/banks"),
        request("/api/me/history/deposit?limit=25"),
      ]);
      const activeBanks = (Array.isArray(bankData.items) ? bankData.items : []).filter((bank: BankOption) => bank.aktif);
      const rows = Array.isArray(historyData.rows) ? historyData.rows as DepositRow[] : [];
      setBanks(activeBanks);
      setHistory(rows);
      setBankID((current) => current || (activeBanks[0]?.id ? String(activeBanks[0].id) : ""));
      const active = rows.find((row) => ["ticket", "pending"].includes(String(row.status).toLowerCase()) && String(row.metode).toLowerCase() !== "qris");
      setTicket(active || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data topup.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!Number.isFinite(nominal) || nominal < MIN_TOPUP) return setError("Minimum topup adalah Rp 100.000.");
    if (!selectedBank) return setError("Pilih rekening bank tujuan.");
    setSaving(true);
    try {
      const data = await request("/api/me/deposit/request", {
        method: "POST",
        body: JSON.stringify({ amount: Math.floor(nominal), bank_id: selectedBank.id, metode: "transfer" }),
      });
      setTicket(data.item);
      setHistory((rows) => [data.item, ...rows.filter((row) => row.id !== data.item.id)]);
      setMessage("Permintaan top up sudah dikirim ke admin. Transfer sesuai nominal yang tertera agar dapat disetujui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tiket topup.");
    } finally {
      setSaving(false);
    }
  }

  async function updateTicket(kind: "confirm" | "cancel") {
    if (!ticket?.id) return;
    setAction(kind);
    setError("");
    setMessage("");
    try {
      const endpoint = kind === "confirm" ? "confirm-transfer" : "cancel-ticket";
      const data = await request(`/api/me/deposit/request/${endpoint}`, { method: "POST", body: JSON.stringify({ id: ticket.id }) });
      setTicket(kind === "cancel" ? null : data.item);
      setMessage(kind === "confirm" ? "Transfer dikirim untuk diverifikasi. Saldo masuk setelah pembayaran cocok." : "Tiket topup dibatalkan.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui tiket.");
    } finally {
      setAction("");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Berhasil disalin.");
  }

  return (
    <div className="space-y-4">
      <section className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Isi Saldo</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Topup melalui bank</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">Minimum topup Rp 100.000. Transfer sesuai nominal tiket agar pembayaran mudah dikenali.</p>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{message}</div> : null}

      {loading ? <div className="grid min-h-48 place-items-center rounded-[28px] bg-white"><LoaderCircle className="h-6 w-6 animate-spin text-[#047857]" /></div> : ticket ? (
        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-5 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#047857]">Permintaan Top Up</p><h2 className="mt-1 text-lg font-black text-slate-950">{statusLabel(ticket.status)}</h2></div>
            <button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-[#047857]" aria-label="Muat ulang"><RefreshCcw className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 space-y-3 rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-[#047857]" /><div><p className="text-xs font-black text-slate-950">{ticket.bank_nama}</p><p className="text-[10px] font-semibold text-slate-500">a.n. {ticket.bank_atas_nama}</p></div></div>
            <button type="button" onClick={() => void copy(ticket.bank_nomor_rekening)} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left"><span><span className="block text-[9px] font-bold uppercase text-slate-400">Nomor rekening</span><span className="text-sm font-black text-slate-950">{ticket.bank_nomor_rekening}</span></span><Copy className="h-4 w-4 text-[#047857]" /></button>
            <button type="button" onClick={() => void copy(String(ticket.amount))} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left"><span><span className="block text-[9px] font-bold uppercase text-slate-400">Transfer tepat sebesar</span><span className="text-xl font-black text-[#047857]">Rp {fmtIDR(ticket.amount)}</span></span><Copy className="h-4 w-4 text-[#047857]" /></button>
            {ticket.unique_code ? <p className="text-[10px] font-semibold text-slate-500">Termasuk kode unik Rp {fmtIDR(ticket.unique_code)}. Saldo yang masuk tetap Rp {fmtIDR(ticket.requested_amount || 0)}.</p> : null}
          </div>
          {String(ticket.status).toLowerCase() === "ticket" ? <div className="mt-4 grid gap-2">
            <button type="button" onClick={() => void updateTicket("confirm")} disabled={Boolean(action)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#047857] text-xs font-black text-white disabled:opacity-60">{action === "confirm" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Saya Sudah Transfer</button>
            <button type="button" onClick={() => void updateTicket("cancel")} disabled={Boolean(action)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 disabled:opacity-60">{action === "cancel" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}Batalkan Tiket</button>
          </div> : <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">Permintaan sudah masuk ke panel admin. Saldo akan bertambah setelah admin menyetujui pembayaran.</p>}
        </section>
      ) : (
        <form className="space-y-4" onSubmit={createTicket}>
          <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
            <h2 className="text-base font-black text-slate-950">Pilih nominal</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5">{QUICK_AMOUNTS.map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className={`h-12 rounded-2xl border text-xs font-black ${nominal === value ? "border-[#047857] bg-emerald-50 text-[#047857]" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Rp {fmtIDR(value)}</button>)}</div>
            <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fffb] px-4"><span className="text-xs font-black text-[#047857]">Rp</span><input className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none" inputMode="numeric" placeholder="Minimum 100.000" value={amount ? fmtIDR(nominal) : ""} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} /></label>
          </section>
          <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
            <div className="flex items-center justify-between"><h2 className="text-base font-black text-slate-950">Rekening tujuan</h2><ShieldCheck className="h-5 w-5 text-[#047857]" /></div>
            <div className="mt-4 space-y-2">{banks.map((bank) => <button key={bank.id} type="button" onClick={() => setBankID(String(bank.id))} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${String(bank.id) === bankID ? "border-[#047857] bg-emerald-50" : "border-slate-200"}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#047857]"><Landmark className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-950">{bank.nama}</span><span className="text-[10px] font-semibold text-slate-500">{bank.nomor_rekening} · {bank.atas_nama}</span></span>{String(bank.id) === bankID ? <Check className="h-4 w-4 text-[#047857]" /> : null}</button>)}</div>
            {!banks.length ? <p className="mt-4 text-xs font-semibold text-rose-600">Belum ada rekening deposit yang aktif.</p> : null}
          </section>
          <button type="submit" disabled={saving || !banks.length} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#047857] text-xs font-black text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{saving ? "Membuat tiket..." : "Buat Tiket Topup"}<ChevronRight className="h-4 w-4" /></button>
        </form>
      )}

      {history.some((row) => !["ticket", "pending"].includes(String(row.status).toLowerCase())) ? <section className="rounded-[28px] bg-white p-4"><h2 className="text-sm font-black text-slate-950">Riwayat terbaru</h2><div className="mt-3 space-y-2">{history.filter((row) => !["ticket", "pending"].includes(String(row.status).toLowerCase())).slice(0, 5).map((row) => <div key={row.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"><div><p className="text-xs font-black text-slate-900">Rp {fmtIDR(row.requested_amount || row.amount)}</p><p className="text-[10px] font-semibold text-slate-500">{row.bank_nama}</p></div><span className="text-[10px] font-black text-[#047857]">{statusLabel(row.status)}</span></div>)}</div></section> : null}
    </div>
  );
}
