import { BadgeCheck, Clock3, ShieldAlert } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { MasterAgentCreditApplicationList } from "@/components/dashboard/MasterAgentCreditApplicationList";

type SessionShape = {
  backendToken?: string;
};

export default async function MasterAnalystPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const applications = session?.backendToken ? await getAgentCreditApplications(session.backendToken) : [];
  const analystItems = applications.filter((item) => item.status === "submitted" || item.status === "marketing_review" || item.status === "analysis_review");
  const needsAnalysis = analystItems.length;
  const recommended = applications.filter((item) => item.status === "master_review").length;
  const rejectedRisk = applications.filter((item) => item.analyst_recommendation === "rejected").length;

  const stats = [
    { label: "Perlu Analisa", value: String(needsAnalysis), icon: Clock3, tone: "from-amber-400 to-orange-500" },
    { label: "Sudah Direkomendasikan", value: String(recommended), icon: BadgeCheck, tone: "from-emerald-500 to-lime-400" },
    { label: "Risiko Tinggi", value: String(rejectedRisk), icon: ShieldAlert, tone: "from-rose-500 to-orange-400" },
  ];

  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#052e26_0%,#047857_58%,#84cc16_130%)] px-5 py-7 text-white sm:px-7">
            <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/12" />
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-lime-100">Panel Analis</p>
            <h1 className="mt-4 text-3xl font-black tracking-normal sm:text-4xl">Analisa Risiko Kredit Agent</h1>
            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90">
              Beri rekomendasi setuju atau tolak sebelum master mengambil keputusan final.
            </p>
          </div>

          <div className="space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500">{item.label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                      </div>
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${item.tone} text-white shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <MasterAgentCreditApplicationList applications={analystItems} mode="analyst" />
          </div>
        </div>
      </section>
    </main>
  );
}
