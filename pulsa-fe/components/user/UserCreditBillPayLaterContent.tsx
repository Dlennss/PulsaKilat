"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  ReceiptText,
  ShieldCheck,
  Upload,
  WalletCards,
  Loader2,
} from "lucide-react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type Props = {
  bills: AgentCreditApplication[];
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function addMonths(value: string, months: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + months);
  return date;
}

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function getTenorMonths(item: AgentCreditApplication) {
  const value = item.applicant_data?.tenor_months;
  const tenor = typeof value === "number" ? value : Number(value || 0);
  return tenor === 3 || tenor === 6 || tenor === 12 ? tenor : 1;
}

function getInstallmentNo(item: AgentCreditApplication) {
  const tenor = getTenorMonths(item);
  const monthlyInstallment = getMonthlyInstallment(item);
  const outstanding = Number(item.outstanding_amount || 0);
  if (monthlyInstallment <= 0) return 1;
  if (outstanding <= 0) return tenor;
  const remainingInstallments = Math.min(tenor, Math.ceil(outstanding / monthlyInstallment));
  return Math.min(tenor, tenor - remainingInstallments + 1);
}

function getDueDate(item: AgentCreditApplication) {
  const baseDate = item.loan_approved_at || item.updated_at || item.created_at;
  const dueDate = addMonths(baseDate, getInstallmentNo(item));
  if (!dueDate && item.loan_due_date) {
    const fallback = new Date(item.loan_due_date);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return dueDate;
}

function getMonthlyInstallment(item: AgentCreditApplication) {
  const approved = Number(item.approved_amount || item.requested_amount || 0);
  const tenor = getTenorMonths(item);
  return Math.ceil(approved / tenor);
}

function getCurrentBill(item: AgentCreditApplication) {
  const outstanding = Number(item.outstanding_amount || 0);
  return Math.min(outstanding, getMonthlyInstallment(item));
}

function getPaidAmount(item: AgentCreditApplication) {
  if (typeof item.paid_amount === "number") return Math.max(0, item.paid_amount);
  return Math.max(0, Number(item.approved_amount || 0) - Number(item.outstanding_amount || 0));
}

type StoredPaymentProof = {
  name: string;
  type: string;
  size: number;
  data_url: string;
};

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

const paymentMethods = [
  { id: "wallet", title: "Saldo PulsaKilat", desc: "Lampirkan bukti mutasi saldo akun", icon: WalletCards },
  { id: "va", title: "Virtual Account", desc: "BCA, BRI, BNI, Mandiri", icon: CreditCard },
  { id: "transfer", title: "Transfer Bank", desc: "Konfirmasi manual oleh marketing", icon: Banknote },
];

function getVirtualAccountNumber(applicationId: number) {
  return `8808${String(applicationId || 0).padStart(10, "0")}`;
}

function getPaymentHelper(methodId: string, applicationId: number) {
  if (methodId === "va") {
    return {
      title: "Nomor Virtual Account",
      value: getVirtualAccountNumber(applicationId),
      desc: "Gunakan VA ini dari m-banking/ATM. Setelah transfer, tekan konfirmasi pembayaran.",
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
      desc: "Transfer sesuai total bayar, lalu konfirmasi agar tim PulsaKilat dapat mencatat pelunasan.",
      rows: [
        ["Bank", "BCA"],
        ["Atas Nama", "PulsaKilat"],
      ],
    };
  }
  return {
    title: "Sumber Dana",
    value: "Saldo akun PulsaKilat",
    desc: "Saldo akan langsung dipotong setelah kamu menekan tombol bayar.",
    rows: [
      ["Proses", "Instan"],
      ["Biaya layanan", "Gratis"],
    ],
  };
}

export function UserCreditBillPayLaterContent({ bills }: Props) {
  const router = useRouter();
  const activeBills = bills.filter((item) => Number(item.outstanding_amount || 0) > 0);
  const selectedDefault = activeBills[0]?.id || bills[0]?.id || 0;
  const [selectedBillId, setSelectedBillId] = useState(selectedDefault);
  const [selectedInstallments, setSelectedInstallments] = useState<number[]>([]);
  const [installmentPickerOpen, setInstallmentPickerOpen] = useState(false);
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
  const monthlyBill = selectedBill ? getCurrentBill(selectedBill) : 0;
  const selectedOutstanding = selectedBill ? Number(selectedBill.outstanding_amount || 0) : 0;
  const dueDate = selectedBill ? getDueDate(selectedBill) : null;
  const approved = selectedBill ? Number(selectedBill.approved_amount || selectedBill.requested_amount || 0) : 0;
  const paid = selectedBill ? getPaidAmount(selectedBill) : 0;
  const progress = approved > 0 ? Math.min(100, Math.round((paid / approved) * 100)) : 0;
  const isPaid = selectedBill ? Number(selectedBill.outstanding_amount || 0) <= 0 : false;
  const selectedTenor = selectedBill ? getTenorMonths(selectedBill) : 0;
  const selectedInstallmentNo = selectedBill ? getInstallmentNo(selectedBill) : 0;
  const remainingInstallmentCount = selectedBill && monthlyBill > 0 ? Math.min(selectedTenor, Math.ceil(selectedOutstanding / monthlyBill)) : 0;
  const installmentChoices = Array.from({ length: remainingInstallmentCount }, (_, index) => selectedInstallmentNo + index);
  const activeInstallments = selectedInstallments.filter((item) => installmentChoices.includes(item));
  const paymentAmount = selectedBill ? Math.min(selectedOutstanding, monthlyBill * activeInstallments.length) : 0;
  const method = paymentMethods.find((item) => item.id === selectedMethod) || paymentMethods[0];
  const MethodIcon = method.icon;
  const paymentHelper = getPaymentHelper(selectedMethod, selectedBill?.id || 0);

  useEffect(() => {
    setSelectedInstallments(selectedInstallmentNo > 0 ? [selectedInstallmentNo] : []);
  }, [selectedBillId, selectedInstallmentNo]);

  function selectBill(id: number) {
    setSelectedBillId(id);
    setSelectedInstallments([]);
    setInstallmentPickerOpen(false);
  }

  function toggleInstallment(month: number) {
    setSelectedInstallments((current) => {
      const exists = current.includes(month);
      const next = exists ? current.filter((item) => item !== month) : [...current, month];
      return next.sort((a, b) => a - b);
    });
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
          note: `Cicilan ${activeInstallments.join(", ")} via ${method.title}${selectedMethod === "va" ? ` - VA ${paymentHelper.value}` : ""}`,
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
            <h1 className="mt-1 text-2xl font-black">Bayar Cicilan</h1>
            <p className="mt-1 text-xs font-semibold text-white/75">Pilih tagihan, metode bayar, lalu konfirmasi.</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#047857]">
            <ReceiptText className="h-6 w-6" />
          </span>
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Total harus dibayar</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-slate-950">{formatIDR(paymentAmount)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {selectedBill ? `${activeInstallments.length} cicilan dipilih dari tenor ${selectedTenor}` : "Tagihan bulan ini"}
            </p>
          </div>
          <span className={isPaid ? "rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-700" : "rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-black text-amber-700"}>
            {isPaid ? "Lunas" : "Belum lunas"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-emerald-50 px-3 py-3">
            <p className="text-[9px] font-black uppercase text-emerald-700/70">Sisa pinjaman</p>
            <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl bg-sky-50 px-3 py-3">
            <p className="text-[9px] font-black uppercase text-sky-700/70">Jatuh tempo</p>
            <p className="mt-1 text-sm font-black text-slate-950">{formatDate(dueDate)}</p>
          </div>
        </div>
      </section>

      {bills.length ? (
        <>
          <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-slate-950">Tagihan Bulan Ini</h2>
              <span className="rounded-full bg-lime-100 px-3 py-1 text-[10px] font-black text-[#047857]">{bills.length} tagihan</span>
            </div>
            <div className="space-y-2">
              {bills.map((item) => {
                const outstanding = Number(item.outstanding_amount || 0);
                const bill = getCurrentBill(item);
                const tenor = getTenorMonths(item);
                const installmentNo = getInstallmentNo(item);
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
                        Cicilan {installmentNo}/{tenor} - sisa {formatIDR(outstanding)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-black text-slate-950">{formatIDR(bill)}</span>
                      <span className="mt-0.5 block text-[9px] font-black text-slate-400">{outstanding <= 0 ? "Lunas" : "Bayar"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedBill && !isPaid ? (
              <div className="mt-3 rounded-[26px] border border-emerald-100 bg-[linear-gradient(180deg,#f8fffb_0%,#ffffff_100%)] p-3 shadow-[0_12px_28px_rgba(6,78,59,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#047857]">Pilih Cicilan</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {activeInstallments.length ? `${activeInstallments.length} bulan dipilih` : "Belum ada bulan dipilih"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInstallments(installmentChoices)}
                      className="h-9 rounded-full bg-emerald-950 px-3 text-[10px] font-black text-white shadow-[0_10px_20px_rgba(6,78,59,0.16)]"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallmentPickerOpen((value) => !value)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#047857] ring-1 ring-emerald-100"
                      aria-label={installmentPickerOpen ? "Tutup pilihan cicilan" : "Buka pilihan cicilan"}
                    >
                      {installmentPickerOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {installmentPickerOpen ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {installmentChoices.map((month) => {
                      const checked = activeInstallments.includes(month);
                      return (
                        <label
                          key={month}
                          className={checked ? "flex cursor-pointer items-center justify-between gap-2 rounded-[18px] border border-emerald-300 bg-emerald-50 px-3 py-3 text-slate-950" : "flex cursor-pointer items-center justify-between gap-2 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-slate-600"}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleInstallment(month)}
                              className="h-4 w-4 rounded border-slate-300 text-[#047857] focus:ring-emerald-300"
                            />
                            <span className="text-xs font-black">Bulan {month}</span>
                          </span>
                          <span className="text-[10px] font-black text-[#047857]">{formatIDR(monthlyBill)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between rounded-[20px] bg-slate-950 px-4 py-3 text-white">
                  <span className="text-[11px] font-semibold text-white/70">{activeInstallments.length} bulan dipilih</span>
                  <span className="text-sm font-black">{formatIDR(paymentAmount)}</span>
                </div>
              </div>
            ) : null}
          </section>

          {selectedBill ? (
            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
              <div className="bg-[linear-gradient(135deg,#f8fffb,#eefcf4)] p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#047857] ring-1 ring-emerald-100">
                    <CalendarClock className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-950">Rincian Tagihan</h2>
                    <p className="text-xs font-semibold text-slate-500">Jatuh tempo {formatDate(dueDate)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Total Pinjaman</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(approved)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Cicilan Bulan Ini</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(monthlyBill)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Tenor</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{selectedTenor} bulan</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                    <p className="text-[9px] font-black uppercase text-slate-400">Sisa Pinjaman</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(Number(selectedBill.outstanding_amount || 0))}</p>
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
                <span className="font-semibold text-slate-500">Cicilan dipilih</span>
                <span className="font-black text-slate-950">{formatIDR(paymentAmount)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Biaya layanan</span>
                <span className="font-black text-[#047857]">Gratis</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between gap-3">
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
              {busy
                ? "Memproses..."
                : selectedMethod === "wallet"
                  ? activeInstallments.length >= remainingInstallmentCount
                    ? "Bayar & Lunasi"
                    : "Bayar Cicilan"
                  : "Konfirmasi Pembayaran"}
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
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Tagihan akan muncul setelah pengajuan kredit disetujui oleh master.</p>
          </div>
        </section>
      )}
    </div>
  );
}
