"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PencilLine, XCircle } from "lucide-react";

type Props = {
  applicationId: number;
  requestedAmount: number;
  approvedAmount?: number;
  marketingNote?: string;
  analystNote?: string;
  analystRecommendation?: string;
  analystRecommendedAmount?: number;
  status: string;
  mode?: "marketing" | "master";
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
  const isFinal = status === "approved" || status === "rejected" || status === "analysis_rejected" || status === "master_rejected";
  const canAct = status === "submitted" || status === "marketing_review" || status === "analysis_review" || status === "master_review" || isFinal;
  const approveLabel = "Setujui";
  const rejectLabel = "Tolak";

  async function decide(decision: DecisionAction) {
    if (busy) return;
    const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
    const defaultNote = decision === "approved"
        ? "Data agent sesuai dan disetujui."
        : "Data agent belum sesuai.";
    setBusy(decision);
    setError("");
    try {
      const token = window.localStorage.getItem("auth_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/agent-credit/applications/decision", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: applicationId,
          decision,
          approved_amount: decision === "approved" ? parsedAmount : 0,
          note: note.trim() || defaultNote,
          reviewer_mode: "master",
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
      <div className={status === "approved" ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700" : "rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600"}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
            {status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black">{status === "approved" ? "Disetujui" : "Ditolak"}</span>
            <span className="mt-0.5 block truncate text-[10px] font-bold opacity-70">
              {status === "approved" ? "Limit agent sudah bisa diproses." : "Agent akan melihat pemberitahuan penolakan."}
            </span>
          </span>
          {mode === "master" ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-[11px] font-black shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit
            </button>
          ) : null}
        </div>
        {marketingNote || analystNote ? <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[10px] font-bold leading-4 opacity-80">{marketingNote || analystNote}</p> : null}
      </div>
    );
  }

  if (!canAct && !editing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
        <div>
          <p className="text-xs font-black">Menunggu review</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">Belum bisa diputuskan di tahap ini.</p>
        </div>
        {analystRecommendation ? (
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-[10px] font-bold text-slate-500">
            Catatan lama: {analystRecommendation === "approved" ? "Layak" : "Tidak layak"} {analystRecommendedAmount ? `- Rp ${new Intl.NumberFormat("id-ID").format(analystRecommendedAmount)}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fffb_58%,#ecfdf5_100%)] p-3 shadow-[0_10px_24px_rgba(6,78,59,0.05)]">
      <div className="grid gap-2 xl:grid-cols-[160px_minmax(260px,1fr)_210px] xl:items-stretch">
        <label className="block min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)] focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Nominal ACC</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            className="mt-1 h-8 w-full bg-transparent text-base font-black text-slate-950 outline-none"
          />
        </label>
        <label className="block min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)] focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Catatan</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Catatan untuk agent"
            rows={2}
            className="mt-1 min-h-10 w-full resize-none bg-transparent text-xs font-bold leading-5 text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-2 xl:grid-cols-1">
          <button
            type="button"
            onClick={() => decide("approved")}
              disabled={Boolean(busy)}
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#047857,#16a34a)] px-3 text-[11px] font-black leading-3 text-white shadow-[0_10px_18px_rgba(5,150,105,0.18)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
          >
            {busy === "approved" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">{busy === "approved" ? "Proses" : approveLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => decide("rejected")}
            disabled={Boolean(busy)}
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-[11px] font-black leading-3 text-rose-600 shadow-[0_8px_16px_rgba(225,29,72,0.06)] transition hover:-translate-y-0.5 hover:bg-rose-50 disabled:translate-y-0 disabled:opacity-60"
          >
            {busy === "rejected" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <XCircle className="h-4 w-4 shrink-0" />}
            <span className="truncate">{busy === "rejected" ? "Proses" : rejectLabel}</span>
          </button>
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
      {error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
