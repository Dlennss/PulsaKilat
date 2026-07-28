"use client";

import { ChevronDown, FileSignature, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentCreditApplication } from "@/lib/api.auth";
import { MasterAgentCreditDecisionControls } from "@/components/dashboard/MasterAgentCreditDecisionControls";
import { MasterAgentCreditDocumentButton } from "@/components/dashboard/MasterAgentCreditDocumentButton";

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function getApplicantText(item: AgentCreditApplication, key: string, fallback = "-") {
  const value = item.applicant_data?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return "Baru dikirim";
    case "marketing_review":
      return "Dicek master";
    case "analysis_review":
      return "Menunggu master";
    case "master_review":
      return "Menunggu master";
    case "approved":
      return "Disetujui";
    case "analysis_rejected":
      return "Ditolak";
    case "master_rejected":
      return "Ditolak master";
    case "rejected":
      return "Ditolak";
    default:
      return status || "-";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
    case "analysis_rejected":
    case "master_rejected":
      return "bg-rose-100 text-rose-600";
    case "marketing_review":
    case "analysis_review":
    case "master_review":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-lime-100 text-emerald-700";
  }
}

function hasStoredImage(item: AgentCreditApplication, key: string) {
  const value = item.document_data?.[key];
  if (!value || typeof value !== "object") return false;
  const image = value as { data_url?: unknown };
  return typeof image.data_url === "string" && image.data_url.startsWith("data:image/");
}

function getStoredImageSrc(item: AgentCreditApplication, key: string) {
  const value = item.document_data?.[key];
  if (!value || typeof value !== "object") return "";
  const image = value as { data_url?: unknown };
  return typeof image.data_url === "string" && image.data_url.startsWith("data:image/") ? image.data_url : "";
}

function getSignatureSrc(item: AgentCreditApplication) {
  return typeof item.agent_signature_data === "string" && item.agent_signature_data.startsWith("data:image/")
    ? item.agent_signature_data
    : "";
}

function searchableText(item: AgentCreditApplication) {
  const fields = [
    item.id,
    item.member_id,
    item.member_name,
    item.member_email,
    item.member_phone,
    item.status,
    getStatusLabel(item.status),
    item.requested_amount,
    item.approved_amount,
    getApplicantText(item, "agent_name", ""),
    getApplicantText(item, "store_name", ""),
    getApplicantText(item, "whatsapp", ""),
    getApplicantText(item, "nik", ""),
    getApplicantText(item, "email", ""),
    getApplicantText(item, "home_address", ""),
    getApplicantText(item, "store_address", ""),
  ];
  return fields.join(" ").toLowerCase();
}

export function MasterAgentCreditApplicationList({
  applications,
  mode = "master",
  showActions = true,
}: {
  applications: AgentCreditApplication[];
  mode?: "marketing" | "master";
  showActions?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const trimmedQuery = query.trim().toLowerCase();
  const filteredApplications = useMemo(() => {
    if (!trimmedQuery) return applications;
    return applications.filter((item) => searchableText(item).includes(trimmedQuery));
  }, [applications, trimmedQuery]);

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">Meja Review</p>
          <h2 className="mt-1 text-xl font-black">Pengajuan Kredit Terbaru</h2>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Cari agent"
          />
        </label>
      </div>

      <div className="mt-5 space-y-2">
        {filteredApplications.length ? (
          filteredApplications.map((item) => {
            const agentName = getApplicantText(item, "agent_name", item.member_name || "Agent");
            const storeName = getApplicantText(item, "store_name", "Toko belum diisi");
            const wa = getApplicantText(item, "whatsapp", item.member_phone || "-");
            const nik = getApplicantText(item, "nik");
            const docs = [
              { label: "Foto KTP", src: getStoredImageSrc(item, "ktp") },
              { label: "Foto Toko", src: getStoredImageSrc(item, "store") },
              { label: "Selfie KTP", src: getStoredImageSrc(item, "selfie") },
            ];
            const signatureSrc = getSignatureSrc(item);
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-emerald-300 hover:shadow-[0_14px_28px_rgba(5,122,69,0.08)]">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_130px_120px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-950 text-xs font-black text-lime-300">
                      {agentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="max-w-full truncate text-sm font-black text-slate-950">{agentName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${getStatusClass(item.status)}`}>{getStatusLabel(item.status)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{storeName}</p>
                      <p className="mt-1 truncate text-[11px] font-bold text-slate-400">WA {wa} · NIK {nik}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-left lg:text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Nominal</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">{formatIDR(item.requested_amount)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId((current) => (current === item.id ? null : item.id))}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Detail
                    <ChevronDown className={`h-4 w-4 transition ${openId === item.id ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {showActions ? (
                  <div className="mt-3">
                    <MasterAgentCreditDecisionControls
                      applicationId={item.id}
                      requestedAmount={item.requested_amount}
                      approvedAmount={item.approved_amount}
                      marketingNote={item.marketing_note}
                      analystNote={item.analyst_note}
                      analystRecommendation={item.analyst_recommendation}
                      analystRecommendedAmount={item.analyst_recommended_amount}
                      status={item.status}
                      mode={mode}
                    />
                  </div>
                ) : null}

                {openId === item.id ? (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                    {item.analyst_recommendation || item.analyst_note ? (
                      <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-[11px] font-semibold text-sky-700">
                        <p className="font-black text-slate-950">Catatan Review</p>
                        <p className="mt-1">
                          {item.analyst_recommendation === "approved" ? "Layak" : item.analyst_recommendation === "rejected" ? "Tidak layak" : "Belum ada rekomendasi"}
                          {item.analyst_recommended_amount ? ` - ${formatIDR(item.analyst_recommended_amount)}` : ""}
                        </p>
                        {item.analyst_note ? <p className="mt-1 leading-5 text-slate-500">{item.analyst_note}</p> : null}
                      </div>
                    ) : null}
                    <div className="grid gap-3 text-[11px] font-semibold text-slate-500 lg:grid-cols-2">
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Email</p>
                        <p className="mt-1 break-all leading-5">{getApplicantText(item, "email", item.member_email || "-")}</p>
                      </div>
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Alamat Rumah</p>
                        <p className="mt-1 break-words leading-5">{getApplicantText(item, "home_address")}</p>
                      </div>
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Alamat Toko</p>
                        <p className="mt-1 break-words leading-5">{getApplicantText(item, "store_address")}</p>
                      </div>
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Tanda Tangan</p>
                        <div className="mt-2 grid h-20 place-items-center rounded-xl bg-slate-50 bg-contain bg-center bg-no-repeat" style={signatureSrc ? { backgroundImage: `url(${signatureSrc})` } : undefined}>
                          {!signatureSrc ? <span className="text-[10px] font-black text-slate-400">Belum ada tanda tangan</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <MasterAgentCreditDocumentButton agentName={agentName} documents={docs} />
                      <div className="flex flex-wrap gap-2">
                        {docs.map((doc) => (
                          <span
                            key={doc.label}
                            className={hasStoredImage(item, doc.label === "Foto KTP" ? "ktp" : doc.label === "Foto Toko" ? "store" : "selfie") ? "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-400"}
                          >
                            {doc.label} {doc.src ? "ada" : "kosong"}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-[26px] border border-dashed border-emerald-200 bg-[linear-gradient(135deg,#f8fffb_0%,#eefbf4_100%)] px-5 py-10 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white text-emerald-700 shadow-[0_14px_32px_rgba(5,122,69,0.10)] ring-1 ring-emerald-100">
                <FileSignature className="h-8 w-8" strokeWidth={2.3} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-950">
                {applications.length ? "Agent tidak ditemukan" : "Belum ada pengajuan"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                {applications.length
                  ? "Coba cari dengan nama agent, toko, email, WA, NIK, status, atau nominal lain."
                  : "Pengajuan kredit saldo dari agent akan tampil otomatis setelah dikirim."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
