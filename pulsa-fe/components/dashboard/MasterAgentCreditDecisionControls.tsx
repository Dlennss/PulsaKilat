"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PencilLine, ShieldCheck, XCircle } from "lucide-react";

type Props = {
  applicationId: number;
  requestedAmount: number;
  approvedAmount?: number;
  marketingNote?: string;
  analystNote?: string;
  analystRecommendation?: string;
  analystRecommendedAmount?: number;
  status: string;
  mode?: "marketing" | "master" | "analyst";
};

type ApiBody = {
  ok?: boolean;
  error?: string;
};

type DecisionAction = "approved" | "rejected";

export function MasterAgentCreditDecisionControls({
  applicationId,
  requestedAmount,
  approvedAmount = 0,
  marketingNote = "",
  analystNote = "",
  analystRecommendation = "",
  analystRecommendedAmount = 0,
  status,
  mode = "master",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<DecisionAction | "">("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(approvedAmount || analystRecommendedAmount || requestedAmount));
  const [note, setNote] = useState(analystNote || marketingNote);
  const isFinal = status === "approved" || status === "rejected";
  const isAnalystMode = mode === "analyst";
  const masterForwardMode = mode === "master" && (status === "submitted" || status === "marketing_review");
  const waitingForAnalyst = mode === "master" && status === "analysis_review";
  const analystRejected = mode === "master" && status === "master_review" && analystRecommendation === "rejected";
  const canAct = isAnalystMode ? status === "submitted" || status === "marketing_review" || status === "analysis_review" : status === "submitted" || status === "marketing_review" || status === "master_review" || isFinal;
  const actionTitle = isAnalystMode ? "Analisa Risiko" : waitingForAnalyst ? "Menunggu analis" : masterForwardMode ? "Cek master" : "Keputusan master";
  const actionDesc = isAnalystMode
    ? "Beri rekomendasi layak atau tidak layak untuk master."
    : waitingForAnalyst
      ? "Pengajuan sedang dianalisa. ACC master aktif setelah analis memberi rekomendasi."
      : masterForwardMode
      ? "Validasi dokumen, lalu teruskan ke analis."
      : "Pilih keputusan final setelah analis memberi rekomendasi.";
  const approveLabel = isAnalystMode ? "Rekom Setuju" : masterForwardMode ? "Teruskan" : "Setujui";
  const rejectLabel = isAnalystMode ? "Rekom Tolak" : "Tolak";

  async function decide(decision: DecisionAction) {
    if (busy) return;
    const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
    const apiDecision = isAnalystMode
      ? decision === "approved"
        ? "recommend_approve"
        : "recommend_reject"
      : decision === "approved" && masterForwardMode
        ? "forward"
        : decision;
    const defaultNote = masterForwardMode
      ? "Dokumen lengkap, diteruskan ke analis."
      : decision === "approved"
        ? "Data agent sesuai dan disetujui."
        : "Data agent belum sesuai.";
    setBusy(decision);
    setError("");
    try {
      const token = window.localStorage.getItem("auth_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (isAnalystMode) headers["X-Reviewer-Mode"] = "analyst";
      const response = await fetch("/api/agent-credit/applications/decision", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: applicationId,
          decision: apiDecision,
          approved_amount: decision === "approved" ? parsedAmount : 0,
          note: note.trim() || defaultNote,
          reviewer_mode: isAnalystMode ? "analyst" : "master",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Keputusan gagal disimpan");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keputusan gagal disimpan");
    } finally {
      setBusy("");
    }
  }

  if (isFinal && !editing) {
    return (
      <div className={status === "approved" ? "rounded-[24px] border border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_55%,#ecfccb_100%)] p-3 text-emerald-700 shadow-[0_14px_28px_rgba(5,150,105,0.08)]" : "rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_60%,#ffe4e6_100%)] p-3 text-rose-600 shadow-[0_14px_28px_rgba(225,29,72,0.08)]"}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
            {status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black">{status === "approved" ? "Pengajuan Disetujui" : "Pengajuan Ditolak"}</span>
            <span className="mt-0.5 block text-[11px] font-bold opacity-70">
              {status === "approved" ? "Limit agent sudah bisa diproses." : "Agent akan melihat pemberitahuan penolakan."}
            </span>
          </span>
          {mode === "master" ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-xs font-black shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5"
            >
              <PencilLine className="h-4 w-4" />
              Edit Keputusan
            </button>
          ) : null}
        </div>
        {marketingNote ? <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[10px] font-bold leading-4 opacity-80">{marketingNote}</p> : null}
      </div>
    );
  }

  if (!canAct && !editing) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 text-slate-600">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-400">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black">{waitingForAnalyst ? "Menunggu analis" : "Menunggu master"}</p>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">{actionDesc}</p>
          </div>
        </div>
        {analystRecommendation ? (
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-[10px] font-bold text-slate-500">
            Rekomendasi analis: {analystRecommendation === "approved" ? "Layak" : "Tidak layak"} {analystRecommendedAmount ? `- Rp ${new Intl.NumberFormat("id-ID").format(analystRecommendedAmount)}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-emerald-100 bg-white p-3 shadow-[0_18px_40px_rgba(6,78,59,0.08)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#052e26,#047857_58%,#84cc16_135%)] p-4 text-white">
          <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/12" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/14 text-lime-200 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.4} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-100">{isAnalystMode ? "Meja Analis" : "Pusat Keputusan"}</p>
              <p className="mt-1 text-lg font-black">{actionTitle}</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-white/72">{actionDesc}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-600">{isAnalystMode ? "Rekomendasi Nominal" : "Nominal ACC"}</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
                className="mt-0.5 h-8 w-full bg-transparent text-lg font-black text-slate-950 outline-none"
              />
            </label>
            <label className="col-span-2 block rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-1 lg:col-span-2 xl:col-span-1">
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-600">{isAnalystMode ? "Catatan Risiko" : "Catatan"}</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Catatan untuk agent"
                className="mt-0.5 h-8 w-full bg-transparent text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => decide("approved")}
              disabled={Boolean(busy) || analystRejected}
              className="group relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#064e3b,#059669,#65a30d)] px-3 text-xs font-black text-white shadow-[0_14px_24px_rgba(5,150,105,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(5,150,105,0.28)] disabled:translate-y-0 disabled:opacity-60"
            >
              <span className="absolute inset-y-0 right-0 w-10 bg-white/15 opacity-0 transition group-hover:opacity-100" />
              {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {busy === "approved" ? "Proses" : approveLabel}
            </button>
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={Boolean(busy)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 shadow-[0_10px_20px_rgba(225,29,72,0.08)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-white hover:shadow-[0_14px_24px_rgba(225,29,72,0.12)] disabled:translate-y-0 disabled:opacity-60"
            >
              {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {busy === "rejected" ? "Proses" : rejectLabel}
            </button>
          </div>
        </div>
      </div>
      {editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="mt-3 h-10 w-full rounded-2xl bg-slate-100 text-[10px] font-black text-slate-500 transition hover:bg-slate-200"
        >
          Batal edit
        </button>
      ) : null}
      {analystRejected ? <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-center text-[10px] font-black text-amber-700">Analis merekomendasikan tolak, master hanya bisa menolak pengajuan ini.</p> : null}
      {error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
