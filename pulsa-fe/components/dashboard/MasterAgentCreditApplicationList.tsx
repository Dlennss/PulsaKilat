"use client";

import { ChevronDown, Download, Eye, FileDown, FileSignature, Printer, ReceiptText, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentCreditApplication } from "@/lib/api.auth";
import { MasterAgentCreditDecisionControls } from "@/components/dashboard/MasterAgentCreditDecisionControls";
import { MasterAgentCreditDocumentButton } from "@/components/dashboard/MasterAgentCreditDocumentButton";
import { downloadXlsx } from "@/components/dashboard/auditorHelpers";

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
      return "Dicek marketing";
    case "analysis_review":
      return "Menunggu analis";
    case "master_review":
      return "Menunggu marketing";
    case "ready_to_disburse":
      return "Menunggu aktivasi";
    case "approved":
      return "Disetujui";
    case "analysis_rejected":
      return "Ditolak";
    case "master_rejected":
      return "Ditolak marketing";
    case "rejected":
      return "Ditolak";
    default:
      return status || "-";
  }
}

function getReportFileStamp() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}-${map.hour}${map.minute}`;
}

function reportGeneratedAt() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

function escapeHTML(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDisplayStatus(item: AgentCreditApplication) {
  if (item.status !== "approved") return getStatusLabel(item.status);
  const loanStatus = String(item.loan_status || "").toLowerCase();
  if (loanStatus === "paid" || Number(item.outstanding_amount || 0) <= 0) return "Lunas";
  if (loanStatus === "overdue") return "Telat bayar";
  if (loanStatus === "active") return "Pinjaman aktif";
  return "Disetujui";
}

function getStatusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "ready_to_disburse":
      return "bg-sky-100 text-sky-700";
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

function getDisplayStatusClass(item: AgentCreditApplication) {
  const loanStatus = String(item.loan_status || "").toLowerCase();
  if (item.status === "approved" && (loanStatus === "paid" || Number(item.outstanding_amount || 0) <= 0)) {
    return "bg-sky-100 text-sky-700";
  }
  if (item.status === "approved" && loanStatus === "overdue") {
    return "bg-rose-100 text-rose-600";
  }
  return getStatusClass(item.status);
}

function getStoredImageSrc(item: AgentCreditApplication, key: string) {
  const value = item.document_data?.[key];
  if (!value && key === "selfie_marketing") {
    const legacyValue = item.document_data?.selfie;
    if (legacyValue && typeof legacyValue === "object") {
      const image = legacyValue as { data_url?: unknown };
      return typeof image.data_url === "string" && image.data_url.startsWith("data:image/") ? image.data_url : "";
    }
  }
  if (!value || typeof value !== "object") return "";
  const image = value as { data_url?: unknown };
  return typeof image.data_url === "string" && image.data_url.startsWith("data:image/") ? image.data_url : "";
}

function getSignatureSrc(item: AgentCreditApplication) {
  return typeof item.agent_signature_data === "string" && item.agent_signature_data.startsWith("data:image/")
    ? item.agent_signature_data
    : "";
}

function getPaymentProofSrc(payment: NonNullable<AgentCreditApplication["payments"]>[number]) {
  const src = payment.payment_proof?.data_url;
  return typeof src === "string" && src.startsWith("data:image/") ? src : "";
}

function getPaymentStatusLabel(status: string, daysLate?: number) {
  if (Number(daysLate || 0) > 0) return `Telat ${daysLate} hari`;
  if (status === "partial") return "Sebagian";
  if (status === "late") return "Telat";
  return "Tepat waktu";
}

function buildReportRows(items: AgentCreditApplication[]) {
  return items.map((item) => {
    const agentName = getApplicantText(item, "agent_name", item.member_name || "Agent");
    const storeName = getApplicantText(item, "store_name", "Toko belum diisi");
    const whatsapp = getApplicantText(item, "whatsapp", item.member_phone || "-");
    const nik = getApplicantText(item, "nik");
    const approved = Number(item.approved_amount || 0);
    const requested = Number(item.requested_amount || 0);
    const outstanding = Number(item.outstanding_amount || 0);
    const available = Number(item.credit_available_amount || 0);
    const paid = Number(item.paid_amount || 0);
    return {
      "ID Pengajuan": `KSA-${String(item.id).padStart(8, "0")}`,
      "Tanggal Keputusan": formatDateTime(item.updated_at),
      "Nama Agent": agentName,
      "Nama Toko": storeName,
      "Nomor WA": whatsapp,
      NIK: nik,
      Email: getApplicantText(item, "email", item.member_email || "-"),
      Status: getDisplayStatus(item),
      "Status Sistem": item.status || "-",
      "Status Loan": item.loan_status || "-",
      "Nominal Diajukan": requested,
      "Limit Disetujui": approved,
      "Tagihan Terpakai": outstanding,
      "Kredit Tersedia": available,
      "Sudah Dibayar": paid,
      "Jatuh Tempo": formatDate(item.loan_due_date),
      "Rekomendasi Analis": item.analyst_recommendation || "-",
      "Nominal Rekomendasi": Number(item.analyst_recommended_amount || 0),
      "Catatan Analis": item.analyst_note || "-",
      "Catatan Marketing": item.marketing_note || "-",
    };
  });
}

function summarizeReport(items: AgentCreditApplication[]) {
  const approvedItems = items.filter((item) => item.status === "approved");
  const rejectedItems = items.filter((item) => String(item.status || "").toLowerCase().includes("rejected") || item.status === "rejected");
  const paidItems = approvedItems.filter((item) => getDisplayStatus(item) === "Lunas");
  return {
    total: items.length,
    approved: approvedItems.length,
    rejected: rejectedItems.length,
    paid: paidItems.length,
    outstanding: approvedItems.reduce((total, item) => total + Number(item.outstanding_amount || 0), 0),
    limit: approvedItems.reduce((total, item) => total + Number(item.approved_amount || 0), 0),
    available: approvedItems.reduce((total, item) => total + Number(item.credit_available_amount || 0), 0),
  };
}

function isTruthy(value: unknown) {
  return value === true || String(value).trim().toLowerCase() === "true";
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

type ApplicationFilter = "all" | "review" | "analysis" | "approved" | "rejected" | "paid";

const applicationFilters: { key: ApplicationFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "review", label: "Review" },
  { key: "analysis", label: "Dikirim Analis" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "paid", label: "Lunas" },
];

function matchesFilter(item: AgentCreditApplication, filter: ApplicationFilter) {
  const status = String(item.status || "").toLowerCase();
  const loanStatus = String(item.loan_status || "").toLowerCase();
  if (filter === "all") return true;
  if (filter === "review") return status === "submitted" || status === "marketing_review" || status === "master_review";
  if (filter === "analysis") return status === "analysis_review";
  if (filter === "approved") return status === "approved" && loanStatus !== "paid";
  if (filter === "rejected") return status.includes("rejected") || status === "rejected";
  if (filter === "paid") return loanStatus === "paid" || (status === "approved" && Number(item.outstanding_amount || 0) <= 0);
  return true;
}

export function MasterAgentCreditApplicationList({
  applications,
  mode = "master",
  showActions = true,
  enableReportActions = false,
  eyebrow,
  title,
  emptyTitle,
  emptyDescription,
}: {
  applications: AgentCreditApplication[];
  mode?: "marketing" | "master" | "analyst";
  showActions?: boolean;
  enableReportActions?: boolean;
  eyebrow?: string;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [previewProof, setPreviewProof] = useState<{ agentName: string; src: string; title: string } | null>(null);
  const trimmedQuery = query.trim().toLowerCase();
  const filteredApplications = useMemo(() => {
    const byFilter = applications.filter((item) => matchesFilter(item, filter));
    if (!trimmedQuery) return byFilter;
    return byFilter.filter((item) => searchableText(item).includes(trimmedQuery));
  }, [applications, filter, trimmedQuery]);
  const reportRows = useMemo(() => buildReportRows(filteredApplications), [filteredApplications]);
  const reportSummary = useMemo(() => summarizeReport(filteredApplications), [filteredApplications]);
  const reportTitle = "Laporan Keputusan Kredit Agent";
  const reportSubtitle = `${filter === "all" ? "Semua status" : applicationFilters.find((item) => item.key === filter)?.label || filter}${trimmedQuery ? ` - pencarian "${query.trim()}"` : ""}`;
  const canExportReport = enableReportActions && filteredApplications.length > 0;

  async function exportXlsxReport() {
    if (!canExportReport) return;
    const summaryRows = [
      { Metrik: "Total Data", Nilai: reportSummary.total },
      { Metrik: "Disetujui", Nilai: reportSummary.approved },
      { Metrik: "Ditolak", Nilai: reportSummary.rejected },
      { Metrik: "Lunas", Nilai: reportSummary.paid },
      { Metrik: "Total Limit Disetujui", Nilai: reportSummary.limit },
      { Metrik: "Total Tagihan Terpakai", Nilai: reportSummary.outstanding },
      { Metrik: "Total Kredit Tersedia", Nilai: reportSummary.available },
      { Metrik: "Dicetak Pada", Nilai: reportGeneratedAt() },
      { Metrik: "Filter", Nilai: reportSubtitle },
      {},
    ];
    await downloadXlsx(`arsip-keputusan-analis-${getReportFileStamp()}.xlsx`, [...summaryRows, ...reportRows], "ArsipKeputusan");
  }

  async function exportPdfReport() {
    if (!canExportReport) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(4, 120, 87);
    doc.rect(0, 0, pageWidth, 82, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(reportTitle, 40, 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`PulsaKilat - ${reportSubtitle}`, 40, 54);
    doc.text(`Dicetak: ${reportGeneratedAt()}`, 40, 69);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const summaryText = [
      `Total ${reportSummary.total}`,
      `Disetujui ${reportSummary.approved}`,
      `Ditolak ${reportSummary.rejected}`,
      `Lunas ${reportSummary.paid}`,
      `Limit ${formatIDR(reportSummary.limit)}`,
      `Tagihan ${formatIDR(reportSummary.outstanding)}`,
    ].join("   |   ");
    doc.text(summaryText, 40, 110);

    autoTable(doc, {
      startY: 128,
      head: [[
        "ID",
        "Tanggal",
        "Agent",
        "Toko",
        "WA",
        "Status",
        "Diajukan",
        "Limit",
        "Tagihan",
        "Tersedia",
        "Jatuh Tempo",
        "Catatan",
      ]],
      body: reportRows.map((row) => [
        row["ID Pengajuan"],
        row["Tanggal Keputusan"],
        row["Nama Agent"],
        row["Nama Toko"],
        row["Nomor WA"],
        row.Status,
        formatIDR(Number(row["Nominal Diajukan"] || 0)),
        formatIDR(Number(row["Limit Disetujui"] || 0)),
        formatIDR(Number(row["Tagihan Terpakai"] || 0)),
        formatIDR(Number(row["Kredit Tersedia"] || 0)),
        row["Jatuh Tempo"],
        row["Catatan Analis"],
      ]),
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 28, right: 28 },
    });
    doc.save(`arsip-keputusan-analis-${getReportFileStamp()}.pdf`);
  }

  function printReport() {
    if (!canExportReport) return;
    const summaryCards = [
      ["Total Data", reportSummary.total],
      ["Disetujui", reportSummary.approved],
      ["Ditolak", reportSummary.rejected],
      ["Lunas", reportSummary.paid],
      ["Total Limit", formatIDR(reportSummary.limit)],
      ["Tagihan Terpakai", formatIDR(reportSummary.outstanding)],
      ["Kredit Tersedia", formatIDR(reportSummary.available)],
    ];
    const tableRows = reportRows.map((row) => `
      <tr>
        <td>${escapeHTML(row["ID Pengajuan"])}</td>
        <td>${escapeHTML(row["Tanggal Keputusan"])}</td>
        <td>${escapeHTML(row["Nama Agent"])}</td>
        <td>${escapeHTML(row["Nama Toko"])}</td>
        <td>${escapeHTML(row["Nomor WA"])}</td>
        <td>${escapeHTML(row.Status)}</td>
        <td>${escapeHTML(formatIDR(Number(row["Limit Disetujui"] || 0)))}</td>
        <td>${escapeHTML(formatIDR(Number(row["Tagihan Terpakai"] || 0)))}</td>
        <td>${escapeHTML(formatIDR(Number(row["Kredit Tersedia"] || 0)))}</td>
        <td>${escapeHTML(row["Jatuh Tempo"])}</td>
        <td>${escapeHTML(row["Catatan Analis"])}</td>
      </tr>
    `).join("");
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) return;
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHTML(reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
            header { border-bottom: 4px solid #047857; padding-bottom: 16px; margin-bottom: 18px; }
            h1 { margin: 0; font-size: 24px; }
            p { margin: 6px 0 0; color: #475569; font-size: 12px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .card { border: 1px solid #dbeafe; border-radius: 12px; padding: 10px; }
            .label { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .value { margin-top: 4px; font-size: 16px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #047857; color: white; text-align: left; padding: 8px; }
            td { border: 1px solid #e2e8f0; padding: 7px; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            @media print { body { margin: 14px; } .summary { grid-template-columns: repeat(4, 1fr); } }
          </style>
        </head>
        <body>
          <header>
            <h1>${escapeHTML(reportTitle)}</h1>
            <p>PulsaKilat - ${escapeHTML(reportSubtitle)}</p>
            <p>Dicetak: ${escapeHTML(reportGeneratedAt())}</p>
          </header>
          <section class="summary">
            ${summaryCards.map(([label, value]) => `
              <div class="card">
                <div class="label">${escapeHTML(label)}</div>
                <div class="value">${escapeHTML(value)}</div>
              </div>
            `).join("")}
          </section>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Tanggal</th><th>Agent</th><th>Toko</th><th>WA</th><th>Status</th><th>Limit</th><th>Tagihan</th><th>Tersedia</th><th>Jatuh Tempo</th><th>Catatan</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  }

  return (
    <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600">{eyebrow || (showActions ? "Meja Review" : "Arsip Kredit")}</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title || (showActions ? "Pengajuan Kredit Terbaru" : "Riwayat Pinjaman Agent")}</h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
            {mode === "analyst"
              ? "Tugas analis: cek dokumen, catatan marketing, risiko pembayaran, lalu beri keputusan final."
              : "Tugas marketing: dampingi agent, lengkapi selfie pertemuan, tanda tangan verifikasi, lalu kirim data ke analis."}
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-[linear-gradient(135deg,#047857,#8bdc24)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(5,122,69,0.18)]">
          {mode === "analyst" ? "Analis" : "Marketing"}
        </span>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:mt-5 xl:flex-row xl:items-center">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-500 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Cari nama agent, toko, WA, NIK, atau ID pengajuan"
          />
        </label>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-emerald-700">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
          </span>
          {applicationFilters.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={
                  active
                    ? "h-10 shrink-0 rounded-2xl bg-emerald-800 px-4 text-xs font-black text-white shadow-[0_10px_22px_rgba(5,122,69,0.18)]"
                    : "h-10 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                }
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {enableReportActions ? (
        <div className="mt-4 rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#f8fffb,#ffffff)] p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Rekap Audit</p>
              <p className="mt-1 text-sm font-black text-slate-950">Laporan mengikuti pencarian dan filter aktif</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                {filteredApplications.length} data tampil • Tagihan {formatIDR(reportSummary.outstanding)} • Limit {formatIDR(reportSummary.limit)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                disabled={!canExportReport}
                onClick={printReport}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 text-[11px] font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" strokeWidth={2.4} />
                Cetak
              </button>
              <button
                type="button"
                disabled={!canExportReport}
                onClick={() => void exportPdfReport()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" strokeWidth={2.4} />
                PDF
              </button>
              <button
                type="button"
                disabled={!canExportReport}
                onClick={() => void exportXlsxReport()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#047857,#84cc16)] px-3 text-[11px] font-black text-white shadow-[0_12px_24px_rgba(4,120,87,0.18)] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" strokeWidth={2.4} />
                XLSX
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 min-w-0 space-y-3 sm:mt-5">
        {filteredApplications.length ? (
          filteredApplications.map((item) => {
            const agentName = getApplicantText(item, "agent_name", item.member_name || "Agent");
            const storeName = getApplicantText(item, "store_name", "Toko belum diisi");
            const wa = getApplicantText(item, "whatsapp", item.member_phone || "-");
            const nik = getApplicantText(item, "nik");
            const docs = [
              { label: "Foto KTP", src: getStoredImageSrc(item, "ktp") },
              { label: "Foto Toko", src: getStoredImageSrc(item, "store") },
              { label: "Selfie Pegang KTP", src: getStoredImageSrc(item, "selfie_ktp") },
              { label: "Foto Bersama Marketing", src: getStoredImageSrc(item, "selfie_marketing") },
            ];
            const signatureSrc = getSignatureSrc(item);
            const payments = item.payments || [];
            const paymentTotal = payments.length || Number(item.payment_count || 0);
            const outstanding = Number(item.outstanding_amount || 0);
            const approvedAmount = Number(item.approved_amount || 0);
            const isPending = item.status === "submitted" || item.status === "marketing_review" || item.status === "analysis_review" || item.status === "master_review" || item.status === "ready_to_disburse";
            const termsAccepted = isTruthy(item.applicant_data?.terms_accepted);
            const docsComplete = docs.every((doc) => Boolean(doc.src));
            const masterSignature =
              typeof item.applicant_data?.master_signature_data === "string" && item.applicant_data.master_signature_data.startsWith("data:image/")
                ? item.applicant_data.master_signature_data
                : typeof item.applicant_data?.marketing_signature_data === "string"
                  ? item.applicant_data.marketing_signature_data
                  : "";
            const canApprove =
              mode === "analyst"
                ? Boolean(masterSignature && item.status === "analysis_review")
                : mode === "master"
                    ? Boolean(docsComplete && (item.has_agent_signature || signatureSrc) && termsAccepted)
                  : mode === "marketing"
                    ? Boolean(docsComplete && (item.has_agent_signature || signatureSrc) && termsAccepted)
                    : Boolean(item.has_agent_signature || signatureSrc) && termsAccepted;
            const approveBlockReason =
              mode === "analyst"
                ? "Marketing belum verifikasi dan tanda tangan."
                : (mode === "marketing" || mode === "master") && !docsComplete
                    ? "Empat dokumen wajib harus lengkap sebelum dikirim ke analis."
                  : !termsAccepted
                  ? "Agent belum mencentang persetujuan syarat & ketentuan."
                  : "Agent belum tanda tangan persetujuan.";
            return (
              <article key={item.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-emerald-300 hover:shadow-[0_14px_28px_rgba(5,122,69,0.08)] sm:p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_130px_120px] lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-950 text-xs font-black text-lime-300">
                      {agentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="max-w-full truncate text-sm font-black text-slate-950">{agentName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${getDisplayStatusClass(item)}`}>{getDisplayStatus(item)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{storeName}</p>
                      <p className="mt-1 truncate text-[11px] font-bold text-slate-400">WA {wa} · NIK {nik}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-left lg:text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">{isPending ? "Diajukan" : "Sisa"}</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">{formatIDR(isPending ? item.requested_amount : outstanding)}</p>
                    {!isPending && approvedAmount ? <p className="mt-0.5 text-[9px] font-bold text-slate-400">Limit {formatIDR(approvedAmount)}</p> : null}
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
                      canApprove={canApprove}
                      approveBlockReason={approveBlockReason}
                    />
                  </div>
                ) : null}

                {openId === item.id ? (
                  <div className="mt-3 min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-2 sm:p-3">
                    <div className="grid min-w-0 gap-2 text-[11px] font-semibold text-slate-500 sm:gap-3 lg:grid-cols-2">
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Status Pinjaman</p>
                        <p className="mt-1 break-words leading-5">{getDisplayStatus(item)}</p>
                      </div>
                      <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                        <p className="font-black text-slate-950">Jatuh Tempo</p>
                        <p className="mt-1 break-words leading-5">{formatDate(item.loan_due_date)}</p>
                      </div>
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
                      {masterSignature ? (
                        <div className="min-w-0 rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                          <p className="font-black text-slate-950">Tanda Tangan Marketing</p>
                          <div className="mt-2 grid h-20 place-items-center rounded-xl bg-slate-50 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${masterSignature})` }} />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 grid min-w-0 gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <MasterAgentCreditDocumentButton agentName={agentName} documents={docs} />
                      <div className="flex min-w-0 flex-wrap gap-2">
                        {docs.map((doc) => (
                          <span
                            key={doc.label}
                            className={doc.src ? "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-400"}
                          >
                            {doc.label} {doc.src ? "ada" : "kosong"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 min-w-0 rounded-2xl border border-emerald-100 bg-white p-2 sm:p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-950">Riwayat Pembayaran</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            Nominal, tanggal, status, dan bukti transfer agent.
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">
                          {paymentTotal} pembayaran
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {payments.length ? (
                          payments.map((payment) => {
                            const proofSrc = getPaymentProofSrc(payment);
                            return (
                              <div key={payment.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                                <div className="flex min-w-0 items-start gap-3">
                                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <ReceiptText className="h-5 w-5" strokeWidth={2.4} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-950">{formatIDR(payment.amount)}</p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                      {formatDateTime(payment.paid_at)} - {getPaymentStatusLabel(payment.status, payment.days_late)}
                                    </p>
                                    {payment.note ? <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-slate-400">{payment.note}</p> : null}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  {proofSrc ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewProof({ agentName, src: proofSrc, title: payment.payment_proof?.name || `Bukti pembayaran #${payment.id}` })}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
                                      >
                                        <Eye className="h-4 w-4" strokeWidth={2.4} />
                                        Lihat Bukti
                                      </button>
                                      <a
                                        href={proofSrc}
                                        download={payment.payment_proof?.name || `bukti-pembayaran-${payment.id}.png`}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-50"
                                      >
                                        <Download className="h-4 w-4" strokeWidth={2.4} />
                                        Download
                                      </a>
                                    </>
                                  ) : (
                                    <span className="inline-flex h-10 items-center rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-400">
                                      Bukti belum ada
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-400">
                            {paymentTotal > 0
                              ? "Pembayaran sudah tercatat, tetapi detail bukti belum terkirim dari backend. Restart backend agar daftar pembayaran dan bukti transfer tampil."
                              : "Belum ada pembayaran untuk pinjaman ini."}
                          </div>
                        )}
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
              <h3 className="mt-4 text-base font-black text-slate-950">{applications.length ? "Agent tidak ditemukan" : emptyTitle || "Belum ada pengajuan"}</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                {applications.length
                  ? "Coba cari dengan nama agent, toko, email, WA, NIK, status, atau nominal lain."
                  : emptyDescription || "Pengajuan kredit saldo dari agent akan tampil otomatis setelah dikirim."}
              </p>
            </div>
          </div>
        )}
      </div>
      {previewProof ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-slate-950">Bukti Transfer</h3>
                <p className="truncate text-[11px] font-bold text-slate-500">{previewProof.agentName} - {previewProof.title}</p>
              </div>
              <a
                href={previewProof.src}
                download={previewProof.title}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
                Download
              </a>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Tutup bukti transfer"
              >
                <X className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto bg-slate-100 p-3 sm:p-5">
              <img src={previewProof.src} alt={previewProof.title} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-[0_16px_36px_rgba(15,23,42,0.12)]" />
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
