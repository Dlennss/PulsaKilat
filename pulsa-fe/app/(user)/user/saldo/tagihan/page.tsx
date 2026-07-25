import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, ReceiptText, WalletCards } from "lucide-react";
import { authOptions } from "@/lib/nextauth";
import { getMyAgentCreditApplications, getUserProfile, type AgentCreditApplication } from "@/lib/api.auth";
import { UserBottomNav } from "@/components/user/UserBottomNav";
import type { UserSession } from "@/components/user/types";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
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
  const dueDate = resolveDueDate(item);
  const end = dueDate?.getTime() || 0;
  if (!start || !end) return 1;
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  return Math.max(1, Math.ceil(days / 30));
}

function getPaidAmount(item: AgentCreditApplication) {
  return Math.max(0, Number(item.approved_amount || 0) - Number(item.outstanding_amount || 0));
}

export default async function UserSaldoTagihanPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  if (!session?.backendToken) redirect("/login");

  const profile = await getUserProfile(session.backendToken);
  const role = String(profile?.role || session.user?.role || "").trim().toLowerCase();
  if (role !== "agent" && role !== "user") redirect("/user/saldo");

  const applications = await getMyAgentCreditApplications(session.backendToken);
  const bills = applications.filter((item) => item.status === "approved");
  const activeBills = bills.filter((item) => Number(item.outstanding_amount || 0) > 0);
  const totalOutstanding = activeBills.reduce((total, item) => total + Number(item.outstanding_amount || 0), 0);

  return (
    <main className="min-h-screen bg-[#eef8f3] px-3 pb-24 pt-3">
      <div className="mx-auto w-full max-w-md space-y-4">
        <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#052e26,#047857_58%,#84cc16_135%)] p-5 text-white shadow-[0_22px_50px_rgba(4,120,87,0.22)]">
          <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <Link href="/user/saldo" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-100">Tagihan Agent</p>
              <h1 className="mt-1 text-2xl font-black">Cicilan Kredit</h1>
              <p className="mt-1 text-xs font-semibold text-white/75">Pantau pinjaman dan estimasi bulan pelunasan.</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#047857]">
              <ReceiptText className="h-6 w-6" />
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-[0_16px_34px_rgba(6,78,59,0.07)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sisa Tagihan</p>
            <p className="mt-2 text-xl font-black text-slate-950">{formatIDR(totalOutstanding)}</p>
          </div>
          <div className="rounded-[24px] border border-emerald-100 bg-white p-4 shadow-[0_16px_34px_rgba(6,78,59,0.07)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Pinjaman Aktif</p>
            <p className="mt-2 text-xl font-black text-slate-950">{activeBills.length}</p>
          </div>
        </section>

        <section className="space-y-3">
          {bills.length ? (
            bills.map((item) => {
              const outstanding = Number(item.outstanding_amount || 0);
              const paid = getPaidAmount(item);
              const approved = Number(item.approved_amount || item.requested_amount || 0);
              const progress = approved > 0 ? Math.min(100, Math.round((paid / approved) * 100)) : 0;
              const isPaid = outstanding <= 0;
              const dueDate = resolveDueDate(item);
              return (
                <article key={item.id} className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_18px_42px_rgba(6,78,59,0.08)]">
                  <div className={isPaid ? "bg-emerald-50 px-4 py-4" : "bg-[linear-gradient(135deg,#ffffff,#f0fdf4)] px-4 py-4"}>
                    <div className="flex items-start gap-3">
                      <span className={isPaid ? "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700" : "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700"}>
                        {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Clock3 className="h-6 w-6" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="truncate text-sm font-black text-slate-950">Pinjaman #{item.id}</h2>
                          <span className={isPaid ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-700" : "rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black text-amber-700"}>
                            {isPaid ? "Lunas" : "Aktif"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Tenor {getTenorMonths(item)} bulan sampai lunas</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                        <p className="text-[9px] font-black uppercase text-slate-400">Total Pinjaman</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(approved)}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                        <p className="text-[9px] font-black uppercase text-slate-400">Sisa</p>
                        <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(outstanding)}</p>
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

                  <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                      <CalendarClock className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400">Jatuh Tempo</p>
                      <p className="text-xs font-black text-slate-950">{formatDate(dueDate)}</p>
                    </div>
                    <span className="ml-auto grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
                      <WalletCards className="h-5 w-5" />
                    </span>
                  </div>
                </article>
              );
            })
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
        </section>
      </div>
      <UserBottomNav />
    </main>
  );
}
