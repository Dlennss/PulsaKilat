"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";

type ApiBody = {
  ok?: boolean;
  error?: string;
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export function MasterAgentCreditPaymentControls({
  applicationId,
  memberId,
  outstandingAmount,
  status,
}: {
  applicationId: number;
  memberId: number;
  outstandingAmount: number;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status !== "approved") return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          member_id: memberId,
          amount: Number(String(form.get("amount") || "0").replace(/[^\d]/g, "")),
          note: String(form.get("note") || ""),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.ok) throw new Error(body.error || "Pembayaran gagal disimpan");
      event.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pembayaran gagal disimpan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,#f0f9ff,#ffffff)] p-4 shadow-[0_16px_34px_rgba(14,165,233,0.08)]">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
          {outstandingAmount > 0 ? <Banknote className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">Pembayaran Cicilan</p>
          <p className="text-xs font-bold text-slate-500">Sisa: {formatIDR(outstandingAmount)}</p>
        </div>
      </div>
      {outstandingAmount > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="amount" inputMode="numeric" placeholder="Nominal bayar" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none focus:border-sky-400" />
          <input name="note" placeholder="Catatan" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-sky-400" />
          <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(14,165,233,0.18)] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            Bayar
          </button>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-black text-sky-700">Cicilan sudah lunas.</p>
      )}
      {error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600">{error}</p> : null}
    </form>
  );
}
