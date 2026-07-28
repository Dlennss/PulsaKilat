"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type CreateResp = {
  ok?: boolean;
  error?: string;
  member_id?: number;
};

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("auth_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function makePassword() {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `Kilat${seed}24`;
}

function Field({
  label,
  icon: Icon,
  children,
  helper,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-emerald-600" />
        {label}
      </span>
      {children}
      {helper ? <span className="mt-1.5 block text-[11px] font-semibold leading-4 text-slate-400">{helper}</span> : null}
    </label>
  );
}

export function MasterCreateAgentForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState(makePassword);
  const [commission, setCommission] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const displayName = useMemo(() => name.trim() || "Agent Baru", [name]);
  const canSubmit = email.trim() && name.trim() && password.trim().length >= 8 && !loading;

  async function copyPassword() {
    await navigator.clipboard?.writeText(password).catch(() => undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setMessage({ type: "error", text: "Nama, email, dan password minimal 8 karakter wajib diisi." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          email: email.trim(),
          nama: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          role: "agent",
          retail_agent_commission_rp: Math.max(0, Math.floor(Number(commission || 0))),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as CreateResp;
      if (!response.ok || !body.ok || !body.member_id) {
        throw new Error(body.error || "Akun agent gagal dibuat");
      }

      setMessage({ type: "success", text: `Agent berhasil dibuat. ID Agent: ${body.member_id}` });
      setEmail("");
      setName("");
      setPhone("");
      setStoreName("");
      setCommission("0");
      setPassword(makePassword());
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Akun agent gagal dibuat" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Form Agent</p>
            <h2 className="mt-1 text-2xl font-black tracking-normal text-slate-950">Identitas Agent Baru</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Akun akan dibuat sebagai role agent PulsaKilat.</p>
          </div>
          <span className="grid h-13 w-13 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <UserPlus className="h-6 w-6" />
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nama Agent" icon={UserRound}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Agent PulsaKilat 1"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </Field>
          <Field label="Email Login" icon={Mail}>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="agent@pulsakilat.local"
              type="email"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </Field>
          <Field label="Nomor WA" icon={Phone} helper="Opsional, untuk catatan internal master.">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08xxxxxxxxxx"
              inputMode="tel"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </Field>
          <Field label="Nama Toko" icon={Store} helper="Opsional, nanti agent tetap bisa melengkapi data kredit.">
            <input
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              placeholder="Nama konter/toko"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </Field>
          <Field label="Password Awal" icon={KeyRound} helper="Berikan password ini ke agent, lalu sarankan diganti setelah login.">
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setPassword(makePassword())}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                aria-label="Buat password baru"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={copyPassword}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                aria-label="Salin password"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="Komisi Agent" icon={Sparkles} helper="Isi 0 jika belum memakai komisi retail.">
            <input
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
              placeholder="0"
              inputMode="numeric"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </Field>
        </div>

        {message ? (
          <div className={message.type === "success" ? "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700" : "mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600"}>
            {message.text}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_34px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
          {loading ? "Membuat Agent..." : "Buat Akun Agent"}
        </button>
      </section>

      <aside className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f1fff7_100%)] p-4 shadow-[0_18px_42px_rgba(6,78,59,0.08)] sm:p-5">
        <div className="rounded-[24px] bg-[linear-gradient(135deg,#052e26,#047857)] p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-lime-100">Preview Akun</p>
              <h3 className="mt-1 text-lg font-black">{displayName}</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2 rounded-2xl bg-white/10 p-3 text-xs font-semibold text-white/80">
            <p className="truncate">Email: {email.trim() || "-"}</p>
            <p className="truncate">WA: {phone.trim() || "-"}</p>
            <p className="truncate">Toko: {storeName.trim() || "-"}</p>
            <p>Role: Agent</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {[
            ["Akun langsung aktif", "Agent bisa login memakai email dan password awal."],
            ["Level awal", "Agent baru mulai dari Kilat Start."],
            ["Kredit terpisah", "Pengajuan kredit tetap diputuskan dari panel master."],
          ].map(([title, desc], index) => (
            <div key={title} className="flex gap-3 rounded-2xl border border-emerald-100 bg-white px-3 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-700">{index + 1}</span>
              <div>
                <p className="text-xs font-black text-slate-950">{title}</p>
                <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </form>
  );
}
