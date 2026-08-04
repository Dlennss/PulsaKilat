import { ClipboardPlus, FileSignature, ShieldCheck } from "lucide-react";
import { MarketingAgentCreditCreateForm } from "@/components/dashboard/MarketingAgentCreditCreateForm";

export default function InputPinjamanManualPage() {
  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_90%_10%,rgba(163,230,53,0.5),transparent_28%),linear-gradient(135deg,#052e26_0%,#057a45_55%,#3bd64a_100%)] px-5 py-6 text-white sm:px-7 lg:px-9 lg:py-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
            <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-lime-300/20 blur-2xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-lime-100">
                  <ClipboardPlus className="h-3.5 w-3.5" />
                  Marketing
                </p>
                <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Input Pinjaman Manual</h1>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90 sm:text-base">
                  Buat pengajuan tanam saldo untuk agent yang dibantu langsung oleh marketing.
                </p>
              </div>
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-white text-emerald-700 shadow-lg">
                <FileSignature className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">Data masuk ke antrian Marketing</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Setelah dibuat, pengajuan manual akan tampil di menu Data Pinjaman untuk proses review dan ACC.
                  </p>
                </div>
              </div>
            </div>

            <MarketingAgentCreditCreateForm defaultOpen />
          </div>
        </div>
      </section>
    </main>
  );
}
