"use client";

import { Camera, CheckCircle2, FileImage, Loader2, Search, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type AgentOption = {
  id: number;
  name: string;
  email: string;
  phone: string;
  marketing_name: string;
};

type StoredImage = {
  name: string;
  type: string;
  size: number;
  data_url: string;
};

type DocumentKey = "ktp" | "store" | "selfie_ktp" | "selfie_marketing";

const documentFields: Array<{ key: DocumentKey; label: string; description: string }> = [
  { key: "ktp", label: "Foto KTP", description: "KTP agent terlihat jelas" },
  { key: "store", label: "Foto Toko", description: "Tampak depan toko atau usaha" },
  { key: "selfie_ktp", label: "Dokumen Formulir", description: "Formulir data agent terbaca" },
  { key: "selfie_marketing", label: "Selfie Bersama Marketing", description: "Agent dan marketing terlihat jelas" },
];

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function statusLabel(status: string) {
  if (status === "approved") return "Disetujui";
  if (status === "rejected" || status.endsWith("_rejected")) return "Ditolak";
  return "Pending";
}

function recordText(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function storedImage(record: Record<string, unknown> | undefined, key: DocumentKey): StoredImage | undefined {
  const value = record?.[key];
  if (!value || typeof value !== "object") return undefined;
  const image = value as Record<string, unknown>;
  const dataURL = typeof image.data_url === "string" ? image.data_url : "";
  if (!dataURL.startsWith("data:image/")) return undefined;
  return {
    name: typeof image.name === "string" ? image.name : `${key}.jpg`,
    type: typeof image.type === "string" ? image.type : "image/jpeg",
    size: typeof image.size === "number" ? image.size : Math.round((dataURL.length * 3) / 4),
    data_url: dataURL,
  };
}

async function prepareImage(file: File): Promise<StoredImage> {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Ukuran foto maksimal 8 MB.");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Foto tidak dapat diproses."));
    element.src = source;
  });
  const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
  const dataURL = canvas.toDataURL("image/jpeg", 0.82);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", size: Math.round((dataURL.length * 3) / 4), data_url: dataURL };
}

export default function OperatorManualAgentEntryPage() {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [applications, setApplications] = useState<AgentCreditApplication[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(null);
  const [agentName, setAgentName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditAmount, setCreditAmount] = useState("500000");
  const [documents, setDocuments] = useState<Partial<Record<DocumentKey, StoredImage>>>({});
  const [preparing, setPreparing] = useState<DocumentKey | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agentResponse, applicationResponse] = await Promise.all([
        fetch("/api/agent-credit/manual-applications?limit=200", { cache: "no-store" }),
        fetch("/api/agent-credit/applications?limit=200", { cache: "no-store" }),
      ]);
      const agentBody = (await agentResponse.json().catch(() => ({}))) as { ok?: boolean; items?: AgentOption[]; error?: string };
      const applicationBody = (await applicationResponse.json().catch(() => ({}))) as { ok?: boolean; items?: AgentCreditApplication[]; error?: string };
      if (!agentResponse.ok || !agentBody.ok) throw new Error(agentBody.error || "Akun agent tidak dapat dimuat");
      if (!applicationResponse.ok || !applicationBody.ok) throw new Error(applicationBody.error || "Status migrasi tidak dapat dimuat");
      setAgents(Array.isArray(agentBody.items) ? agentBody.items : []);
      setApplications(Array.isArray(applicationBody.items) ? applicationBody.items : []);
    } catch (loadError) {
      setNotice(loadError instanceof Error ? loadError.message : "Data agent tidak dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    if (!selectedAgent) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selectedAgent]);

  const migrationByMember = useMemo(() => {
    const map = new Map<number, AgentCreditApplication>();
    for (const item of applications) if (!map.has(item.member_id)) map.set(item.member_id, item);
    return map;
  }, [applications]);

  const visibleAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) => [agent.name, agent.email, agent.phone, agent.marketing_name].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [agents, search]);

  function openMigration(agent: AgentOption, migration?: AgentCreditApplication) {
    setSelectedAgent(agent);
    setAgentName(recordText(migration?.applicant_data, "agent_name") || migration?.member_name || agent.name);
    setPhone(recordText(migration?.applicant_data, "whatsapp") || migration?.member_phone || agent.phone);
    setCreditAmount(String(migration?.approved_amount || migration?.requested_amount || 500000));
    setDocuments(migration ? Object.fromEntries(documentFields.flatMap((field) => {
      const image = storedImage(migration.document_data, field.key);
      return image ? [[field.key, image]] : [];
    })) : {});
    setError("");
  }

  async function selectImage(key: DocumentKey, file?: File) {
    if (!file) return;
    setPreparing(key);
    setError("");
    try {
      const image = await prepareImage(file);
      setDocuments((current) => ({ ...current, [key]: image }));
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : "Foto tidak dapat diproses");
    } finally {
      setPreparing("");
    }
  }

  async function submit() {
    if (!selectedAgent) return;
    const existingMigration = migrationByMember.get(selectedAgent.id);
    if (agentName.trim().length < 3) return setError("Nama agent wajib diisi.");
    if (!/^08\d{8,12}$/.test(phone.replace(/\D/g, ""))) return setError("Nomor telepon agent tidak valid.");
    const requestedAmount = Number(creditAmount);
    if (!Number.isInteger(requestedAmount) || requestedAmount < 500000 || requestedAmount > 2000000) {
      return setError("Nominal kredit harus antara Rp500.000 dan Rp2.000.000.");
    }
    const missing = documentFields.find((field) => !documents[field.key]);
    if (missing) return setError(`${missing.label} wajib diunggah.`);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/manual-applications", {
        method: existingMigration ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: existingMigration?.id,
          member_id: selectedAgent.id,
          requested_amount: requestedAmount,
          action: "approve",
          applicant_data: {
            agent_name: agentName.trim(),
            email: selectedAgent.email,
            whatsapp: phone.replace(/\D/g, ""),
          },
          document_data: documents,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; credit_id?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || "Migrasi data gagal disimpan");
      setSelectedAgent(null);
      setNotice(existingMigration ? `Migrasi KRD-${String(existingMigration.id).padStart(8, "0")} berhasil diperbarui.` : `Migrasi ${body.credit_id || "data agent"} berhasil disetujui dan kredit agent telah diaktifkan.`);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Migrasi data gagal disimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef7f2] p-3 text-[#082f28] sm:p-6 lg:p-8">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-[20px] border border-emerald-100 bg-white shadow-[0_16px_40px_rgba(6,78,59,0.08)]">
        <header className="border-b border-emerald-100 p-4 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Operator Kredit</p><h1 className="mt-1 text-2xl font-black text-slate-950">Migrasi Data Agent</h1><p className="mt-1 text-xs font-semibold text-slate-500">Pilih akun dan lengkapi dokumen lama. Data migrasi baru langsung disetujui sebagai kredit aktif.</p></header>
        <div className="p-4 sm:p-6">
          {notice ? <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Tutup"><X className="h-4 w-4" /></button></div> : null}
          <label className="flex h-11 max-w-lg items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-500 focus-within:bg-white"><Search className="h-4 w-4 text-emerald-700" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, nomor HP, atau marketing" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" /></label>
        </div>
        <div className="overflow-x-auto border-t border-emerald-100">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-emerald-50 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-900"><tr><th className="px-5 py-3">Akun Agent</th><th className="px-4 py-3">Nomor Telepon</th><th className="px-4 py-3">Marketing</th><th className="px-4 py-3">Status Migrasi</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
            <tbody>
              {visibleAgents.map((agent) => { const migration = migrationByMember.get(agent.id); return <tr key={agent.id} className="border-t border-slate-100 hover:bg-emerald-50/40"><td className="px-5 py-4"><p className="font-black text-slate-950">{agent.name || "Agent"}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{agent.email} · ID #{agent.id}</p></td><td className="px-4 py-4 font-semibold text-slate-600">{recordText(migration?.applicant_data, "whatsapp") || migration?.member_phone || agent.phone || "-"}</td><td className="px-4 py-4 font-semibold text-slate-600">{agent.marketing_name || "Belum terhubung"}</td><td className="px-4 py-4">{migration ? <div><span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-800">Sudah dimigrasikan</span><p className="mt-1 text-[10px] font-semibold text-slate-500">{statusLabel(migration.status)} · KRD-{String(migration.id).padStart(8, "0")} · {formatDate(migration.created_at)}</p></div> : <span className="text-xs font-bold text-slate-400">Belum dimigrasikan</span>}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => openMigration(agent, migration)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white hover:bg-emerald-800"><Upload className="h-4 w-4" />{migration ? "Edit Migrasi" : "Migrasi Data"}</button></td></tr>; })}
              {!loading && visibleAgents.length === 0 ? <tr><td colSpan={5} className="px-5 py-16 text-center font-bold text-slate-400">Akun agent tidak ditemukan.</td></tr> : null}
              {loading ? <tr><td colSpan={5} className="px-5 py-16 text-center"><span className="inline-flex items-center gap-2 text-sm font-bold text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Memuat akun agent...</span></td></tr> : null}
            </tbody>
          </table>
        </div>
        <footer className="border-t border-emerald-100 px-5 py-3 text-[11px] font-bold text-slate-500">{visibleAgents.length} akun agent</footer>
      </section>

      {selectedAgent ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelectedAgent(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="migration-title" className="flex max-h-[calc(100dvh-16px)] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_90px_rgba(2,44,34,0.35)] sm:max-h-[calc(100dvh-40px)]">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-emerald-100 px-4 py-4 sm:px-6"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">{migrationByMember.has(selectedAgent.id) ? "Edit Migrasi" : "Migrasi Dokumen"}</p><h2 id="migration-title" className="mt-1 text-xl font-black text-slate-950">{selectedAgent.name}</h2></div><button type="button" disabled={saving} onClick={() => setSelectedAgent(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 disabled:opacity-50" aria-label="Tutup"><X className="h-5 w-5" /></button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Agent" value={agentName} onChange={setAgentName} placeholder="Nama lengkap agent" />
              <Field label="Nomor Telepon" value={phone} onChange={(value) => setPhone(value.replace(/\D/g, "").slice(0, 14))} placeholder="08xxxxxxxxxx" inputMode="tel" />
              <Field
                label="Nominal Kredit"
                value={creditAmount}
                onChange={(value) => setCreditAmount(value.replace(/\D/g, "").slice(0, 7))}
                placeholder="500000"
                inputMode="numeric"
                hint={`${creditAmount ? `Rp ${new Intl.NumberFormat("id-ID").format(Number(creditAmount))}` : "Rp 0"} · minimal Rp500.000, maksimal Rp2.000.000`}
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{documentFields.map((field) => { const image = documents[field.key]; return <label key={field.key} className={`group relative overflow-hidden rounded-2xl border ${image ? "border-emerald-400 bg-emerald-50" : "border-dashed border-emerald-300 bg-white"}`}><input type="file" accept="image/*" className="sr-only" disabled={Boolean(preparing) || saving} onChange={(event) => { void selectImage(field.key, event.target.files?.[0]); event.currentTarget.value = ""; }} />{image ? <div className="relative aspect-[16/9] bg-slate-100"><img src={image.data_url} alt={field.label} className="h-full w-full object-contain" /><span className="absolute right-2 top-2 rounded-full bg-emerald-700 px-2 py-1 text-[9px] font-black text-white">Tersimpan</span></div> : <div className="grid aspect-[16/9] place-items-center bg-emerald-50/50"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">{preparing === field.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}</span></div>}<div className="flex items-center gap-3 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileImage className="h-4 w-4" /></span><div><p className="text-xs font-black text-slate-950">{field.label}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{image ? "Ketuk untuk mengganti foto" : field.description}</p></div></div></label>; })}</div>
            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{error}</p> : null}
          </div>
          <footer className="shrink-0 border-t border-emerald-100 bg-white p-4 sm:px-6"><button type="button" disabled={saving || Boolean(preparing)} onClick={() => void submit()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}{saving ? "Mengaktifkan Kredit..." : migrationByMember.has(selectedAgent.id) ? "Simpan Perubahan" : "Simpan & Aktifkan Kredit"}</button></footer>
        </section>
      </div> : null}
    </main>
  );
}

function Field({ label, value, onChange, placeholder, inputMode, hint }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; inputMode?: "tel" | "numeric"; hint?: string }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-500 focus:bg-white" />{hint ? <span className="mt-1.5 block text-[10px] font-semibold text-slate-500">{hint}</span> : null}</label>;
}
