"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

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
      <div className={status === "approved" ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-black text-emerald-700" : "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600"}>
        {status === "approved" ? "Pengajuan sudah disetujui" : "Pengajuan sudah ditolak"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => decide("approved")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-xs font-black text-white shadow-[0_12px_24px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {busy === "approved" ? "Menyimpan" : "Setujui"}
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          disabled={Boolean(busy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
        >
          <XCircle className="h-4 w-4" />
          {busy === "rejected" ? "Menyimpan" : "Tolak"}
        </button>
      </div>
      {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
