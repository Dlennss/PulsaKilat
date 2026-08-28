"use client";

import { CheckCircle2, DatabaseZap, Loader2, Plus, Search, UserRoundCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type AgentOption = {
  id: number;
  name: string;
  email: string;
  phone: string;
  marketing_name: string;
};

type FormState = {
  storeName: string;
  nik: string;
  whatsapp: string;
  homeAddress: string;
  storeAddress: string;
  familyName: string;
  familyRelation: string;
  familyWhatsapp: string;
  excelReference: string;
  amount: string;
  note: string;
};

const initialForm: FormState = {
  storeName: "",
  nik: "",
  whatsapp: "",
  homeAddress: "",
  storeAddress: "",
  familyName: "",
  familyRelation: "",
  familyWhatsapp: "",
  excelReference: "",
  amount: "500000",
  note: "",
};

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function applicantText(item: AgentCreditApplication, key: string) {
  const value = item.applicant_data?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "-";
}

function statusLabel(status: string) {
  if (status === "approved") return "Disetujui";
  if (status === "rejected" || status.endsWith("_rejected")) return "Ditolak";
  return "Pending";
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "rejected" || status.endsWith("_rejected")) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-800";
}

export default function OperatorManualAgentEntryPage() {
  const [applications, setApplications] = useState<AgentCreditApplication[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [tableLoading, setTableLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedID, setSelectedID] = useState(0);
  const [agentSearch, setAgentSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [saving, setSaving] = useState<"pending" | "approve" | "">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplications = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await fetch("/api/agent-credit/applications?limit=200", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; items?: AgentCreditApplication[]; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || "Data migrasi tidak dapat dimuat");
      const rows = (Array.isArray(body.items) ? body.items : []).filter((item) => item.applicant_data?.entry_source === "operator_manual");
      setApplications(rows);
    } catch (loadError) {
      setApplications([]);
      setNotice(loadError instanceof Error ? loadError.message : "Data migrasi tidak dapat dimuat");
    } finally {
      setTableLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    if (!modalOpen) return;
    setAgentsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (agentSearch.trim()) params.set("q", agentSearch.trim());
      const response = await fetch(`/api/agent-credit/manual-applications?${params}`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; items?: AgentOption[]; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || "Daftar agent tidak dapat dimuat");
      setAgents(Array.isArray(body.items) ? body.items : []);
    } catch (loadError) {
      setAgents([]);
      setError(loadError instanceof Error ? loadError.message : "Daftar agent tidak dapat dimuat");
    } finally {
      setAgentsLoading(false);
    }
  }, [agentSearch, modalOpen]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadAgents(), 250);
    return () => window.clearTimeout(timer);
  }, [loadAgents]);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedID), [agents, selectedID]);
  const visibleApplications = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((item) => [item.member_name, item.member_email, applicantText(item, "store_name"), applicantText(item, "excel_reference"), `KRD-${String(item.id).padStart(8, "0")}`].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [applications, tableSearch]);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function openModal() {
    setSelectedID(0);
    setAgentSearch("");
    setForm(initialForm);
    setError("");
    setModalOpen(true);
  }

  function chooseAgent(agent: AgentOption) {
    setSelectedID(agent.id);
    setForm((current) => ({ ...current, whatsapp: current.whatsapp || agent.phone }));
    setError("");
  }

  async function submit(action: "pending" | "approve") {
    if (!selectedAgent) return setError("Pilih akun agent terlebih dahulu.");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 500000 || amount > 2000000) return setError("Nominal kredit harus antara Rp500.000 dan Rp2.000.000.");
    setSaving(action);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/manual-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedAgent.id,
          requested_amount: amount,
          action,
          note: form.note.trim(),
          applicant_data: {
            agent_name: selectedAgent.name,
            email: selectedAgent.email,
            whatsapp: form.whatsapp.trim() || selectedAgent.phone,
            store_name: form.storeName.trim(),
            nik: form.nik.replace(/\D/g, ""),
            home_address: form.homeAddress.trim(),
            store_address: form.storeAddress.trim(),
            family_name: form.familyName.trim(),
            family_relation: form.familyRelation.trim(),
            family_whatsapp: form.familyWhatsapp.trim(),
            excel_reference: form.excelReference.trim(),
            operator_note: form.note.trim(),
          },
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; saved?: boolean; error?: string; message?: string; credit_id?: string };
      if (!response.ok || !body.ok) {
        if (body.saved) {
          setModalOpen(false);
          setNotice(`${body.credit_id || "Data"} tersimpan sebagai Pending. ${body.error || ""}`.trim());
          await loadApplications();
          return;
        }
        throw new Error(body.error || "Data agent gagal disimpan");
      }
      setModalOpen(false);
      setNotice(`${body.message || "Data agent berhasil disimpan"}. ID ${body.credit_id || "-"}.`);
      await loadApplications();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Data agent gagal disimpan");
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="min-h-screen bg-[#eef7f2] p-3 text-[#082f28] sm:p-6 lg:p-8">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(6,78,59,0.08)]">
        <header className="flex flex-col gap-4 border-b border-emerald-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><DatabaseZap className="h-5 w-5" /></span>
            <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Operator Kredit</p><h1 className="mt-1 text-2xl font-black text-slate-950">Migrasi Data Agent</h1><p className="mt-1 text-xs font-semibold text-slate-500">Daftar pengajuan kredit yang dipindahkan dari data lama.</p></div>
          </div>
          <button type="button" onClick={openModal} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(4,120,87,0.22)] transition hover:bg-emerald-800"><Plus className="h-5 w-5" />Migrasi Data</button>
        </header>

        <div className="p-4 sm:p-6">
          {notice ? <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Tutup pemberitahuan"><X className="h-4 w-4" /></button></div> : null}
          <label className="flex h-11 max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:bg-white"><Search className="h-4 w-4 text-emerald-700" /><input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Cari ID kredit, agent, toko, atau referensi" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" /></label>
        </div>

        <div className="overflow-x-auto border-t border-emerald-100">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-emerald-50 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-900"><tr><th className="px-5 py-3">ID Kredit</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Toko</th><th className="px-4 py-3">Referensi</th><th className="px-4 py-3">Nominal</th><th className="px-4 py-3">Status</th><th className="px-5 py-3">Tanggal</th></tr></thead>
            <tbody>
              {visibleApplications.map((item) => <tr key={item.id} className="border-t border-slate-100 hover:bg-emerald-50/40"><td className="whitespace-nowrap px-5 py-4 font-black text-emerald-800">KRD-{String(item.id).padStart(8, "0")}</td><td className="px-4 py-4"><p className="font-black text-slate-950">{item.member_name || applicantText(item, "agent_name")}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{item.member_email || applicantText(item, "email")}</p></td><td className="px-4 py-4 font-semibold text-slate-600">{applicantText(item, "store_name")}</td><td className="px-4 py-4 font-semibold text-slate-600">{applicantText(item, "excel_reference")}</td><td className="whitespace-nowrap px-4 py-4 font-black text-slate-950">{formatIDR(item.approved_amount || item.requested_amount)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">{formatDate(item.created_at)}</td></tr>)}
              {!tableLoading && visibleApplications.length === 0 ? <tr><td colSpan={7} className="px-5 py-16 text-center"><p className="font-black text-slate-700">Belum ada data migrasi</p><p className="mt-1 text-xs font-semibold text-slate-400">Tekan tombol Migrasi Data untuk menambahkan pengajuan pertama.</p></td></tr> : null}
              {tableLoading ? <tr><td colSpan={7} className="px-5 py-16 text-center text-sm font-bold text-slate-400"><span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Memuat pengajuan...</span></td></tr> : null}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-emerald-100 px-5 py-3 text-[11px] font-bold text-slate-500">{visibleApplications.length} pengajuan migrasi</footer>
      </section>

      {modalOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="migration-title" className="flex max-h-[calc(100dvh-16px)] w-full max-w-5xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_90px_rgba(2,44,34,0.35)] sm:max-h-[calc(100dvh-40px)]">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-emerald-100 px-4 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Data Baru</p><h2 id="migration-title" className="mt-1 text-xl font-black text-slate-950">Migrasi Pengajuan Kredit</h2></div><button type="button" disabled={Boolean(saving)} onClick={() => setModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 disabled:opacity-50" aria-label="Tutup"><X className="h-5 w-5" /></button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="overflow-hidden rounded-2xl border border-emerald-100">
                <div className="border-b border-emerald-100 p-4"><div className="flex items-center gap-2 font-black text-slate-950"><UserRoundCheck className="h-5 w-5 text-emerald-700" />Pilih Agent</div><label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-emerald-700" /><input value={agentSearch} onChange={(event) => setAgentSearch(event.target.value)} placeholder="Cari agent" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" /></label></div>
                <div className="max-h-72 overflow-y-auto p-2 lg:max-h-[560px]">{agentsLoading ? <p className="py-10 text-center text-xs font-bold text-slate-400">Memuat agent...</p> : null}{!agentsLoading && agents.length === 0 ? <p className="py-10 text-center text-xs font-bold text-slate-400">Agent tidak ditemukan.</p> : null}<div className="grid gap-2">{agents.map((agent) => { const active = selectedID === agent.id; return <button key={agent.id} type="button" onClick={() => chooseAgent(agent)} className={`rounded-xl border p-3 text-left ${active ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-950">{agent.name || "Agent"}</p><p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{agent.email}</p></div>{active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}</div><p className="mt-2 text-[10px] font-bold text-slate-400">{agent.phone || "Nomor HP belum ada"}</p></button>; })}</div></div>
              </div>

              <form onSubmit={(event) => { event.preventDefault(); void submit("pending"); }}>
                {selectedAgent ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-900">{selectedAgent.name} · {selectedAgent.email}</div> : null}
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Nama toko" value={form.storeName} onChange={(value) => update("storeName", value)} placeholder="Nama konter atau usaha" /><Field label="NIK" value={form.nik} onChange={(value) => update("nik", value.replace(/\D/g, "").slice(0, 16))} placeholder="16 digit NIK" inputMode="numeric" /><Field label="Nomor WhatsApp" value={form.whatsapp} onChange={(value) => update("whatsapp", value)} placeholder="08xxxxxxxxxx" inputMode="tel" /><Field label="Referensi Excel" value={form.excelReference} onChange={(value) => update("excelReference", value)} placeholder="Contoh: Sheet1 baris 24" /><Field label="Kontak keluarga" value={form.familyName} onChange={(value) => update("familyName", value)} placeholder="Nama keluarga" /><Field label="Hubungan keluarga" value={form.familyRelation} onChange={(value) => update("familyRelation", value)} placeholder="Orang tua atau saudara" /><Field label="WhatsApp keluarga" value={form.familyWhatsapp} onChange={(value) => update("familyWhatsapp", value)} placeholder="08xxxxxxxxxx" inputMode="tel" /><Field label="Nominal kredit" value={form.amount} onChange={(value) => update("amount", value.replace(/\D/g, ""))} placeholder="500000" inputMode="numeric" hint={`${formatIDR(Number(form.amount))} · Rp500.000–Rp2.000.000`} /><TextArea label="Alamat rumah" value={form.homeAddress} onChange={(value) => update("homeAddress", value)} placeholder="Alamat lengkap agent" /><TextArea label="Alamat toko" value={form.storeAddress} onChange={(value) => update("storeAddress", value)} placeholder="Alamat lengkap konter" /></div>
                <div className="mt-4"><TextArea label="Catatan operator" value={form.note} onChange={(value) => update("note", value)} placeholder="Sumber data dan catatan pemeriksaan" /></div>
                {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{error}</p> : null}
                <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="submit" disabled={Boolean(saving)} className="h-11 rounded-xl border-2 border-emerald-700 bg-white px-4 text-sm font-black text-emerald-800 disabled:opacity-50">{saving === "pending" ? "Menyimpan..." : "Simpan ke Antrean"}</button><button type="button" disabled={Boolean(saving)} onClick={() => void submit("approve")} className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50">{saving === "approve" ? "Memproses..." : "Simpan & Setujui"}</button></div>
              </form>
            </div>
          </div>
        </section>
      </div> : null}
    </main>
  );
}

function Field({ label, value, onChange, placeholder, inputMode, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "numeric" | "tel"; hint?: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-950 outline-none focus:border-emerald-500 focus:bg-white" />{hint ? <span className="mt-1 block text-[10px] font-semibold text-slate-400">{hint}</span> : null}</label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-950 outline-none focus:border-emerald-500 focus:bg-white" /></label>;
}
