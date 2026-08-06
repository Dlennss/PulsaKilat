import {
  BadgeCheck,
  Camera,
  Clock3,
  FileSignature,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getAppServerSession } from "@/lib/server-auth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { attachAgentCreditPaymentsFallback } from "@/lib/agent-credit-payment-fallback.server";
import { MasterAgentCreditApplicationList } from "@/components/dashboard/MasterAgentCreditApplicationList";

type SessionShape = {
  backendToken?: string;
  user?: { role?: string };
};

export default async function MasterDashboardPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
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
  const waiting = masterItems.filter((item) => item.status === "submitted" || item.status === "marketing_review" || item.status === "master_review").length;
  const inAnalysis = applications.filter((item) => item.status === "analysis_review").length;
  const approved = masterItems.filter((item) => item.status === "approved").length;
  const stats = [
    { label: "Total Pengajuan", value: String(masterItems.length), hint: "Data masuk marketing", icon: FileSignature, tone: "from-emerald-500 to-lime-400" },
    { label: "Perlu Didampingi", value: String(waiting), hint: "Cek dokumen dan selfie", icon: Camera, tone: "from-amber-400 to-orange-500" },
    { label: "Dikirim Operator", value: String(inAnalysis), hint: "Menunggu keputusan final", icon: ShieldCheck, tone: "from-cyan-500 to-sky-500" },
    { label: "Disetujui", value: String(approved), hint: "Kredit aktif dipantau", icon: BadgeCheck, tone: "from-sky-500 to-cyan-400" },
  ];

  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_92%_10%,rgba(190,242,100,0.55),transparent_28%),linear-gradient(135deg,#053a2f_0%,#05824c_55%,#45d63f_100%)] px-5 py-7 text-white sm:px-7 lg:px-9 lg:py-9">
            <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/25 bg-white/10" />
            <div className="absolute bottom-0 right-28 h-32 w-32 rounded-full bg-lime-300/20 blur-2xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-lime-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pertemuan & Selfie
                </p>
                <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Pendampingan lapangan marketing</h1>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90 sm:text-base">
                  Lengkapi selfie bersama agent, cek dokumen pengajuan, tanda tangan sebagai marketing, lalu kirim berkas lengkap ke operator.
                </p>
              </div>
              <div className="rounded-3xl border border-white/20 bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-700 shadow-lg">
                    <UsersRound className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-100">Mode Marketing</p>
                    <p className="text-xl font-black">Dampingi Agent</p>
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

            <div className="rounded-[26px] border border-emerald-100 bg-[linear-gradient(135deg,#f7fffb_0%,#eefbf4_100%)] p-4 shadow-[0_16px_36px_rgba(5,122,69,0.06)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Clock3 className="h-7 w-7" strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Fokus Pendampingan</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{waiting} pengajuan perlu ditangani</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Buka detail pengajuan untuk memastikan data agent, dokumen, tanda tangan agent, dan selfie bersama marketing sudah lengkap.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <MasterAgentCreditApplicationList
                applications={masterItems}
                mode={reviewMode}
                eyebrow="Pengajuan Masuk"
                title="Daftar pendampingan agent"
                emptyTitle="Belum ada pengajuan"
                emptyDescription="Data agent yang perlu didampingi marketing akan muncul di sini setelah pengajuan dikirim."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
