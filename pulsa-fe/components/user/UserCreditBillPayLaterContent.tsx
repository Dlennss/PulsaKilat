"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type Props = {
  bills: AgentCreditApplication[];
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function addOneMonth(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + 1);
  return date;
}

function resolveDueDate(item: AgentCreditApplication) {
  if (item.loan_due_date) {
    const dueDate = new Date(item.loan_due_date);
    if (!Number.isNaN(dueDate.getTime())) return dueDate;
  }
  return addOneMonth(item.loan_approved_at || item.updated_at || item.created_at);
}

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function getTenorMonths(item: AgentCreditApplication) {
  const start = new Date(item.loan_approved_at || item.updated_at || item.created_at).getTime();
  const end = resolveDueDate(item)?.getTime() || 0;
  if (!start || !end) return 1;
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  return Math.max(1, Math.ceil(days / 30));
}

function getPaidAmount(item: AgentCreditApplication) {
  return Math.max(0, Number(item.approved_amount || 0) - Number(item.outstanding_amount || 0));
}

const paymentMethods = [
  { id: "wallet", title: "Saldo PulsaKilat", desc: "Bayar langsung dari saldo akun", icon: WalletCards },
  { id: "va", title: "Virtual Account", desc: "BCA, BRI, BNI, Mandiri", icon: CreditCard },
  { id: "transfer", title: "Transfer Bank", desc: "Konfirmasi manual oleh marketing", icon: Banknote },
];

export function UserCreditBillPayLaterContent({ bills }: Props) {
  const activeBills = bills.filter((item) => Number(item.outstanding_amount || 0) > 0);
  const selectedDefault = activeBills[0]?.id || bills[0]?.id || 0;
  const [selectedBillId, setSelectedBillId] = useState(selectedDefault);
  const [selectedMethod, setSelectedMethod] = useState(paymentMethods[0].id);

  const selectedBill = useMemo(
    () => bills.find((item) => item.id === selectedBillId) || bills[0],
    [bills, selectedBillId],
  );
  const totalOutstanding = activeBills.reduce((total, item) => total + Number(item.outstanding_amount || 0), 0);
  const monthlyBill = selectedBill ? Number(selectedBill.outstanding_amount || 0) : 0;
  const dueDate = selectedBill ? resolveDueDate(selectedBill) : null;
  const approved = selectedBill ? Number(selectedBill.approved_amount || selectedBill.requested_amount || 0) : 0;
  const paid = selectedBill ? getPaidAmount(selectedBill) : 0;
  const progress = approved > 0 ? Math.min(100, Math.round((paid / approved) * 100)) : 0;
  const isPaid = selectedBill ? Number(selectedBill.outstanding_amount || 0) <= 0 : false;
  const method = paymentMethods.find((item) => item.id === selectedMethod) || paymentMethods[0];
  const MethodIcon = method.icon;

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
            <p className="text-3xl font-black tracking-tight text-slate-950">{formatIDR(monthlyBill)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Tagihan bulan ini</p>
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
                const selected = item.id === selectedBillId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBillId(item.id)}
                    className={selected ? "flex w-full items-center gap-3 rounded-[22px] border border-emerald-300 bg-emerald-50 p-3 text-left shadow-[0_12px_24px_rgba(5,150,105,0.08)]" : "flex w-full items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 text-left transition hover:bg-emerald-50/50"}
                  >
                    <span className={selected ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#047857] text-white" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500"}>
                      <ReceiptText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-950">Pinjaman #{item.id}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">Tenor {getTenorMonths(item)} bulan sampai lunas</span>
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
                    <p className="text-[9px] font-black uppercase text-slate-400">Sisa</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(monthlyBill)}</p>
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
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Tagihan</span>
                <span className="font-black text-slate-950">{formatIDR(monthlyBill)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Biaya layanan</span>
                <span className="font-black text-[#047857]">Gratis</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between gap-3">
                <span className="font-black text-slate-950">Total bayar</span>
                <span className="font-black text-slate-950">{formatIDR(monthlyBill)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={monthlyBill <= 0}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_34px_rgba(5,150,105,0.22)] disabled:opacity-50"
            >
              <BadgeCheck className="h-5 w-5" />
              Bayar Sekarang
            </button>
          </section>
        </>
      ) : (
        <section className="grid min-h-[300px] place-items-center rounded-[28px] border border-dashed border-emerald-200 bg-white px-6 text-center shadow-[0_18px_42px_rgba(6,78,59,0.06)]">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-[#047857]">
              <ReceiptText className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-950">Belum ada tagihan</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Tagihan akan muncul setelah pengajuan kredit disetujui oleh marketing.</p>
          </div>
        </section>
      )}
    </div>
  );
}
