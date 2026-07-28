import { ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { MasterAgentAccountsPanel } from "@/components/dashboard/MasterAgentAccountsPanel";

export default function MasterAkunAgentPage() {
  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="relative isolate overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_92%_0%,rgba(163,230,53,0.52),transparent_26%),linear-gradient(135deg,#052e26_0%,#057a45_58%,#3bd64a_110%)] px-5 py-6 text-white shadow-[0_24px_60px_rgba(4,120,87,0.22)] sm:px-7 lg:px-9 lg:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/20 bg-white/10" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-lime-100">
                <UserCog className="h-3.5 w-3.5" />
                Master Agent
              </p>
              <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Master Kelola Agent</h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-emerald-50/90 sm:text-base">
                Edit dan hapus akun agent retail PulsaKilat langsung dari data database.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:w-[340px]">
              <div className="rounded-[22px] bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
                <UsersRound className="h-6 w-6 text-lime-100" />
                <p className="mt-3 text-xl font-black">CRUD</p>
                <p className="mt-1 text-[11px] font-semibold text-white/70">Agent retail</p>
              </div>
              <div className="rounded-[22px] bg-white p-4 text-emerald-800 shadow-lg">
                <ShieldCheck className="h-6 w-6" />
                <p className="mt-3 text-xl font-black">Aman</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-700/70">Role agent saja</p>
              </div>
            </div>
          </div>
        </div>

        <MasterAgentAccountsPanel />
      </section>
    </main>
  );
}
