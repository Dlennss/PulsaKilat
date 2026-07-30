import {
  BadgeCheck,
  Clock3,
  FileSignature,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { attachAgentCreditPaymentsFallback } from "@/lib/agent-credit-payment-fallback.server";
import { MasterAgentCreditApplicationList } from "@/components/dashboard/MasterAgentCreditApplicationList";

type SessionShape = {
  backendToken?: string;
  user?: { role?: string };
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export default async function MasterDashboardPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const rawApplications = session?.backendToken ? await getAgentCreditApplications(session.backendToken) : [];
  const applications = await attachAgentCreditPaymentsFallback(rawApplications);
  const role = String(session?.user?.role || "").trim().toLowerCase();
  const masterItems = applications.filter((item) => {
    if (role === "marketing") return item.status === "submitted" || item.status === "marketing_review";
    if (item.status === "submitted" || item.status === "marketing_review" || item.status === "master_review") return true;
    if (item.status !== "approved") return false;
    const loanStatus = String(item.loan_status || "").toLowerCase();
    return loanStatus === "active" || loanStatus === "overdue" || Number(item.outstanding_amount || 0) > 0;
  });
  const reviewMode = role === "marketing" ? "marketing" : "master";
  const waiting = masterItems.filter((item) => item.status === "submitted" || item.status === "marketing_review" || item.status === "analysis_review" || item.status === "master_review").length;
  const inAnalysis = applications.filter((item) => item.status === "analysis_review").length;
  const approved = masterItems.filter((item) => item.status === "approved").length;
  const activeOutstanding = masterItems.reduce((total, item) => total + Number(item.outstanding_amount || 0), 0);
  const stats = [
    { label: "Total Data", value: String(masterItems.length), hint: masterItems.length ? "Masuk panel master" : "Belum ada data", icon: FileSignature, tone: "from-emerald-500 to-lime-400" },
    { label: "Perlu ACC", value: String(waiting), hint: role === "marketing" ? "Menunggu verifikasi marketing" : "Menunggu proses", icon: Clock3, tone: "from-amber-400 to-orange-500" },
    { label: "Di Analis", value: String(inAnalysis), hint: inAnalysis ? "Menunggu keputusan analis" : "Belum ada", icon: ShieldCheck, tone: "from-cyan-500 to-sky-500" },
    { label: "Disetujui", value: String(approved), hint: approved ? "Keputusan final analis" : "Belum ada ACC", icon: BadgeCheck, tone: "from-sky-500 to-cyan-400" },
    { label: "Sisa Tagihan", value: formatIDR(activeOutstanding), hint: activeOutstanding ? "Pinjaman berjalan" : "Belum ada tagihan", icon: WalletCards, tone: "from-violet-500 to-fuchsia-500" },
  ];

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
                <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Data Kredit Saldo Agent</h1>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90 sm:text-base">
                  Cek dokumen agent, tanda tangan sebagai master, lalu kirim data lengkap ke analis untuk keputusan akhir.
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

            <div className="grid gap-5">
              <MasterAgentCreditApplicationList applications={masterItems} mode={reviewMode} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
