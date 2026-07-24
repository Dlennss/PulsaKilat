"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, UserPlus, Users, X } from "lucide-react";

type RetailDownline = {
  id: number;
  email: string;
  nama: string;
  role: string;
  aktif: boolean;
  saldo: number;
  retail_agent_nama?: string | null;
  retail_master_nama?: string | null;
};

type Props = {
  authToken: string;
  role: string;
};

function roleLabel(role: string) {
  switch (String(role || "").toLowerCase()) {
    case "master":
      return "Master";
    case "agent":
      return "Agent";
    case "user":
      return "User";
    default:
      return role || "-";
  }
}

function fmtIDR(v: number) {
  return new Intl.NumberFormat("id-ID").format(Number(v || 0));
}

export function RetailDownlineManager({ authToken, role }: Props) {
  const [items, setItems] = useState<RetailDownline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [email, setEmail] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState("user");

  const canCreate = role === "master" || role === "agent";
  const roleOptions = useMemo(
    () => (role === "master" ? [
      { value: "user", label: "User" },
      { value: "agent", label: "Agent" },
    ] : [{ value: "user", label: "User" }]),
    [role],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/me/retail/downlines", {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || "Gagal memuat jaringan retail.");
        setItems([]);
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!email.trim() || !nama.trim() || password.trim().length < 8) {
      setErr("Email, nama, dan password minimal 8 karakter wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/me/retail/downlines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          nama: nama.trim(),
          password: password.trim(),
          role: targetRole,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || "Gagal membuat akun retail.");
        return;
      }
      setOk(`Akun retail berhasil dibuat dan langsung menjadi downline anda. member_id=${j.member_id}`);
      setEmail("");
      setNama("");
      setPassword("");
      setTargetRole(role === "master" ? "user" : "user");
      setShowCreateModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-md border border-sky-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_52%,#eef7ff_100%)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_58%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-[linear-gradient(135deg,#0ea5e9,#2563eb)] text-white shadow-[0_10px_20px_rgba(37,99,235,0.18)]">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Downline</div>
            <h1 className="text-xl font-bold text-slate-900">Jaringan Retail</h1>
            <p className="text-sm text-slate-600">
              {role === "master" ? "Master dapat menambahkan agent atau user." : role === "agent" ? "Agent dapat menambahkan user." : "Daftar jaringan di atas akun retail."}
            </p>
          </div>
        </div>
      </section>

      {ok ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(90deg,#f8fafc,#eef6ff)] px-4 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Daftar Agent/User</h2>
            <p className="mt-1 text-sm text-slate-500">Downline retail yang terhubung ke akun ini.</p>
          </div>
          {canCreate ? (
            <button
              type="button"
              onClick={() => {
                setErr("");
                setOk("");
                setShowCreateModal(true);
              }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-sky-600 px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(14,116,244,0.18)] transition hover:bg-sky-700"
            >
              <UserPlus className="h-4 w-4" />
              Tambah
            </button>
          ) : null}
        </div>

        <div className="space-y-3 p-4">
          {loading ? <div className="text-sm text-slate-500">Memuat jaringan retail...</div> : null}
          {!loading && items.length === 0 ? <div className="text-sm text-slate-500">Belum ada agent atau user di bawah akun ini.</div> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.nama || item.email}</div>
                  <div className="truncate text-xs text-slate-500">{item.email}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {roleLabel(item.role)}
                    {item.retail_agent_nama ? ` • Agent: ${item.retail_agent_nama}` : ""}
                    {item.retail_master_nama ? ` • Master: ${item.retail_master_nama}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {item.aktif ? "Aktif" : "Nonaktif"}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-sky-700">Rp {fmtIDR(item.saldo)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-[1px]">
          <div className="absolute inset-x-0 bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-md bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,0.24)] md:w-97.5 md:max-w-none">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Tambah Downline</div>
                <h3 className="mt-1 text-xl font-bold text-slate-900">Buat Akun Retail</h3>
                <p className="mt-1 text-sm text-slate-500">Akun baru akan langsung masuk ke jaringan anda.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-5">
              {err ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div> : null}

              <form className="grid gap-3" onSubmit={submit}>
                {role === "master" ? (
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <select
                      className="h-11 rounded-md border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-sky-500"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    >
                      {roleOptions.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-500" placeholder="Nama" value={nama} onChange={(e) => setNama(e.target.value)} />
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-500" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="h-11 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-sky-500" placeholder="Password minimal 8 karakter" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-70" disabled={saving} type="submit">
                  {saving ? "Menyimpan..." : "Tambah Akun"}
                  {!saving ? <ChevronRight className="h-4 w-4" /> : null}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
