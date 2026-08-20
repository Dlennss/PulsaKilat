"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Landmark,
  Loader2,
  Plus,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";

type WithdrawRow = {
  id: number;
  ref_id: string;
  amount: number;
  source_type?: "main_balance" | "credit";
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

type SourceType = "main_balance" | "credit";

function fmtIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function sourceLabel(source?: string) {
  return source === "credit" ? "Saldo Kredit" : "Saldo Utama";
}

function statusInfo(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
      return { label: "Berhasil", className: "bg-emerald-100 text-emerald-700" };
    case "rejected":
      return { label: "Ditolak · Dikembalikan", className: "bg-rose-100 text-rose-700" };
    case "processing_provider":
      return { label: "Dikirim Otomatis", className: "bg-sky-100 text-sky-700" };
    default:
      return { label: "Menunggu Operator", className: "bg-amber-100 text-amber-700" };
  }
}

export function RetailWithdrawClient({ authToken }: Props) {
  const [mainBalance, setMainBalance] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [items, setItems] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("main_balance");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");

  const sourceBalance = sourceType === "credit" ? creditBalance : mainBalance;
  const amountValue = Number.parseInt(amount.replace(/\D/g, ""), 10) || 0;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [listRes, profileRes, creditRes] = await Promise.all([
        fetch("/api/me/retail/withdraw-requests?limit=50&offset=0", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" }),
        fetch("/api/me/profile", { headers: { Authorization: `Bearer ${authToken}` }, cache: "no-store" }),
        fetch("/api/agent-credit/my-applications", { cache: "no-store" }),
      ]);
      const listJSON = await listRes.json().catch(() => ({}));
      const profileJSON = await profileRes.json().catch(() => ({}));
      const creditJSON = await creditRes.json().catch(() => ({}));
      if (!listRes.ok || !listJSON?.ok) throw new Error(listJSON?.error || "Gagal memuat riwayat penarikan.");

      const applications = Array.isArray(creditJSON?.items) ? creditJSON.items : [];
      setItems(Array.isArray(listJSON.items) ? listJSON.items : []);
      setMainBalance(profileRes.ok && profileJSON?.ok ? Number(profileJSON?.profile?.saldo || 0) : 0);
      setCreditBalance(applications.reduce((total: number, item: { credit_available_amount?: number; loan_status?: string }) => {
        return String(item.loan_status || "").toLowerCase() === "active"
          ? total + Math.max(0, Number(item.credit_available_amount || 0))
          : total;
      }, 0));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "";
      setError(
        !message || message.toLowerCase() === "internal error"
          ? "Data penarikan belum dapat dimuat. Silakan muat ulang."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [authToken]);

  useEffect(() => {
    const hasAwaitingConfirmation = items.some((item) => item.status === "processing_provider");
    if (!hasAwaitingConfirmation) return;

    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [items]);

  useEffect(() => {
    if (!showCreateModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreateModal]);

  function openCreate() {
    setError("");
    setSuccess("");
    setSourceType("main_balance");
    setAmount("");
    setShowCreateModal(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (amountValue <= 0) {
      setError("Masukkan nominal penarikan yang valid.");
      return;
    }
    if (amountValue > sourceBalance) {
      setError(`Saldo ${sourceLabel(sourceType).toLowerCase()} tidak mencukupi.`);
      return;
    }
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      setError("Data rekening tujuan wajib lengkap.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/me/retail/withdraw-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount: amountValue,
          source_type: sourceType,
          bank_name: bankName.trim(),
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          note: note.trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error(body?.error || "Pengajuan penarikan gagal.");

      const providerStatus = String(body?.item?.status || "").toLowerCase();
      if (providerStatus === "approved") {
        setSuccess(`${fmtIDR(amountValue)} berhasil dikirim ke ${bankName.trim()}.`);
      } else if (providerStatus === "processing_provider") {
        setSuccess(`${fmtIDR(amountValue)} sudah dikirim otomatis ke ${bankName.trim()}.`);
      } else {
        setSuccess(`Penarikan ${fmtIDR(amountValue)} berhasil diajukan.`);
      }
      setAmount("");
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setNote("");
      setShowCreateModal(false);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pengajuan penarikan gagal.");
    } finally {
      setSaving(false);
    }
  }

  const awaitingConfirmation = useMemo(
    () => items.filter((item) => item.status === "pending" || item.status === "processing_provider"),
    [items],
  );
  const pendingCount = awaitingConfirmation.length;
  const pendingAmount = useMemo(
    () => awaitingConfirmation.reduce((total, item) => total + Number(item.amount || 0), 0),
    [awaitingConfirmation],
  );

  return (
    <div className="space-y-4 text-slate-950">
      <section className="border-b border-emerald-200 bg-white px-1 pb-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <ArrowDownToLine className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Penarikan Agent</p>
            <h1 className="mt-1 text-2xl font-black">Tarik Saldo</h1>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Tarik saldo utama atau saldo kredit ke rekening tujuan.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <WalletCards className="h-5 w-5 text-emerald-700" />
          <p className="mt-3 text-[10px] font-black uppercase text-slate-400">Saldo Utama</p>
          <p className="mt-1 text-lg font-black text-emerald-700">{fmtIDR(mainBalance)}</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-white p-3">
          <BadgeDollarSign className="h-5 w-5 text-sky-700" />
          <p className="mt-3 text-[10px] font-black uppercase text-slate-400">Saldo Kredit</p>
          <p className="mt-1 text-lg font-black text-sky-700">{fmtIDR(creditBalance)}</p>
        </div>
      </section>

      {success ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{success}</div> : null}
      {!showCreateModal && error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-bold text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-base font-black">Riwayat Penarikan</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Status pencairan terbaru.</p>
            <span className={pendingCount > 0 ? "mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700" : "mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500"}>
              <Clock3 className="h-3.5 w-3.5" />
              {pendingCount > 0 ? `${pendingCount} menunggu konfirmasi · ${fmtIDR(pendingAmount)}` : "Tidak ada penarikan aktif"}
            </span>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white">
            <Plus className="h-4 w-4" /> Ajukan
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? <div className="flex items-center gap-2 px-4 py-6 text-xs font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Memuat penarikan...</div> : null}
          {!loading && items.length === 0 ? <div className="px-4 py-8 text-center text-xs font-semibold text-slate-500">Belum ada pengajuan penarikan.</div> : null}
          {items.map((item) => {
            const status = statusInfo(item.status);
            return (
              <div key={item.id} className="flex items-start gap-3 px-4 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><ReceiptText className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{fmtIDR(item.amount)}</p>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-500">{sourceLabel(item.source_type)} · {item.bank_name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-2 truncate text-[10px] font-semibold text-slate-400">{item.ref_id} · {item.account_number}</p>
                  {item.reject_reason ? <p className="mt-1 text-[10px] font-semibold text-rose-600">{item.reject_reason}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:py-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-700">Pengajuan Baru</p>
                  <h3 className="mt-1 text-xl font-black">Tarik ke Rekening</h3>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-500" aria-label="Tutup"><X className="h-5 w-5" /></button>
              </div>

              <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
                <fieldset>
                  <legend className="text-[10px] font-black uppercase text-slate-500">Sumber dana</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([
                      { id: "main_balance" as const, label: "Saldo Utama", balance: mainBalance, icon: WalletCards },
                      { id: "credit" as const, label: "Saldo Kredit", balance: creditBalance, icon: BadgeDollarSign },
                    ]).map((source) => {
                      const Icon = source.icon;
                      const active = sourceType === source.id;
                      return (
                        <button key={source.id} type="button" onClick={() => { setSourceType(source.id); setAmount(""); setError(""); }} className={active ? "min-w-0 rounded-lg border-2 border-emerald-600 bg-emerald-50 p-3 text-left" : "min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-left"}>
                          <Icon className={active ? "h-5 w-5 text-emerald-700" : "h-5 w-5 text-slate-400"} />
                          <span className="mt-2 block text-xs font-black">{source.label}</span>
                          <span className="mt-1 block truncate text-[10px] font-bold text-slate-500">{fmtIDR(source.balance)}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-500">Nominal penarikan</span>
                  <div className="mt-2 flex gap-2">
                    <input value={amount} onChange={(event) => { setAmount(event.target.value.replace(/\D/g, "")); setError(""); }} inputMode="numeric" placeholder="Masukkan nominal" className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-black outline-none focus:border-emerald-600" />
                    <button type="button" onClick={() => setAmount(String(sourceBalance))} disabled={sourceBalance <= 0} className="h-11 w-16 shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 text-[10px] font-black text-emerald-700 disabled:opacity-50">Semua</button>
                  </div>
                </label>

                <div className="grid gap-3">
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-600" placeholder="Nama bank" value={bankName} onChange={(event) => setBankName(event.target.value)} />
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-600" placeholder="Nama pemilik rekening" value={accountName} onChange={(event) => setAccountName(event.target.value)} />
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-600" placeholder="Nomor rekening" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} />
                  <textarea className="min-h-20 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-emerald-600" placeholder="Catatan opsional" value={note} onChange={(event) => setNote(event.target.value)} />
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs">
                  <div className="flex justify-between gap-3 text-slate-500"><span>Sumber dana</span><span className="font-black text-slate-900">{sourceLabel(sourceType)}</span></div>
                  <div className="mt-2 flex justify-between gap-3 text-slate-500"><span>Dana diterima</span><span className="font-black text-emerald-700">{fmtIDR(amountValue)}</span></div>
                  {sourceType === "credit" ? <p className="mt-3 border-t border-slate-200 pt-2 text-[10px] font-semibold leading-4 text-slate-500">Tagihan pinjaman tidak berubah. Nominal hanya ditahan dari saldo kredit tersedia.</p> : null}
                </div>
                </div>

                <div className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                  {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div> : null}
                  <button type="submit" disabled={saving || sourceBalance <= 0} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 text-xs font-black text-white disabled:bg-slate-300">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                    {saving ? "Mengajukan..." : "Ajukan Penarikan"}
                  </button>
                </div>
              </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
