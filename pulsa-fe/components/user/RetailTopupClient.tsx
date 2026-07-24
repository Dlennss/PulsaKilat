"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, QrCode, RefreshCcw, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";

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
};

function fmtIDR(v: number) {
  return new Intl.NumberFormat("id-ID").format(Number(v || 0));
}

function statusLabel(v: string) {
  const s = String(v || "").toLowerCase();
  switch (s) {
    case "approved":
      return "Berhasil";
    case "pending":
      return "Menunggu Bayar";
    case "rejected":
      return "Gagal / Kadaluarsa";
    default:
      return v || "-";
  }
}

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000] as const;

export function RetailTopupClient({ authToken }: Props) {
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [amount, setAmount] = useState("");
  const [activeQris, setActiveQris] = useState<QrisItem | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topupPreview = useMemo(() => {
    const nominal = Number(amount || 0);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      return { nominal: 0, fee: 0, gross: 0 };
    }
    const fee = 0;
    return { nominal, fee, gross: nominal + fee };
  }, [amount]);

  const loadStatus = useCallback(async (refID: string, showMessage: boolean) => {
    if (!refID) return;
    setRefreshing(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("ref_id", refID);
      qs.set("refresh", "1");
      const r = await fetch(`/api/me/deposit/request/qris/status?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal memuat status QRIS.");
      const nextItem = j.item || null;
      const nextStatus = String(nextItem?.status || "").toLowerCase();
      setActiveQris(nextItem);
      setShowPaymentModal(Boolean(nextItem));
      if (showMessage || nextStatus === "approved" || nextStatus === "rejected") {
        setOk(`Status topup ${nextItem?.ref_id || refID}: ${statusLabel(nextItem?.status || "")}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat status QRIS.");
    } finally {
      setRefreshing(false);
    }
  }, [authToken]);

  const load = useCallback(async (showActiveRefID?: string) => {
    try {
      const r = await fetch("/api/me/history/deposit?limit=50", {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Gagal memuat riwayat topup.");
      const rows = Array.isArray(j.rows) ? j.rows : [];
      const qrisRows = rows.filter((row: DepositRow) => String(row?.metode || "").toLowerCase() === "qris");
      const targetRefID = showActiveRefID || qrisRows.find((row: DepositRow) => String(row?.status || "").toLowerCase() === "pending")?.ref_id;
      if (targetRefID) {
        await loadStatus(targetRefID, false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memuat topup.");
    }
  }, [authToken, loadStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    const activeRefID = activeQris?.ref_id || "";
    const activeStatus = String(activeQris?.status || "").toLowerCase();
    if (!showPaymentModal || !activeRefID || activeStatus !== "pending") {
      return;
    }

    autoRefreshRef.current = setInterval(() => {
      void loadStatus(activeRefID, false);
    }, 5000);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [activeQris?.ref_id, activeQris?.status, loadStatus, showPaymentModal]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    const nominal = Number(amount || 0);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setErr("Nominal topup tidak valid.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/me/deposit/request/qris", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ amount: Math.floor(nominal) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || "Gagal membuat topup QRIS.");
        return;
      }
      setActiveQris(j.item || null);
      setShowPaymentModal(Boolean(j.item));
      setOk(`QRIS topup dibuat. Ref ID: ${j.item?.ref_id || "-"}`);
      setAmount("");
      await load(j.item?.ref_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal membuat topup QRIS.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Isi Saldo</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Tambah dana ke dompet</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">Pilih nominal, cek ringkasan, lalu lanjutkan pembayaran QRIS.</p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-emerald-950/5 bg-white shadow-[0_18px_42px_rgba(6,78,59,0.11)]">
        {err ? <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div> : null}
        {ok ? <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div> : null}

        <form className="grid gap-3 p-4" onSubmit={submit}>
          <section className="rounded-[24px] border border-emerald-950/10 bg-white p-4 shadow-[0_12px_28px_rgba(6,78,59,0.07)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 1</p>
                <h2 className="mt-1 text-base font-black text-slate-950">Pilih nominal</h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime-100 text-[#047857]">
                <Sparkles className="h-4.5 w-4.5" strokeWidth={2.4} />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {QUICK_AMOUNTS.map((value) => {
                const active = Number(amount || 0) === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={
                      active
                        ? "h-12 rounded-2xl border border-[#047857] bg-emerald-50 text-xs font-black text-[#047857] shadow-[0_10px_20px_rgba(4,120,87,0.12)]"
                        : "h-12 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-700 transition hover:border-emerald-200 hover:bg-white hover:text-[#047857]"
                    }
                  >
                    Rp {fmtIDR(value)}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold text-slate-500">Nominal lain</p>
              <label className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fffb] px-4 ring-1 ring-white">
                <span className="text-xs font-black text-[#047857]">Rp</span>
                <input
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
                  placeholder="Minimal 10.000"
                  inputMode="numeric"
                  value={amount ? fmtIDR(Number(amount)) : ""}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-950/10 bg-white p-4 shadow-[0_12px_28px_rgba(6,78,59,0.07)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#047857]">Langkah 2</p>
                <h2 className="mt-1 text-base font-black text-slate-950">Metode pembayaran</h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
                <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.4} />
              </span>
            </div>

            <div className="grid gap-2.5">
              <button
                type="button"
                className="flex items-center gap-3 rounded-[20px] border border-[#047857] bg-emerald-50/70 p-3 text-left shadow-[0_10px_22px_rgba(4,120,87,0.10)]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857] ring-1 ring-emerald-100">
                  <QrCode className="h-5 w-5" strokeWidth={2.3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-slate-950">QRIS Otomatis</span>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-500">Scan dari bank atau e-wallet apa pun</span>
                </span>
                <span className="rounded-full bg-lime-200 px-2 py-1 text-[9px] font-black text-[#052e26]">Gratis</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#047857] text-white">
                  <Check className="h-4 w-4" strokeWidth={2.6} />
                </span>
              </button>

              {[
                { title: "Transfer Bank", desc: "BCA, BRI, BNI, dan Mandiri", icon: Building2 },
                { title: "E-Wallet", desc: "DANA, GoPay, OVO, dan ShopeePay", icon: WalletCards },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    type="button"
                    disabled
                    className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-3 text-left opacity-65"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                      <Icon className="h-5 w-5" strokeWidth={2.3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-slate-700">{item.title}</span>
                      <span className="mt-1 block text-[10px] font-semibold text-slate-400">{item.desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-950/10 bg-white p-4 shadow-[0_12px_28px_rgba(6,78,59,0.07)]">
            <h2 className="text-base font-black text-slate-950">Ringkasan</h2>
            <div className="mt-4 space-y-3 text-xs font-semibold text-slate-500">
              <div className="flex items-center justify-between gap-3">
                <span>Nominal isi saldo</span>
                <span className="font-black text-slate-950">Rp {fmtIDR(topupPreview.nominal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Biaya layanan</span>
                <span className="font-black text-[#047857]">Gratis</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span>Total pembayaran</span>
                  <span className="text-lg font-black text-[#047857]">Rp {fmtIDR(topupPreview.gross)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-emerald-50 px-3 py-3 text-[11px] font-semibold leading-4 text-[#047857]">
              Pembayaran diproses melalui QRIS PulsaKilat yang aman.
            </div>
          </section>

          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 rounded-[24px] border border-emerald-950/10 bg-white/95 p-3 shadow-[0_-12px_34px_rgba(6,78,59,0.13)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
                <p className="mt-0.5 text-lg font-black text-slate-950">Rp {fmtIDR(topupPreview.gross)}</p>
              </div>
              <button className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-linear-to-r from-[#052e26] via-[#047857] to-[#a3e635] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(6,78,59,0.22)] hover:brightness-105 disabled:opacity-70" disabled={saving} type="submit">
                {saving ? "Memproses..." : "Lanjut Bayar"}
                <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </form>
      </section>

      {activeQris && showPaymentModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40">
          <div className="absolute inset-x-0 bottom-0 left-1/2 max-h-[92vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-md bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.24)] md:w-97.5 md:max-w-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Pembayaran QRIS</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Topup Saldo</h2>
                <p className="mt-1 text-sm text-slate-500">{activeQris.ref_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-md border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] p-4 text-center">
                {activeQris.qr_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeQris.qr_url} alt={`QRIS ${activeQris.ref_id}`} className="mx-auto h-56 w-56 rounded-md bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)]" />
                ) : (
                  <div className="mx-auto grid h-56 w-56 place-items-center rounded-md bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                    <QrCode className="h-10 w-10 text-sky-600" />
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-slate-900">Rp {fmtIDR(activeQris.gross_amount)}</p>
                <p className="mt-1 text-xs text-slate-500">{statusLabel(activeQris.status)}</p>
              </div>

              <div className="rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Status</span>
                  <span className="font-semibold text-slate-900">{statusLabel(activeQris.status)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Saldo masuk</span>
                  <span className="font-semibold text-slate-900">Rp {fmtIDR(activeQris.amount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Admin fee</span>
                  <span className="font-semibold text-slate-900">Rp {fmtIDR(activeQris.fee_admin)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Total bayar</span>
                  <span className="font-semibold text-sky-700">Rp {fmtIDR(activeQris.gross_amount)}</span>
                </div>
              </div>

              <div className={`grid gap-3 ${activeQris.qr_url ? "grid-cols-2" : "grid-cols-1"}`}>
                {activeQris.qr_url ? (
                  <Link
                    href={activeQris.qr_url}
                    target="_blank"
                    className="inline-flex h-11 w-full items-center justify-center rounded-md bg-linear-to-r from-[#0f6fcb] to-[#2f92df] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,111,203,0.24)]"
                  >
                    Buka QRIS
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loadStatus(activeQris.ref_id, true)}
                  disabled={refreshing}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Mengecek..." : "Cek Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
