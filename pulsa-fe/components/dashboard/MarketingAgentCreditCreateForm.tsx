"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";

type ApiBody = {
  ok?: boolean;
  error?: string;
};

type MarketingAgentCreditCreateFormProps = {
  defaultOpen?: boolean;
};

export function MarketingAgentCreditCreateForm({ defaultOpen = false }: MarketingAgentCreditCreateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/manual-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: Number(form.get("member_id") || 0),
          requested_amount: Number(String(form.get("requested_amount") || "0").replace(/[^\d]/g, "")),
          applicant_data: {
            agent_name: String(form.get("agent_name") || ""),
            store_name: String(form.get("store_name") || ""),
            nik: String(form.get("nik") || ""),
            whatsapp: String(form.get("whatsapp") || ""),
            email: String(form.get("email") || ""),
            tenor_months: Number(form.get("tenor_months") || 3),
            home_address: String(form.get("home_address") || ""),
            store_address: String(form.get("store_address") || ""),
            input_by: "marketing",
          },
          document_data: {},
          agent_signature: "",
          terms_accepted: true,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.ok) throw new Error(body.error || "Pengajuan gagal dibuat");
      event.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengajuan gagal dibuat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.07)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">Marketing</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Tambah Pengajuan Manual</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Untuk user/agent yang ingin meminjam lewat marketing.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-950 px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(6,78,59,0.18)] transition hover:-translate-y-0.5"
        >
          <PlusCircle className="h-4 w-4" />
          {open ? "Tutup" : "Tambah"}
        </button>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["member_id", "Member ID", "ID akun peminjam"],
            ["agent_name", "Nama", "Nama peminjam"],
            ["store_name", "Nama Toko", "Nama toko/usaha"],
            ["nik", "NIK", "16 digit NIK"],
            ["whatsapp", "Nomor WA", "08xxxxxxxxxx"],
            ["email", "Email", "email@domain.com"],
            ["requested_amount", "Nominal", "Maksimal 500000"],
          ].map(([name, label, placeholder]) => (
            <label key={name} className="block">
              <span className="text-[10px] font-black text-slate-500">{label}</span>
              <input name={name} placeholder={placeholder} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-black text-slate-500">Tenor Cicilan</span>
            <select name="tenor_months" defaultValue="3" className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 outline-none focus:border-emerald-400 focus:bg-white">
              <option value="3">3 bulan</option>
              <option value="6">6 bulan</option>
              <option value="12">12 bulan</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-black text-slate-500">Alamat Rumah</span>
            <textarea name="home_address" rows={2} placeholder="Alamat rumah" className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-black text-slate-500">Alamat Toko</span>
            <textarea name="store_address" rows={2} placeholder="Alamat toko" className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-950 outline-none focus:border-emerald-400 focus:bg-white" />
          </label>
          {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 sm:col-span-2">{error}</p> : null}
          <button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#047857,#84cc16)] text-sm font-black text-white shadow-[0_14px_28px_rgba(5,150,105,0.22)] disabled:opacity-60 sm:col-span-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Buat Pengajuan
          </button>
        </form>
      ) : null}
    </section>
  );
}
