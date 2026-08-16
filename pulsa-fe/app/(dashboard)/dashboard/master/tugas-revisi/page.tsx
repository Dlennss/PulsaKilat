import Link from "next/link";
import { AlertTriangle, Camera, ClipboardCheck, Clock3, ReceiptText } from "lucide-react";
import { getAppServerSession } from "@/lib/server-auth";
import { getAgentCreditApplications, type AgentCreditApplication } from "@/lib/api.auth";
import { attachAgentCreditPaymentsFallback } from "@/lib/agent-credit-payment-fallback.server";
import { MasterAgentCreditApplicationList } from "@/components/dashboard/MasterAgentCreditApplicationList";

type SessionShape = { backendToken?: string };

function hasDocument(item: AgentCreditApplication, key: string) {
  const value = item.document_data?.[key];
  if (!value || typeof value !== "object") return false;
  const src = (value as { data_url?: unknown }).data_url;
  return typeof src === "string" && src.startsWith("data:image/");
}

function documentsComplete(item: AgentCreditApplication) {
  return ["ktp", "store", "selfie_ktp", "selfie_marketing"].every((key) => hasDocument(item, key));
}

function isOverdue(item: AgentCreditApplication) {
  const status = String(item.loan_status || "").toLowerCase();
  if (status === "overdue") return true;
  if (!item.loan_due_date || Number(item.outstanding_amount || 0) <= 0) return false;
  const due = new Date(item.loan_due_date);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

export default async function MarketingTaskRevisionPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
  const raw = session?.backendToken ? await getAgentCreditApplications(session.backendToken) : [];
  const applications = await attachAgentCreditPaymentsFallback(raw);

  const revisions = applications.filter(
    (item) => (item.status === "submitted" || item.status === "marketing_review") && item.analyst_recommendation === "revision_required",
  );
  const incomplete = applications.filter(
    (item) => (item.status === "submitted" || item.status === "marketing_review") && !documentsComplete(item) && item.analyst_recommendation !== "revision_required",
  );
  const ready = applications.filter(
    (item) => (item.status === "submitted" || item.status === "marketing_review") && documentsComplete(item) && item.analyst_recommendation !== "revision_required",
  );
  const overdue = applications.filter(isOverdue);
  const workItems = [...revisions, ...incomplete, ...ready].filter(
    (item, index, rows) => rows.findIndex((candidate) => candidate.id === item.id) === index,
  );

  const cards = [
    { label: "Revisi Operator", value: revisions.length, hint: "Catatan wajib diperbaiki", icon: AlertTriangle, tone: "border-amber-200 bg-amber-50 text-amber-800" },
    { label: "Dokumen Belum Lengkap", value: incomplete.length, hint: "Perlu kunjungan atau foto", icon: Camera, tone: "border-sky-200 bg-sky-50 text-sky-800" },
    { label: "Siap Dikirim", value: ready.length, hint: "Verifikasi dan tanda tangan", icon: ClipboardCheck, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    { label: "Lewat Jatuh Tempo", value: overdue.length, hint: "Tindak lanjut penagihan", icon: ReceiptText, tone: "border-rose-200 bg-rose-50 text-rose-800" },
  ];

  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#053a2f,#047857_58%,#37c93f)] px-5 py-6 text-white shadow-[0_22px_52px_rgba(4,120,87,0.18)] sm:px-7 sm:py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">Pusat Kerja Marketing</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black">Tugas & Revisi</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-50/85">Kerjakan revisi operator lebih dulu, lanjutkan dokumen lapangan, lalu kirim pengajuan yang sudah valid.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-xs font-black"><Clock3 className="h-4 w-4" />{workItems.length} tugas aktif</span>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black">{card.label}</p><p className="mt-2 text-3xl font-black">{card.value}</p><p className="mt-1 text-[11px] font-bold opacity-70">{card.hint}</p></div><Icon className="h-5 w-5" /></div>
              </div>
            );
          })}
        </div>

        {overdue.length ? (
          <Link href="/dashboard/master/riwayat-pinjaman" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-4 text-rose-800 shadow-sm">
            <span><span className="block text-sm font-black">{overdue.length} agent memerlukan tindak lanjut penagihan</span><span className="mt-1 block text-xs font-semibold text-slate-500">Buka Penagihan Kredit untuk melihat nominal dan tanggal jatuh tempo.</span></span>
            <ReceiptText className="h-5 w-5 shrink-0" />
          </Link>
        ) : null}

        <MasterAgentCreditApplicationList
          applications={workItems}
          mode="marketing"
          eyebrow="Urutan Pekerjaan"
          title="Tugas yang perlu diselesaikan"
          emptyTitle="Semua tugas selesai"
          emptyDescription="Belum ada revisi operator atau dokumen lapangan yang perlu dilengkapi."
        />
      </section>
    </main>
  );
}
