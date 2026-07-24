"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PencilLine, ShieldCheck, XCircle } from "lucide-react";

type Props = {
  applicationId: number;
  requestedAmount: number;
  approvedAmount?: number;
  marketingNote?: string;
  status: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
};

export function MasterAgentCreditDecisionControls({ applicationId, requestedAmount, approvedAmount = 0, marketingNote = "", status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approved" | "rejected" | "">("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(approvedAmount || requestedAmount));
  const [note, setNote] = useState(marketingNote);
  const isFinal = status === "approved" || status === "rejected";

  async function decide(decision: "approved" | "rejected") {
    if (busy) return;
    const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
    setBusy(decision);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/applications/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: applicationId,
          decision,
          approved_amount: decision === "approved" ? parsedAmount : 0,
          note: note.trim() || (decision === "approved" ? "Data agent sesuai dan disetujui." : "Data agent belum sesuai."),
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
      <div className={status === "approved" ? "rounded-[24px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-700" : "rounded-[24px] border border-rose-200 bg-rose-50 p-3 text-rose-600"}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
            {status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black">{status === "approved" ? "Disetujui" : "Ditolak"}</span>
            <span className="mt-0.5 block text-[9px] font-bold opacity-70">Keputusan sudah tersimpan</span>
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-white px-3 text-[10px] font-black shadow-sm transition hover:-translate-y-0.5"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        {marketingNote ? <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[10px] font-bold leading-4 opacity-80">{marketingNote}</p> : null}
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
      <div className="mb-3 space-y-2">
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Nominal ACC</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            className="mt-1 h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 outline-none focus:border-emerald-400 focus:bg-white"
          />
        </label>
        <label className="block">
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Catatan</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Catatan untuk agent"
            className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
          />
        </label>
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
      {editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="mt-2 h-9 w-full rounded-2xl bg-slate-100 text-[10px] font-black text-slate-500 transition hover:bg-slate-200"
        >
          Batal edit
        </button>
      ) : null}
      {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
