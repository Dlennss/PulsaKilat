"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Copy,
  Edit3,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  UserRound,
  X,
} from "lucide-react";

type AgentRow = {
  id: number;
  email: string;
  nama: string;
  phone?: string;
  role: string;
  aktif: boolean;
  saldo?: number;
  retail_agent_commission_rp?: number;
  retail_master_commission_rp?: number;
  fee_member_rp?: number;
  h2h_agent_commission_rp?: number;
  h2h_master_commission_rp?: number;
};

type MembersResp = {
  ok?: boolean;
  rows?: AgentRow[];
  items?: AgentRow[];
  total_count?: number;
  error?: string;
};

type ApiResp = {
  ok?: boolean;
  error?: string;
};

type AgentFormState = {
  id?: number;
  name: string;
  email: string;
  phone: string;
  password: string;
  commission: string;
  aktif: boolean;
};

const emptyForm = (): AgentFormState => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  commission: "0",
  aktif: true,
});

const inputClassName =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("auth_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function makePassword() {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Kilat${seed}24`;
}

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

export function MasterAgentAccountsPanel() {
  const [items, setItems] = useState<AgentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<AgentFormState>(() => emptyForm());

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.nama, item.email, item.phone, String(item.id)].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [items, query]);

  const activeCount = items.filter((item) => item.aktif).length;
  const inactiveCount = items.length - activeCount;
  const isEditing = Boolean(form.id);

  async function loadAgents() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ scope: "retail", role: "agent", limit: "200", offset: "0" });
      const response = await fetch(`/api/admin/members?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as MembersResp;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Gagal mengambil data agent");
      }
      setItems(Array.isArray(body.items) ? body.items : Array.isArray(body.rows) ? body.rows : []);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Gagal mengambil data agent" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgents();
  }, []);

  function resetForm() {
    setForm(emptyForm());
    setMessage(null);
  }

  function editAgent(item: AgentRow) {
    setMessage(null);
    setForm({
      id: item.id,
      name: item.nama || "",
      email: item.email || "",
      phone: item.phone || "",
      password: "",
      commission: String(item.retail_agent_commission_rp ?? 0),
      aktif: Boolean(item.aktif),
    });
  }

  async function copyPassword() {
    if (!form.password) return;
    await navigator.clipboard?.writeText(form.password).catch(() => undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setMessage({ type: "error", text: "Nama dan email agent wajib diisi." });
      return;
    }
    if (!isEditing) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/members/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          email: form.email.trim(),
          nama: form.name.trim(),
          phone: form.phone.trim(),
          role: "agent",
          aktif: form.aktif,
          fee_member_rp: 0,
          retail_agent_commission_rp: Math.max(0, Math.floor(Number(form.commission || 0))),
          retail_master_commission_rp: 0,
          h2h_agent_commission_rp: 0,
          h2h_master_commission_rp: 0,
          new_password: form.password.trim() || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiResp;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Data agent gagal disimpan");
      }
      setMessage({ type: "success", text: "Agent berhasil diperbarui." });
      setForm(emptyForm());
      await loadAgents();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Data agent gagal disimpan" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAgent(item: AgentRow) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/members/${item.id}`, {
        method: item.aktif ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: item.aktif
          ? undefined
          : JSON.stringify({
              email: item.email,
              nama: item.nama,
              phone: item.phone || "",
              role: "agent",
              aktif: true,
              fee_member_rp: Number(item.fee_member_rp || 0),
              retail_agent_commission_rp: Number(item.retail_agent_commission_rp || 0),
              retail_master_commission_rp: Number(item.retail_master_commission_rp || 0),
              h2h_agent_commission_rp: Number(item.h2h_agent_commission_rp || 0),
              h2h_master_commission_rp: Number(item.h2h_master_commission_rp || 0),
            }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiResp;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Status agent gagal diubah");
      }
      setMessage({ type: "success", text: item.aktif ? "Agent berhasil dihapus dari akun aktif." : "Agent diaktifkan kembali." });
      await loadAgents();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Status agent gagal diubah" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={isEditing ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" : "block"}>
      <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Database Agent</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Akun Agent</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Kelola agent retail PulsaKilat dari satu panel.</p>
          </div>
          <label className="flex h-12 min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100 lg:w-72">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Cari agent" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Total", items.length, "bg-slate-50 text-slate-700"],
            ["Aktif", activeCount, "bg-emerald-50 text-emerald-700"],
            ["Nonaktif", inactiveCount, "bg-rose-50 text-rose-600"],
          ].map(([label, value, className]) => (
            <div key={label} className={`rounded-2xl px-3 py-3 ${className}`}>
              <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
              <p className="mt-1 text-xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[22px] bg-slate-100" />)
          ) : filteredItems.length ? (
            filteredItems.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-emerald-200 hover:bg-emerald-50/30">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_170px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-950 text-sm font-black text-lime-300">
                      {(item.nama || item.email || "AG").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-950">{item.nama || "Agent"}</h3>
                        <span className={item.aktif ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700" : "rounded-full bg-rose-100 px-2.5 py-1 text-[9px] font-black uppercase text-rose-600"}>
                          {item.aktif ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email}</p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">HP {item.phone || "-"}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[9px] font-black uppercase text-slate-400">Saldo</p>
                    <p className="mt-1 text-sm font-black text-slate-950">{formatIDR(Number(item.saldo || 0))}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => editAgent(item)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button type="button" onClick={() => toggleAgent(item)} disabled={saving} className={item.aktif ? "h-10 rounded-xl bg-rose-50 text-[11px] font-black text-rose-600 ring-1 ring-rose-100" : "h-10 rounded-xl bg-emerald-950 text-[11px] font-black text-white"}>
                      {item.aktif ? "Hapus" : "Aktifkan"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="grid min-h-56 place-items-center rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/40 px-5 text-center">
              <div>
                <UserRound className="mx-auto h-10 w-10 text-emerald-700" />
                <h3 className="mt-3 text-base font-black text-slate-950">Belum ada agent</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Agent yang dibuat akan tampil di sini.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {isEditing ? (
      <form onSubmit={submit} className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff8_100%)] p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Edit Agent</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{form.name || "Edit Agent"}</h2>
          </div>
          <button type="button" onClick={resetForm} className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <InputShell label="Nama Agent" icon={<UserRound className="h-4 w-4" />}>
            <input value={form.name} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} placeholder="Nama agent" className={inputClassName} />
          </InputShell>
          <InputShell label="Email Login" icon={<Mail className="h-4 w-4" />}>
            <input value={form.email} onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))} placeholder="agent@pulsakilat.local" type="email" className={inputClassName} />
          </InputShell>
          <InputShell label="Nomor HP" icon={<Phone className="h-4 w-4" />}>
            <input value={form.phone} onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))} placeholder="08xxxxxxxxxx" inputMode="tel" className={inputClassName} />
          </InputShell>
          <InputShell label="Password Baru" icon={<KeyRound className="h-4 w-4" />}>
            <div className="flex gap-2">
              <input value={form.password} onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))} placeholder="Kosongkan jika tidak diubah" className={`${inputClassName} min-w-0 flex-1`} />
              <button type="button" onClick={() => setForm((state) => ({ ...state, password: makePassword() }))} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button type="button" onClick={copyPassword} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </InputShell>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span>
              <span className="block text-xs font-black text-slate-950">Status akun</span>
              <span className="text-[11px] font-semibold text-slate-400">Aktifkan atau nonaktifkan agent</span>
            </span>
            <input type="checkbox" checked={form.aktif} onChange={(event) => setForm((state) => ({ ...state, aktif: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />
          </label>
        </div>

        {message ? (
          <div className={message.type === "success" ? "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700" : "mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-600"}>
            {message.text}
          </div>
        ) : null}

        <button type="submit" disabled={saving} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_16px_30px_rgba(5,150,105,0.20)] disabled:opacity-50">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
          {saving ? "Menyimpan..." : "Simpan Agent"}
        </button>
      </form>
      ) : null}
    </div>
  );
}

function InputShell({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        <span className="text-emerald-600">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}
