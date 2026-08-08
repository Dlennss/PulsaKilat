"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Check, Clipboard, Copy, LoaderCircle, QrCode, ShieldCheck } from "lucide-react";

type BankOption = {
  id: number;
  nama: string;
  nomor_rekening: string;
  atas_nama: string;
  aktif: boolean;
};

type DepositTicket = {
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
};

type Props = { authToken: string };

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000] as const;

function fmtIDR(value: number) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function ticketStatus(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "ticket": return "Menunggu transfer";
    case "pending": return "Menunggu verifikasi";
    case "approved": return "Saldo masuk";
    case "rejected": return "Ditolak";
    default: return status || "-";
  }
}

export function RetailTopupClient({ authToken }: Props) {
  const [amount, setAmount] = useState("");
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [bankID, setBankID] = useState("");
  const [activeTicket, setActiveTicket] = useState<DepositTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const nominal = Number(amount || 0);
  const selectedBank = banks.find((bank) => String(bank.id) === bankID) || banks[0] || null;
  const hasOpenTicket = activeTicket && ["ticket", "pending"].includes(String(activeTicket.status).toLowerCase());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [bankRes, historyRes] = await Promise.all([
        fetch("/api/me/deposit/banks", { headers, cache: "no-store" }),
        fetch("/api/me/history/deposit?limit=25", { headers, cache: "no-store" }),
      ]);
      const bankJson = await bankRes.json().catch(() => ({}));
      const historyJson = await historyRes.json().catch(() => ({}));
      if (!bankRes.ok || !bankJson?.ok) throw new Error(bankJson?.error || "Rekening tujuan belum dapat dimuat.");
      if (!historyRes.ok || !historyJson?.ok) throw new Error(historyJson?.error || "Riwayat topup belum dapat dimuat.");

      const nextBanks = (Array.isArray(bankJson.items) ? bankJson.items : []).filter((item: BankOption) => item.aktif);
      setBanks(nextBanks);
      setBankID((current) => current || String(nextBanks[0]?.id || ""));

      const tickets = (Array.isArray(historyJson.rows) ? historyJson.rows : []).filter(
        (row: DepositTicket) => String(row.metode || "").toLowerCase() !== "qris",
      );
      setActiveTicket(tickets.find((row: DepositTicket) => ["ticket", "pending"].includes(String(row.status).toLowerCase())) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data topup belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { void load(); }, [load]);

  const preview = useMemo(() => ({ nominal: Number.isFinite(nominal) ? nominal : 0 }), [nominal]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!Number.isFinite(nominal) || nominal <= 0) return setError("Masukkan nominal isi saldo yang valid.");
    if (!selectedBank) return setError("Rekening tujuan belum tersedia.");

    setSaving(true);
    try {
      const response = await fetch("/api/me/deposit/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ amount: Math.floor(nominal), bank_id: selectedBank.id, metode: "transfer" }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.item) throw new Error(json?.error || "Gagal membuat tiket topup.");
      setActiveTicket(json.item);
      setAmount("");
      setMessage("Tiket dibuat. Transfer sesuai nominal yang tercantum.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tiket topup.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmTransfer() {
    if (!activeTicket?.id) return;
    setConfirming(true);
    setError("");
    try {
      const response = await fetch("/api/me/deposit/request/confirm-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ id: activeTicket.id }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.ok || !json?.item) throw new Error(json?.error || "Konfirmasi transfer gagal.");
      setActiveTicket(json.item);
      setMessage("Transfer dikirim untuk diverifikasi. Saldo masuk setelah pembayaran cocok.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Konfirmasi transfer gagal.");
    } finally {
      setConfirming(false);
    }
  }

  async function copy(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setMessage("Berhasil disalin.");
  }

  return (
    <div className="space-y-4">
      <section className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Isi Saldo</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">Tambah dana ke dompet</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">Saldo utama dipakai untuk membeli seluruh produk PulsaKilat.</p>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">{message}</div> : null}

      {loading ? (
        <div className="grid min-h-56 place-items-center rounded-[28px] bg-white"><LoaderCircle className="h-6 w-6 animate-spin text-[#047857]" /></div>
      ) : hasOpenTicket && activeTicket ? (
        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
          <div className="border-b border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#047857]">Tiket Topup</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">{ticketStatus(activeTicket.status)}</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#047857]"><Clipboard className="h-5 w-5" /></span>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">Transfer ke</p>
              <p className="mt-1 text-base font-black text-slate-950">{activeTicket.bank_nama}</p>
              <button type="button" onClick={() => void copy(activeTicket.bank_nomor_rekening)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
                <span><span className="block text-[10px] font-bold text-slate-400">Nomor rekening</span><span className="mt-1 block text-base font-black text-slate-950">{activeTicket.bank_nomor_rekening}</span></span>
                <Copy className="h-4 w-4 text-[#047857]" />
              </button>
              <p className="mt-3 text-xs font-semibold text-slate-500">a.n. {activeTicket.bank_atas_nama}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Transfer tepat sampai tiga digit terakhir</p>
              <button type="button" onClick={() => void copy(String(activeTicket.amount))} className="mt-2 inline-flex items-center gap-2 text-2xl font-black text-slate-950">
                Rp {fmtIDR(activeTicket.amount)} <Copy className="h-4 w-4 text-amber-600" />
              </button>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">Nominal unik membantu pembayaran dikenali otomatis.</p>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500"><span>Referensi</span><span className="font-black text-slate-800">{activeTicket.ref_id}</span></div>

            {String(activeTicket.status).toLowerCase() === "ticket" ? (
              <button type="button" onClick={() => void confirmTransfer()} disabled={confirming} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#047857] px-4 text-xs font-black text-white disabled:opacity-60">
                {confirming ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {confirming ? "Mengirim..." : "Saya Sudah Transfer"}
              </button>
            ) : (
              <div className="rounded-2xl bg-sky-50 px-4 py-3 text-center text-xs font-bold text-sky-700">Pembayaran sedang dicocokkan. Saldo akan masuk setelah terverifikasi.</div>
            )}
          </div>
        </section>
      ) : (
        <form className="space-y-4" onSubmit={createTicket}>
          <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 1</p>
            <h2 className="mt-1 text-base font-black text-slate-950">Pilih nominal</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {QUICK_AMOUNTS.map((value) => (
                <button key={value} type="button" onClick={() => setAmount(String(value))} className={`h-12 rounded-2xl border text-xs font-black ${nominal === value ? "border-[#047857] bg-emerald-50 text-[#047857]" : "border-slate-200 bg-slate-50 text-slate-700"}`}>Rp {fmtIDR(value)}</button>
              ))}
            </div>
            <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fffb] px-4">
              <span className="text-xs font-black text-[#047857]">Rp</span>
              <input className="min-w-0 flex-1 bg-transparent text-sm font-black outline-none" placeholder="Masukkan nominal" inputMode="numeric" value={amount ? fmtIDR(nominal) : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            </label>
          </section>

          <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 2</p><h2 className="mt-1 text-base font-black text-slate-950">Metode pembayaran</h2></div><ShieldCheck className="h-5 w-5 text-[#047857]" /></div>
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3 opacity-70">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-400"><QrCode className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-700">QRIS Pulsa24Jam</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">Menunggu aktivasi API QRIS H2H</span></span><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-700">Belum aktif</span></div>
            </div>
            <div className="mt-3 rounded-[20px] border border-[#047857] bg-emerald-50 p-3">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#047857]"><Building2 className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-950">Transfer Bank</span><span className="mt-1 block text-[10px] font-semibold text-slate-500">Saldo masuk setelah pembayaran terverifikasi</span></span><span className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-white"><Check className="h-4 w-4" /></span></div>
            </div>
            {banks.length > 1 ? <select value={bankID} onChange={(e) => setBankID(e.target.value)} className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700">{banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.nama} - {bank.atas_nama}</option>)}</select> : null}
          </section>

          <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
            <h2 className="text-base font-black text-slate-950">Ringkasan</h2>
            <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Nominal isi saldo</span><span className="font-black text-slate-950">Rp {fmtIDR(preview.nominal)}</span></div>
            <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-500">Nominal transfer akan ditambahkan kode unik agar pembayaran dapat dicocokkan.</p>
            <button type="submit" disabled={saving || !banks.length} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#047857] text-xs font-black text-white disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{saving ? "Membuat tiket..." : "Buat Tiket Topup"}</button>
          </section>
        </form>
      )}
    </div>
  );
}
