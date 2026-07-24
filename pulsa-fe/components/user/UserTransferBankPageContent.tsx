"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Landmark, LockKeyhole, RotateCcw, ShieldCheck, Timer, Zap } from "lucide-react";

const banks = [
  { name: "BCA", image: "/images/banks/bca.jpeg", accent: "bg-sky-50 text-sky-700", frame: "bg-blue-50" },
  { name: "BRI", image: "/images/banks/bri.jpg", accent: "bg-blue-50 text-blue-700", frame: "bg-sky-50" },
  { name: "BNI", image: "/images/banks/bni.jpg", accent: "bg-orange-50 text-orange-700", frame: "bg-orange-50" },
  { name: "Mandiri", image: "/images/banks/mandiri.jpeg", accent: "bg-yellow-50 text-yellow-700", frame: "bg-blue-50" },
  { name: "Bank Syariah Indonesia", image: "/images/banks/bsi.jpg", accent: "bg-emerald-50 text-emerald-700", frame: "bg-emerald-50" },
  { name: "Danamon", image: "/images/banks/danamon.png", accent: "bg-lime-50 text-lime-700", frame: "bg-lime-50" },
  { name: "PermataBank", image: "/images/banks/permatabank.jpeg", accent: "bg-cyan-50 text-cyan-700", frame: "bg-cyan-50" },
  { name: "SeaBank", image: "/images/banks/seabank.jpeg", accent: "bg-rose-50 text-rose-700", frame: "bg-orange-50" },
  { name: "Bank Jago", image: "/images/banks/jago.jpg", accent: "bg-amber-50 text-amber-700", frame: "bg-amber-50" },
];

export function UserTransferBankPageContent() {
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("BCA");

  const canContinue = accountNumber.trim().length >= 6 && Boolean(selectedBank);
  const selectedBankName = useMemo(() => banks.find((bank) => bank.name === selectedBank)?.name || "BCA", [selectedBank]);

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#052e26_0%,#047857_60%,#84cc16_145%)] px-4 pb-7 pt-5 text-white shadow-[0_18px_42px_rgba(4,120,87,0.22)]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link href="/user/kategori" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/15">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black tracking-tight">Transfer Bank</h1>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/75">Pilih bank tujuan dan isi nomor rekening</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]">
            <Landmark className="h-5 w-5" strokeWidth={2.4} />
          </span>
        </div>
      </section>

      <div className="mx-auto -mt-4 w-full max-w-md space-y-4 px-4">
        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
                <Landmark className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-black text-slate-950">Nomor Rekening</h2>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Pastikan tujuan sudah benar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAccountNumber("")}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 px-3 text-[10px] font-black text-[#047857]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.4} />
              Reset
            </button>
          </div>

          <label className="mt-4 flex h-13 overflow-hidden rounded-2xl border border-emerald-200 bg-[#fbfffd] focus-within:border-[#047857] focus-within:ring-4 focus-within:ring-emerald-100">
            <span className="grid w-14 shrink-0 place-items-center border-r border-emerald-100 text-xs font-black text-[#047857]">ID</span>
            <input
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D+/g, ""))}
              className="min-w-0 flex-1 bg-transparent px-4 text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
              placeholder="Masukkan nomor rekening"
              inputMode="numeric"
            />
          </label>
        </section>

        <section className="grid grid-cols-3 gap-2.5">
          {[
            { title: "Proses instan", desc: "Otomatis", icon: Zap, tone: "text-violet-600 bg-violet-50" },
            { title: "Data aman", desc: "Terenkripsi", icon: LockKeyhole, tone: "text-[#047857] bg-emerald-50" },
            { title: "24 jam", desc: "Setiap hari", icon: Timer, tone: "text-orange-600 bg-orange-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-emerald-950/5 bg-white p-2.5 shadow-[0_10px_24px_rgba(6,78,59,0.07)]">
                <span className={`grid h-8 w-8 place-items-center rounded-xl ${item.tone}`}>
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                </span>
                <p className="mt-2 truncate text-[10px] font-black text-slate-950">{item.title}</p>
                <p className="mt-0.5 truncate text-[8.5px] font-semibold text-slate-400">{item.desc}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Pilih Bank</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Bank terpilih: {selectedBankName}</p>
            </div>
            <span className="rounded-full bg-lime-100 px-3 py-1 text-[10px] font-black text-[#047857]">9 bank</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 min-[430px]:gap-3">
            {banks.map((bank) => {
              const active = selectedBank === bank.name;
              return (
                <button
                  key={bank.name}
                  type="button"
                  onClick={() => setSelectedBank(bank.name)}
                  className={
                    active
                      ? "group relative min-h-[132px] overflow-hidden rounded-[22px] border border-[#047857] bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)] p-2.5 text-center shadow-[0_18px_34px_rgba(4,120,87,0.16)]"
                      : "group relative min-h-[132px] overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2.5 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_16px_30px_rgba(6,78,59,0.10)]"
                  }
                >
                  {active ? (
                    <span className="absolute right-2.5 top-2.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-[#047857] text-white shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                  ) : null}

                  <span className={`relative block h-[62px] w-full overflow-hidden rounded-[17px] border border-white/90 ${bank.frame} shadow-[0_10px_22px_rgba(15,23,42,0.06)]`}>
                    <Image
                      src={bank.image}
                      alt={bank.name}
                      fill
                      sizes="(max-width: 640px) 30vw, 130px"
                      className="object-contain p-1.5"
                    />
                  </span>
                  <span className="mx-auto mt-3 line-clamp-2 block max-w-[92px] text-[10px] font-black uppercase leading-tight text-slate-950">
                    {bank.name}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!canContinue}
            className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_16px_30px_rgba(4,120,87,0.20)] transition hover:brightness-105 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            Lihat Produk & Nominal
            <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </section>

        <section className="flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <p className="text-[11px] font-semibold leading-4 text-[#047857]">
            Nomor rekening akan dicek sebelum transaksi dilanjutkan.
          </p>
        </section>
      </div>
    </>
  );
}
