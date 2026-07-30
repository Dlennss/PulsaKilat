import { BadgeCheck, Clock3, FileSignature, LayoutDashboard, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { attachAgentCreditPaymentsFallback } from "@/lib/agent-credit-payment-fallback.server";

type SessionShape = {
  backendToken?: string;
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export default async function MasterDashboardPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const rawApplications = session?.backendToken ? await getAgentCreditApplications(session.backendToken) : [];
  const applications = await attachAgentCreditPaymentsFallback(rawApplications);
  const waiting = applications.filter((item) => item.status === "submitted" || item.status === "marketing_review").length;
  const inAnalysis = applications.filter((item) => item.status === "analysis_review").length;
  const approved = applications.filter((item) => item.status === "approved").length;
  const activeLimit = applications.reduce((total, item) => total + Number(item.approved_amount || 0), 0);
  const stats = [
    { label: "Total Pengajuan", value: String(applications.length), hint: "Semua data pinjaman", icon: FileSignature, tone: "from-emerald-500 to-lime-400" },
    { label: "Menunggu Review", value: String(waiting), hint: "Perlu dicek", icon: Clock3, tone: "from-amber-400 to-orange-500" },
    { label: "Di Analis", value: String(inAnalysis), hint: "Menunggu keputusan final", icon: BadgeCheck, tone: "from-cyan-500 to-sky-500" },
    { label: "Sudah ACC", value: String(approved), hint: "Final oleh analis", icon: BadgeCheck, tone: "from-sky-500 to-cyan-400" },
    { label: "Limit Aktif", value: formatIDR(activeLimit), hint: "Total limit berjalan", icon: WalletCards, tone: "from-violet-500 to-fuchsia-500" },
  ];

  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_86%_12%,rgba(163,230,53,0.55),transparent_30%),linear-gradient(135deg,#052e26_0%,#047857_56%,#49d640_140%)] p-6 text-white shadow-[0_24px_60px_rgba(4,120,87,0.18)] sm:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-lime-100">
                <Sparkles className="h-3.5 w-3.5" />
                Dashboard Master
              </p>
              <h1 className="max-w-2xl text-3xl font-black sm:text-4xl">Kelola pinjaman agent PulsaKilat dengan rapi.</h1>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-emerald-50/90">
                Ringkasan awal untuk melihat kondisi pengajuan dan limit. Detail pengajuan ada di menu Data Pinjaman.
              </p>
            </div>
            <div className="grid h-20 w-20 place-items-center rounded-[26px] bg-white text-emerald-700 shadow-lg">
              <LayoutDashboard className="h-10 w-10" strokeWidth={2.3} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
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

        <section className="rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Data Pinjaman</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Buka menu Data Pinjaman di sidebar untuk melihat foto dokumen, tanda tangan, dan detail pengajuan agent.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
