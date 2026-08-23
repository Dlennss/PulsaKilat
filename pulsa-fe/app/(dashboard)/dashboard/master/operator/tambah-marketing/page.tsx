"use client";

import { useState } from "react";
import { BriefcaseBusiness, CheckCircle2, UserPlus } from "lucide-react";
import RegisterMemberModal from "@/components/dashboard/RegisterMemberModal";

export default function OperatorTambahMarketingPage() {
  const [open, setOpen] = useState(true);

  return (
    <main className="min-h-screen bg-[#eef7f2] p-4 text-slate-950 sm:p-6 lg:p-8">
      <section className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#063b2f,#087b51_58%,#42c94a)] p-6 text-white shadow-[0_20px_50px_rgba(4,120,87,0.2)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
          <p className="relative text-[10px] font-black uppercase tracking-[0.24em] text-lime-100">Operator Kredit</p>
          <h1 className="relative mt-3 text-3xl font-black sm:text-4xl">Tambah Marketing</h1>
          <p className="relative mt-3 max-w-xl text-sm font-semibold leading-6 text-emerald-50/90">
            Buat akun marketing baru untuk membantu memantau agent dan aktivitas kredit di lapangan.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-emerald-900 shadow-lg transition hover:bg-lime-100"
          >
            <UserPlus className="h-5 w-5" />
            Buat Akun Marketing
          </button>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <BriefcaseBusiness className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-xl font-black">Akses Marketing</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Marketing dapat memantau agent binaan dan dokumen, tanpa mengambil keputusan kredit.</p>
          <div className="mt-5 grid gap-3">
            {[
              "Memantau agent binaan",
              "Melihat dokumen pengajuan",
              "Tidak dapat menyetujui atau menolak kredit",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <RegisterMemberModal
        open={open}
        onClose={() => setOpen(false)}
        fixedRole="marketing"
        title="Tambah Marketing"
        subtitle="Buat akun marketing PulsaKilat untuk memantau agent binaan."
        theme="retail"
      />
    </main>
  );
}
