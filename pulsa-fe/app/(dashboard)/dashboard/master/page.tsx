import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardCheck,
  Clock3,
  FileSignature,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

const stats = [
  { label: "Total Pengajuan", value: "12", hint: "Semua data agent", icon: FileSignature, tone: "from-emerald-500 to-lime-400" },
  { label: "Perlu Dicek", value: "4", hint: "Menunggu marketing", icon: Clock3, tone: "from-amber-400 to-orange-500" },
  { label: "Disetujui", value: "7", hint: "Siap pencairan", icon: BadgeCheck, tone: "from-sky-500 to-cyan-400" },
  { label: "Limit Aktif", value: "Rp 8,5jt", hint: "Berjalan bulan ini", icon: WalletCards, tone: "from-violet-500 to-fuchsia-500" },
];

const reviews = [
  { name: "Agent Pulsa Kilat", store: "Kios Pulsa Maju", amount: "Rp 500.000", status: "Tanda tangan masuk", step: "Review marketing" },
  { name: "Fadlan Cell", store: "Konter Digital", amount: "Rp 300.000", status: "Data lengkap", step: "Cek dokumen" },
  { name: "Kupra Store", store: "Pulsa Harian", amount: "Rp 750.000", status: "Menunggu acc", step: "Keputusan master" },
];

const timeline = [
  { title: "Tanda tangan agent", desc: "Agent mengirim pengajuan kredit saldo.", active: true },
  { title: "Cek marketing", desc: "Marketing validasi dokumen dan tanda tangan.", active: true },
  { title: "ACC master", desc: "Master menentukan limit dan status akhir.", active: false },
];

export default function MasterDashboardPage() {
  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_90%_10%,rgba(163,230,53,0.55),transparent_28%),linear-gradient(135deg,#052e26_0%,#057a45_48%,#3bd64a_100%)] px-5 py-6 text-white sm:px-7 lg:px-9 lg:py-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
            <div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-lime-300/20 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-lime-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Panel Master
                </p>
                <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Review Kredit Saldo Agent</h1>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90 sm:text-base">
                  Pantau pengajuan, cek validasi marketing, dan tentukan limit kredit agent dari satu dashboard PulsaKilat.
                </p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-700 shadow-lg">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-100">Status Sistem</p>
                    <p className="text-xl font-black">Siap Review</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500">{item.label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{item.hint}</p>
                      </div>
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${item.tone} text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Meja Review</p>
                    <h2 className="mt-1 text-xl font-black">Pengajuan Kredit Terbaru</h2>
                  </div>
                  <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">
                    <Search className="h-4 w-4" />
                    <input className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Cari agent" />
                  </label>
                </div>

                <div className="mt-5 space-y-3">
                  {reviews.map((item) => (
                    <article key={item.name} className="rounded-3xl border border-emerald-100 bg-linear-to-br from-white to-emerald-50/70 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_38px_rgba(5,122,69,0.12)]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-950 text-sm font-black text-lime-300">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black">{item.name}</h3>
                            <p className="text-xs font-semibold text-slate-500">{item.store}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Nominal</p>
                            <p className="font-black text-emerald-700">{item.amount}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Tahap</p>
                            <p className="font-bold text-slate-700">{item.step}</p>
                          </div>
                          <button className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 sm:col-span-1">
                            Detail
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 inline-flex rounded-full bg-lime-100 px-3 py-1 text-xs font-black text-emerald-800">{item.status}</div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200 bg-[#fbfffd] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Alur Persetujuan</p>
                <h2 className="mt-1 text-xl font-black">Status Verifikasi</h2>
                <div className="mt-5 space-y-3">
                  {timeline.map((item, index) => (
                    <div key={item.title} className={`rounded-3xl border p-4 ${item.active ? "border-emerald-200 bg-emerald-50" : "border-dashed border-slate-200 bg-white"}`}>
                      <div className="flex gap-3">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-black ${item.active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-black">{item.title}</h3>
                          <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-9 w-9 text-lime-300" />
                    <div>
                      <p className="text-sm font-black">Keputusan Cepat</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-white/70">Setelah marketing setuju, master bisa langsung aktifkan limit agent.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
