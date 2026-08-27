"use client";

import { CheckCircle2, ClipboardPenLine, Loader2, Search, UserRoundCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  return `Rp ${new Intl.NumberFormat("id-ID").format(value || 0)}`;
}

export default function OperatorManualAgentEntryPage() {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedID, setSelectedID] = useState(0);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"pending" | "approve" | "">("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/agent-credit/manual-applications?${params}`, { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; items?: AgentOption[]; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || "Daftar agent tidak dapat dimuat");
      setAgents(Array.isArray(body.items) ? body.items : []);
    } catch (loadError) {
      setAgents([]);
      setError(loadError instanceof Error ? loadError.message : "Daftar agent tidak dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAgents(), 250);
    return () => window.clearTimeout(timer);
  }, [loadAgents]);

  const selectedAgent = useMemo(() => agents.find((agent) => agent.id === selectedID), [agents, selectedID]);
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function chooseAgent(agent: AgentOption) {
    setSelectedID(agent.id);
    setForm((current) => ({ ...current, whatsapp: current.whatsapp || agent.phone }));
    setError("");
    setSuccess("");
  }

  async function submit(action: "pending" | "approve") {
    if (!selectedAgent) {
      setError("Pilih akun agent terlebih dahulu.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 500000 || amount > 2000000) {
      setError("Nominal kredit harus antara Rp500.000 dan Rp2.000.000.");
      return;
    }
    setSaving(action);
    setError("");
    setSuccess("");
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
        if (body.saved) setSuccess(`${body.credit_id || "Data"} sudah tersimpan sebagai Pending.`);
        throw new Error(body.error || "Data agent gagal disimpan");
      }
      setSuccess(`${body.message || "Data agent berhasil disimpan"}. ID kredit ${body.credit_id || "-"}.`);
      setSelectedID(0);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Data agent gagal disimpan");
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="min-h-screen bg-[#eef7f2] p-3 text-[#082f28] sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="overflow-hidden rounded-[24px] bg-[linear-gradient(125deg,#064e3b,#0b8a57_60%,#5bc72f)] px-5 py-6 text-white shadow-[0_18px_45px_rgba(6,95,70,0.18)] sm:px-8 sm:py-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-100">Operator Kredit</p>
          <h1 className="mt-2 text-2xl font-black sm:text-4xl">Input Data Agent</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-50">Masukkan satu data agent dari catatan atau Excel. Setiap penyimpanan menjadi satu riwayat kredit yang dapat dilacak.</p>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-sm">
            <div className="border-b border-emerald-100 p-4 sm:p-5">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRoundCheck className="h-5 w-5" /></span><div><h2 className="font-black">1. Pilih Agent</h2><p className="text-xs font-semibold text-slate-500">Hanya akun agent aktif.</p></div></div>
              <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:bg-white">
                <Search className="h-4 w-4 text-emerald-700" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, atau nomor HP" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" />
              </label>
            </div>
            <div className="max-h-[520px] overflow-y-auto p-3">
              {loading ? <div className="flex items-center justify-center gap-2 py-14 text-sm font-bold text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Memuat agent...</div> : null}
              {!loading && agents.length === 0 ? <p className="py-14 text-center text-sm font-bold text-slate-400">Agent tidak ditemukan.</p> : null}
              <div className="grid gap-2">
                {agents.map((agent) => {
                  const active = agent.id === selectedID;
                  return <button key={agent.id} type="button" onClick={() => chooseAgent(agent)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-950">{agent.name || "Agent"}</p><p className="mt-1 truncate text-xs font-semibold text-slate-500">{agent.email}</p></div>{active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <span className="text-[10px] font-black text-slate-400">#{agent.id}</span>}</div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-500"><span>{agent.phone || "Nomor HP belum ada"}</span><span>{agent.marketing_name ? `Marketing: ${agent.marketing_name}` : "Belum terhubung marketing"}</span></div>
                  </button>;
                })}
              </div>
            </div>
          </section>

          <form className="rounded-[20px] border border-emerald-100 bg-white p-4 shadow-sm sm:p-6" onSubmit={(event) => { event.preventDefault(); void submit("pending"); }}>
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardPenLine className="h-5 w-5" /></span><div><h2 className="font-black">2. Lengkapi Data</h2><p className="text-xs font-semibold text-slate-500">Salin data satu per satu dari sumber Anda.</p></div></div>
            {selectedAgent ? <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Agent Dipilih</p><p className="mt-1 font-black text-slate-950">{selectedAgent.name} <span className="font-semibold text-slate-500">({selectedAgent.email})</span></p></div> : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nama toko" value={form.storeName} onChange={(value) => update("storeName", value)} placeholder="Nama konter atau usaha" />
              <Field label="NIK" value={form.nik} onChange={(value) => update("nik", value.replace(/\D/g, "").slice(0, 16))} placeholder="16 digit NIK" inputMode="numeric" />
              <Field label="Nomor WhatsApp" value={form.whatsapp} onChange={(value) => update("whatsapp", value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
              <Field label="Referensi Excel" value={form.excelReference} onChange={(value) => update("excelReference", value)} placeholder="Contoh: Sheet1 baris 24" />
              <Field label="Kontak keluarga" value={form.familyName} onChange={(value) => update("familyName", value)} placeholder="Nama keluarga" />
              <Field label="Hubungan keluarga" value={form.familyRelation} onChange={(value) => update("familyRelation", value)} placeholder="Orang tua atau saudara" />
              <Field label="WhatsApp keluarga" value={form.familyWhatsapp} onChange={(value) => update("familyWhatsapp", value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
              <Field label="Nominal kredit" value={form.amount} onChange={(value) => update("amount", value.replace(/\D/g, ""))} placeholder="500000" inputMode="numeric" hint={`${formatIDR(Number(form.amount))} · min. Rp500.000 · maks. Rp2.000.000`} />
              <TextArea label="Alamat rumah" value={form.homeAddress} onChange={(value) => update("homeAddress", value)} placeholder="Alamat lengkap agent" />
              <TextArea label="Alamat toko" value={form.storeAddress} onChange={(value) => update("storeAddress", value)} placeholder="Alamat lengkap konter" />
            </div>
            <div className="mt-4"><TextArea label="Catatan operator" value={form.note} onChange={(value) => update("note", value)} placeholder="Sumber data dan catatan pemeriksaan" /></div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{error}</p> : null}
            {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800">{success}</p> : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="submit" disabled={Boolean(saving)} className="h-12 rounded-xl border-2 border-emerald-700 bg-white px-4 text-sm font-black text-emerald-800 disabled:opacity-50">{saving === "pending" ? "Menyimpan..." : "Simpan ke Antrean"}</button>
              <button type="button" disabled={Boolean(saving)} onClick={() => void submit("approve")} className="h-12 rounded-xl bg-[linear-gradient(100deg,#047857,#56c81c)] px-4 text-sm font-black text-white shadow-lg disabled:opacity-50">{saving === "approve" ? "Memproses..." : "Simpan & Setujui"}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, inputMode, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "numeric" | "tel"; hint?: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white" />{hint ? <span className="mt-1 block text-[10px] font-semibold text-slate-400">{hint}</span> : null}</label>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white" /></label>;
}
