"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Upload,
  WalletCards,
} from "lucide-react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type Props = {
  bills: AgentCreditApplication[];
};

type StoredPaymentProof = {
  name: string;
  type: string;
  size: number;
  data_url: string;
};

const paymentMethods = [
  { id: "wallet", title: "Saldo PulsaKilat", desc: "Lampirkan bukti mutasi saldo akun", icon: WalletCards },
  { id: "va", title: "Virtual Account", desc: "BCA, BRI, BNI, Mandiri", icon: CreditCard },
  { id: "transfer", title: "Transfer Bank", desc: "Konfirmasi manual oleh marketing", icon: Banknote },
];

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getPaidAmount(item: AgentCreditApplication) {
  if (typeof item.paid_amount === "number") return Math.max(0, item.paid_amount);
  return Math.max(0, Number(item.approved_amount || 0) - Number(item.outstanding_amount || 0));
}

function getVirtualAccountNumber(applicationId: number) {
  return `8808${String(applicationId || 0).padStart(10, "0")}`;
}

function getPaymentHelper(methodId: string, applicationId: number) {
  if (methodId === "va") {
    return {
      title: "Nomor Virtual Account",
      value: getVirtualAccountNumber(applicationId),
      desc: "Gunakan VA ini dari m-banking/ATM, lalu upload bukti transfer.",
      rows: [
        ["Bank", "BCA, BRI, BNI, Mandiri"],
        ["Nama", "PulsaKilat Agent Credit"],
      ],
    };
  }
  if (methodId === "transfer") {
    return {
      title: "Rekening Tujuan",
      value: "1234567890",
      desc: "Transfer sesuai nominal pembayaran, lalu upload bukti transfer.",
      rows: [
        ["Bank", "BCA"],
        ["Atas Nama", "PulsaKilat"],
      ],
    };
  }
  return {
    title: "Sumber Dana",
    value: "Saldo akun PulsaKilat",
    desc: "Saldo akan dipotong setelah pembayaran dikonfirmasi.",
    rows: [
      ["Proses", "Instan"],
      ["Biaya layanan", "Gratis"],
    ],
  };
}

function readStoredPaymentProof(file: File | null): Promise<StoredPaymentProof | null> {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca bukti ${file.name}`));
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data_url: String(reader.result || ""),
      });
    };
    reader.readAsDataURL(file);
  });
}

export function UserCreditBillPayLaterContent({ bills }: Props) {
  const router = useRouter();
  const activeBills = bills.filter((item) => Number(item.outstanding_amount || 0) > 0);
  const selectedDefault = activeBills[0]?.id || bills[0]?.id || 0;
  const [selectedBillId, setSelectedBillId] = useState(selectedDefault);
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0].id);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofName, setProofName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedBill = useMemo(
    () => bills.find((item) => item.id === selectedBillId) || bills[0],
    [bills, selectedBillId],
  );
  const totalOutstanding = activeBills.reduce((total, item) => total + Number(item.outstanding_amount || 0), 0);
  const selectedOutstanding = selectedBill ? Number(selectedBill.outstanding_amount || 0) : 0;
  const approved = selectedBill ? Number(selectedBill.approved_amount || selectedBill.requested_amount || 0) : 0;
  const paid = selectedBill ? getPaidAmount(selectedBill) : 0;
  const progress = approved > 0 ? Math.min(100, Math.round((paid / approved) * 100)) : 0;
  const isPaid = selectedBill ? selectedOutstanding <= 0 : false;
  const paymentAmount = selectedBill ? selectedOutstanding : 0;
  const method = paymentMethods.find((item) => item.id === selectedMethod) || paymentMethods[0];
  const MethodIcon = method.icon;
  const paymentHelper = getPaymentHelper(selectedMethod, selectedBill?.id || 0);

  function selectBill(id: number) {
    setSelectedBillId(id);
    setError("");
  }

  async function copyPaymentValue() {
    if (!paymentHelper.value || paymentHelper.value === "Saldo akun PulsaKilat") return;
    await navigator.clipboard?.writeText(paymentHelper.value).catch(() => undefined);
  }

  async function paySelectedBill() {
    if (!selectedBill || paymentAmount <= 0 || busy) return;
    if (!proofFile) {
      setError("Bukti pembayaran wajib diupload");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const paymentProof = await readStoredPaymentProof(proofFile);
      const response = await fetch("/api/agent-credit/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: selectedBill.id,
          amount: paymentAmount,
          payment_method: selectedMethod,
          note: `${paymentAmount >= selectedOutstanding ? "Pelunasan" : "Pembayaran"} pinjaman via ${method.title}${selectedMethod === "va" ? ` - VA ${paymentHelper.value}` : ""}`,
          payment_proof: paymentProof,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Pembayaran gagal diproses");
      }
      setProofFile(null);
      setProofName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pembayaran gagal diproses");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#052e26,#047857_58%,#84cc16_135%)] p-5 text-white shadow-[0_22px_50px_rgba(4,120,87,0.22)]">
        <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <Link href="/user/saldo" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-100">Tagihan Kredit Agent</p>
            <h1 className="mt-1 text-2xl font-black">Bayar Pinjaman</h1>
            <p className="mt-1 text-xs font-semibold text-white/75">Pilih tagihan, upload bukti, lalu konfirmasi pelunasan.</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#047857]">
            <ReceiptText className="h-6 w-6" />
          </span>
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Total yang dibayar</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-slate-950">{formatIDR(paymentAmount)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {selectedBill ? `Sisa pinjaman ${formatIDR(selectedOutstanding)}` : "Belum ada tagihan aktif"}
            </p>
          </div>
          <span className={isPaid ? "rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-700" : "rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black text-amber-700"}>
            {isPaid ? "Lunas" : "Belum lunas"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-3">
            <p className="text-[9px] font-black uppercase text-emerald-700/70">Sisa semua</p>
            <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl bg-sky-50 px-3 py-3">
            <p className="text-[9px] font-black uppercase text-sky-700/70">Jatuh tempo</p>
            <p className="mt-1 text-sm font-black text-slate-950">{formatDate(selectedBill?.loan_due_date)}</p>
          </div>
        </div>
      </section>

      {bills.length ? (
        <>
          <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Tagihan Pinjaman</h2>
              <span className="rounded-full bg-lime-100 px-3 py-1 text-[10px] font-black text-[#047857]">{bills.length} tagihan</span>
            </div>
            <div className="space-y-2">
              {bills.map((item) => {
                const outstanding = Number(item.outstanding_amount || 0);
                const selected = item.id === selectedBillId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectBill(item.id)}
                    className={selected ? "flex w-full items-center gap-3 rounded-[24px] border border-emerald-300 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-3 text-left shadow-[0_12px_24px_rgba(5,150,105,0.08)]" : "flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-white p-3 text-left transition hover:bg-emerald-50/50"}
                  >
                    <span className={selected ? "grid h-12 w-12 shrink-0 place-items-center rounded-[19px] bg-[#047857] text-white shadow-[0_10px_20px_rgba(4,120,87,0.20)]" : "grid h-12 w-12 shrink-0 place-items-center rounded-[19px] bg-slate-100 text-slate-500"}>
                      <ReceiptText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-950">Pinjaman #{item.id}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                        Sisa {formatIDR(outstanding)} - jatuh tempo {formatDate(item.loan_due_date)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-slate-950">{formatIDR(outstanding)}</span>
                      <span className="mt-0.5 block text-[9px] font-black text-slate-400">{outstanding <= 0 ? "Lunas" : "Bayar"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedBill ? (
            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
              <div className="bg-[linear-gradient(135deg,#f8fffb,#eefcf4)] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#047857] ring-1 ring-emerald-100">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-950">Rincian Pelunasan</h2>
                    <p className="text-xs font-semibold text-slate-500">Nominal otomatis mengikuti sisa pinjaman aktif.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Total Pinjaman</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(approved)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Sudah Dibayar</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(paid)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Sisa Pinjaman</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(selectedOutstanding)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Jatuh Tempo</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatDate(selectedBill.loan_due_date)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>Progress bayar</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#047857,#84cc16)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
            <h2 className="text-base font-black text-slate-950">Metode Pembayaran</h2>
            <div className="mt-3 space-y-2">
              {paymentMethods.map((item) => {
                const Icon = item.icon;
                const selected = item.id === selectedMethod;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMethod(item.id)}
                    className={selected ? "flex w-full items-center gap-3 rounded-[22px] border border-emerald-300 bg-emerald-50 p-3 text-left" : "flex w-full items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"}
                  >
                    <span className={selected ? "grid h-11 w-11 place-items-center rounded-2xl bg-[#047857] text-white" : "grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500"}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-950">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">{item.desc}</span>
                    </span>
                    {selected ? <CheckCircle2 className="h-5 w-5 text-[#047857]" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-100 text-[#047857]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-950">Konfirmasi Pembayaran</h2>
                <p className="text-xs font-semibold text-slate-500">Metode: {method.title}</p>
              </div>
              <MethodIcon className="h-5 w-5 text-[#047857]" />
            </div>
            <div className="mt-4 space-y-2 rounded-[22px] bg-slate-50 p-3 text-sm">
              <div className="mb-3 rounded-[20px] border border-emerald-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-600">{paymentHelper.title}</p>
                    <p className="mt-1 break-all text-base font-black text-slate-950">{paymentHelper.value}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{paymentHelper.desc}</p>
                  </div>
                  {selectedMethod !== "wallet" ? (
                    <button
                      type="button"
                      onClick={copyPaymentValue}
                      className="h-9 shrink-0 rounded-full bg-emerald-50 px-3 text-[10px] font-black text-[#047857] ring-1 ring-emerald-100"
                    >
                      Salin
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {paymentHelper.rows.map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-emerald-50/70 px-3 py-2">
                      <p className="text-[9px] font-black uppercase text-emerald-700/70">{label}</p>
                      <p className="mt-1 truncate text-xs font-black text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Nominal bayar</span>
                <span className="font-black text-slate-950">{formatIDR(paymentAmount)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Biaya layanan</span>
                <span className="font-black text-[#047857]">Gratis</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                <span className="font-black text-slate-950">Total bayar</span>
                <span className="font-black text-slate-950">{formatIDR(paymentAmount)}</span>
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-[22px] border border-dashed border-emerald-300 bg-emerald-50/60 p-3 transition hover:bg-emerald-50">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857] ring-1 ring-emerald-100">
                <Upload className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-950">Upload Bukti Transfer</span>
                <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                  {proofName || "Foto/screenshot bukti pembayaran wajib dilampirkan"}
                </span>
              </span>
              <span className={proofFile ? "rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black text-white" : "rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#047857] ring-1 ring-emerald-100"}>
                {proofFile ? "Siap" : "Pilih"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setProofFile(file);
                  setProofName(file?.name || "");
                }}
              />
            </label>
            <button
              type="button"
              onClick={paySelectedBill}
              disabled={paymentAmount <= 0 || busy || !proofFile}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_34px_rgba(5,150,105,0.22)] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
              {busy ? "Memproses..." : "Konfirmasi Pelunasan"}
            </button>
            {error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-center text-xs font-black text-rose-600">{error}</p> : null}
          </section>
        </>
      ) : (
        <section className="grid min-h-[300px] place-items-center rounded-[28px] border border-dashed border-emerald-200 bg-white px-6 text-center shadow-[0_18px_42px_rgba(6,78,59,0.06)]">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-[#047857]">
              <ReceiptText className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-950">Belum ada tagihan</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Tagihan akan muncul setelah pengajuan kredit disetujui analis.</p>
          </div>
        </section>
      )}
    </div>
  );
}
