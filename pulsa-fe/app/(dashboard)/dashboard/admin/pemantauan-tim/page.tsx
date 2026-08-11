"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, CheckCircle2, Clock3, RefreshCcw, ShieldCheck, UserCog, Users, XCircle } from "lucide-react";

type TeamRole = "" | "marketing" | "operator_credit";

type TeamMember = {
  id: number;
  nama?: string;
  email?: string;
  phone?: string;
  role: string;
  aktif: boolean;
};

type TeamActivity = {
  id: number;
  actor_id: number;
  actor_name?: string;
  actor_email?: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string;
  created_at: string;
};

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("auth_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function roleLabel(role: string) {
  if (role === "marketing") return "Marketing";
  if (role === "operator_credit" || role === "analis") return "Operator Kredit";
  if (role === "super_admin") return "Super Admin";
  return role || "Sistem";
}

function actionLabel(action: string) {
  switch (action) {
    case "agent_credit_marketing_review":
      return "Dokumen diteruskan ke operator";
    case "agent_credit_final_decision":
      return "Keputusan kredit dibuat";
    case "agent_credit_operational_status_changed":
      return "Status kredit agent diubah";
    default:
      return action.replaceAll("_", " ");
  }
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function TeamMonitoringContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "marketing" || searchParams.get("role") === "operator_credit"
    ? searchParams.get("role") as TeamRole
    : "";
  const [role, setRole] = useState<TeamRole>(initialRole);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = authHeader();
      const [marketingResponse, operatorResponse, activityResponse] = await Promise.all([
        fetch("/api/admin/members?scope=retail&role=marketing&limit=200", { headers, cache: "no-store" }),
        fetch("/api/admin/members?scope=retail&role=analis&limit=200", { headers, cache: "no-store" }),
        fetch(`/api/admin/agent-credit/team-activity?limit=100${role ? `&role=${role}` : ""}`, { headers, cache: "no-store" }),
      ]);
      const [marketingData, operatorData, activityData] = await Promise.all([
        marketingResponse.json().catch(() => ({})),
        operatorResponse.json().catch(() => ({})),
        activityResponse.json().catch(() => ({})),
      ]);
      if (!marketingResponse.ok || !operatorResponse.ok || !activityResponse.ok) {
        throw new Error(activityData.error || marketingData.error || operatorData.error || "Data pemantauan belum dapat dimuat");
      }
      const marketingRows = Array.isArray(marketingData.items) ? marketingData.items : marketingData.rows || [];
      const operatorRows = Array.isArray(operatorData.items) ? operatorData.items : operatorData.rows || [];
      setMembers([...marketingRows, ...operatorRows]);
      setActivities(Array.isArray(activityData.items) ? activityData.items : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data pemantauan belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleMembers = useMemo(() => members.filter((item) => {
    if (!role) return true;
    return role === "marketing" ? item.role === "marketing" : item.role === "analis";
  }), [members, role]);

  const activeCount = visibleMembers.filter((item) => item.aktif).length;
  const marketingCount = members.filter((item) => item.role === "marketing").length;
  const operatorCount = members.filter((item) => item.role === "analis").length;

  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#053a2f_0%,#087a50_58%,#50cf3e_100%)] px-5 py-7 text-white shadow-[0_22px_50px_rgba(6,78,59,0.16)] sm:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-100">Pemantauan Tim</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Aktivitas Marketing & Operator</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-emerald-50/90">
                Pantau status akun dan pekerjaan kredit dari Panel Admin tanpa berpindah ke panel operasional.
              </p>
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/12 px-4 text-sm font-black text-white transition hover:bg-white/20">
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Marketing", value: marketingCount, icon: Users },
            { label: "Operator Kredit", value: operatorCount, icon: ShieldCheck },
            { label: "Akun Aktif", value: activeCount, icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <div><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black">{loading ? "..." : item.value}</p></div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
              </div>
            );
          })}
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="Filter tim">
          {([{"value":"","label":"Semua"},{"value":"marketing","label":"Marketing"},{"value":"operator_credit","label":"Operator Kredit"}] as Array<{ value: TeamRole; label: string }>).map((item) => (
            <button key={item.value || "all"} type="button" onClick={() => setRole(item.value)} className={`min-h-10 rounded-full border px-4 text-sm font-black transition ${role === item.value ? "border-[#056143] bg-[#056143] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}>
              {item.label}
            </button>
          ))}
        </nav>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div><h2 className="text-lg font-black">Status Akun Tim</h2><p className="mt-1 text-xs font-semibold text-slate-500">{visibleMembers.length} akun ditemukan</p></div>
            <Link
              href="/dashboard/admin/master/members"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-black !text-[#064e3b] shadow-sm transition hover:border-emerald-500 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              <UserCog className="h-4 w-4" aria-hidden="true" />
              <span>Kelola Akun</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-[#edf9f3] text-[11px] font-black uppercase text-emerald-800"><tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Kontak</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {visibleMembers.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-black">{item.nama || "Belum diisi"}</p><p className="mt-1 text-xs text-slate-500">{item.email}</p></td><td className="px-5 py-4 font-bold">{roleLabel(item.role)}</td><td className="px-5 py-4 text-slate-600">{item.phone || "-"}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{item.aktif ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{item.aktif ? "Aktif" : "Nonaktif"}</span></td></tr>)}
                {!loading && visibleMembers.length === 0 ? <tr><td colSpan={4} className="px-5 py-10 text-center font-semibold text-slate-500">Belum ada akun pada kategori ini.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5"><h2 className="flex items-center gap-2 text-lg font-black"><Activity className="h-5 w-5 text-emerald-700" /> Aktivitas Kredit Terbaru</h2></div>
          <div className="divide-y divide-slate-100">
            {activities.map((item) => (
              <article key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.actor_name || item.actor_email || roleLabel(item.actor_role)}</p><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">{roleLabel(item.actor_role)}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{actionLabel(item.action)}</p>{item.reason ? <p className="mt-1 text-xs font-semibold text-slate-500">Catatan: {item.reason}</p> : null}</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 sm:justify-end"><Clock3 className="h-3.5 w-3.5" /> {dateTime(item.created_at)}</div>
              </article>
            ))}
            {!loading && activities.length === 0 ? <div className="px-5 py-10 text-center font-semibold text-slate-500">Belum ada aktivitas yang tercatat.</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminTeamMonitoringPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] animate-pulse rounded-[24px] bg-emerald-50" />}>
      <TeamMonitoringContent />
    </Suspense>
  );
}
