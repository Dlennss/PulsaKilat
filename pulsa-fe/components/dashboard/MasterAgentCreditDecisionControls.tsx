"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

type Props = {
  applicationId: number;
  requestedAmount: number;
  status: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
};

export function MasterAgentCreditDecisionControls({ applicationId, requestedAmount, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approved" | "rejected" | "">("");
  const [error, setError] = useState("");
  const isFinal = status === "approved" || status === "rejected";

  async function decide(decision: "approved" | "rejected") {
    if (busy || isFinal) return;
    setBusy(decision);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/applications/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: applicationId,
          decision,
          approved_amount: decision === "approved" ? requestedAmount : 0,
          note: decision === "approved" ? "Data agent sesuai dan disetujui." : "Data agent belum sesuai.",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Keputusan gagal disimpan");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keputusan gagal disimpan");
    } finally {
      setBusy("");
    }
  }

  if (isFinal) {
    return (
      <div className={status === "approved" ? "flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-700" : "flex items-center gap-3 rounded-[22px] border border-rose-200 bg-rose-50 p-3 text-rose-600"}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
          {status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-black">{status === "approved" ? "Disetujui" : "Ditolak"}</span>
          <span className="mt-0.5 block text-[9px] font-bold opacity-70">Keputusan sudah tersimpan</span>
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-emerald-100 bg-white/90 p-3 shadow-[0_12px_26px_rgba(6,78,59,0.08)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-950">Keputusan</p>
          <p className="truncate text-[9px] font-bold text-slate-400">Cek data lalu pilih hasil review</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => decide("approved")}
          disabled={Boolean(busy)}
          className="group relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#047857,#22c55e)] px-3 text-xs font-black text-white shadow-[0_14px_24px_rgba(5,150,105,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(5,150,105,0.28)] disabled:translate-y-0 disabled:opacity-60"
        >
          <span className="absolute inset-y-0 right-0 w-10 bg-white/15 opacity-0 transition group-hover:opacity-100" />
          {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy === "approved" ? "Proses" : "Setujui"}
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          disabled={Boolean(busy)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-white px-3 text-xs font-black text-rose-600 shadow-[0_10px_20px_rgba(225,29,72,0.08)] transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-[0_14px_24px_rgba(225,29,72,0.12)] disabled:translate-y-0 disabled:opacity-60"
        >
          {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {busy === "rejected" ? "Proses" : "Tolak"}
        </button>
      </div>
      {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
